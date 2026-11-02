/**
 * Voice Activity Detector (VAD) using Web Audio API
 * Reverse-engineered from SuperChinese (AudioRecord + RMS energy detection)
 * Zero external dependencies, runs 100% locally on the browser (0đ cost).
 * 
 * BR-15: Explicit error handling and clean resource teardown.
 */

export interface VADConfig {
  /** RMS volume threshold to declare speech has started. Default: 0.035 */
  speechStartThreshold?: number;
  /** Silence duration in milliseconds to automatically conclude speaking. Default: 850ms */
  silenceTimeoutMs?: number;
  /** Minimum speech duration in ms to ignore brief noise pops/coughs. Default: 350ms */
  minSpeechDurationMs?: number;
  /** Callback when speech starts */
  onSpeechStart?: () => void;
  /** Callback when silence is sustained and speech concludes */
  onSpeechEnd?: (durationMs: number) => void;
  /** Callback reporting continuous normalized volume (0.0 to 1.0) for visualizers */
  onVolumeChange?: (rms: number) => void;
  /** Callback when microphone access or Web Audio throws an error */
  onError?: (error: Error) => void;
}

export type VADStatus = 'idle' | 'listening' | 'speaking' | 'processing';

export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  private status: VADStatus = 'idle';
  private speechStartTime: number = 0;
  private isDestroyed: boolean = false;

  private readonly speechStartThreshold: number;
  private readonly silenceTimeoutMs: number;
  private readonly minSpeechDurationMs: number;
  private readonly onSpeechStart?: () => void;
  private readonly onSpeechEnd?: (durationMs: number) => void;
  private readonly onVolumeChange?: (rms: number) => void;
  private readonly onError?: (error: Error) => void;

  constructor(config: VADConfig = {}) {
    this.speechStartThreshold = config.speechStartThreshold ?? 0.035;
    this.silenceTimeoutMs = config.silenceTimeoutMs ?? 850;
    this.minSpeechDurationMs = config.minSpeechDurationMs ?? 350;
    this.onSpeechStart = config.onSpeechStart;
    this.onSpeechEnd = config.onSpeechEnd;
    this.onVolumeChange = config.onVolumeChange;
    this.onError = config.onError;
  }

  public getStatus(): VADStatus {
    return this.status;
  }

  /**
   * Initializes microphone access and starts monitoring audio energy
   */
  public async start(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('VAD instance has been destroyed.');
    }

    if (this.status !== 'idle') {
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ Web Audio API hoặc getUserMedia.');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        throw new Error('AudioContext không được hỗ trợ trên trình duyệt này.');
      }

      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.3;

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.analyser);

      this.status = 'listening';
      this.monitorAudio();
    } catch (err) {
      this.stop();
      const error = err instanceof Error ? err : new Error(String(err));
      this.onError?.(error);
      throw error;
    }
  }

  private monitorAudio(): void {
    if (!this.analyser || this.status === 'idle') return;

    const buffer = new Float32Array(this.analyser.fftSize);

    const checkVolume = () => {
      if (this.status === 'idle' || !this.analyser) return;

      this.analyser.getFloatTimeDomainData(buffer);

      // Compute Root Mean Square (RMS) energy
      let sumOfSquares = 0;
      for (let i = 0; i < buffer.length; i++) {
        const val = buffer[i] ?? 0;
        sumOfSquares += val * val;
      }
      const rms = Math.sqrt(sumOfSquares / buffer.length);

      this.onVolumeChange?.(rms);

      const isSpeakingNow = rms >= this.speechStartThreshold;

      if (isSpeakingNow) {
        // Clear pending silence timer if user resumes speaking
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }

        if (this.status === 'listening') {
          this.status = 'speaking';
          this.speechStartTime = Date.now();
          this.onSpeechStart?.();
        }
      } else if (this.status === 'speaking') {
        // Sustained silence detected while speaking
        if (!this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            const speechDuration = Date.now() - this.speechStartTime;
            if (speechDuration >= this.minSpeechDurationMs) {
              this.status = 'processing';
              this.onSpeechEnd?.(speechDuration);
            } else {
              // Noise spike was too brief; return to listening
              this.status = 'listening';
            }
            this.silenceTimer = null;
          }, this.silenceTimeoutMs);
        }
      }

      this.animationFrameId = requestAnimationFrame(checkVolume);
    };

    this.animationFrameId = requestAnimationFrame(checkVolume);
  }

  /**
   * Resets VAD back to 'listening' state after speech evaluation
   */
  public resumeListening(): void {
    if (this.status === 'processing' || this.status === 'speaking') {
      this.status = 'listening';
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    }
  }

  /**
   * Stops audio monitoring and releases microphone resources
   */
  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // Safe ignore
      }
      this.sourceNode = null;
    }

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        // Safe ignore
      }
      this.analyser = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // Safe ignore
        }
      });
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // Safe ignore
      }
      this.audioContext = null;
    }

    this.status = 'idle';
  }

  /**
   * Cleans up all resources permanently
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.stop();
  }
}
