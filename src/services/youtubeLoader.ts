/**
 * YouTube IFrame API Resilient Loader Service
 * Compliant with AURA AI Principal Engineer Constitution (BR-13, BR-15)
 * 
 * Provides:
 * - Safe concurrent initialization (promise deduplication)
 * - Network timeout detection (5000ms default)
 * - Dead script cleanup & automatic retry mechanism
 * - Ad-blocker & ERR_CONNECTION_TIMED_OUT protection
 * - Safe multi-subscriber dispatch for onYouTubeIframeAPIReady
 */

export type YouTubePlayerStatus = 'idle' | 'loading' | 'buffering' | 'ready' | 'playing' | 'paused' | 'error';

export interface YouTubePlayerError {
  code: number | string;
  title: string;
  message: string;
  isEmbedRestricted: boolean;
  isNetworkIssue: boolean;
}

declare global {
  interface Window {
    YT?: {
      loading?: number;
      loaded?: number;
      Player: new (elementId: string | HTMLElement, config: any) => any;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
      get?: (id: string) => any;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let pendingLoadPromise: Promise<void> | null = null;
const readyListeners: Array<() => void> = [];

/**
 * Checks if window.YT and window.YT.Player are fully initialized and ready to use
 */
export function isYouTubeAPIAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window.YT && window.YT.Player);
}

/**
 * Maps YouTube Player error codes into user-friendly Vietnamese explanations
 */
export function parseYouTubePlayerError(errorCode: number | string): YouTubePlayerError {
  const codeNum = typeof errorCode === 'number' ? errorCode : parseInt(errorCode, 10);

  switch (codeNum) {
    case 2:
      return {
        code: codeNum,
        title: 'Tham số video không hợp lệ',
        message: 'Mã định danh YouTube (ID) chứa ký tự không hợp lệ hoặc sai định dạng.',
        isEmbedRestricted: false,
        isNetworkIssue: false
      };
    case 5:
      return {
        code: codeNum,
        title: 'Lỗi trình phát HTML5',
        message: 'Nội dung video không thể phát trong trình duyệt HTML5 hiện tại.',
        isEmbedRestricted: false,
        isNetworkIssue: false
      };
    case 100:
      return {
        code: codeNum,
        title: 'Video không tồn tại',
        message: 'Video này đã bị xóa hoặc chuyển sang chế độ riêng tư trên YouTube.',
        isEmbedRestricted: false,
        isNetworkIssue: false
      };
    case 101:
    case 150:
      return {
        code: codeNum,
        title: 'Video bị giới hạn nhúng',
        message: 'Chủ sở hữu video không cho phép phát ngoài YouTube. Bạn có thể mở trực tiếp bài học trên tab YouTube hoặc chuyển sang chế độ phụ đề song ngữ AI.',
        isEmbedRestricted: true,
        isNetworkIssue: false
      };
    default:
      return {
        code: errorCode,
        title: 'Không thể kết nối video YouTube',
        message: 'Mạng yếu, kết nối chập chờn hoặc YouTube API bị chặn bởi trình chặn quảng cáo (AdBlock) / tường lửa.',
        isEmbedRestricted: false,
        isNetworkIssue: true
      };
  }
}

/**
 * Loads the YouTube IFrame API script with timeout watchdog and multi-subscriber safety
 */
export function loadYouTubeIframeAPI(timeoutMs: number = 5000): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  // If already ready, resolve immediately
  if (isYouTubeAPIAvailable()) {
    return Promise.resolve();
  }

  // Deduplicate concurrent calls
  if (pendingLoadPromise) {
    return pendingLoadPromise;
  }

  pendingLoadPromise = new Promise<void>((resolve, reject) => {
    let timer: any = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
    };

    const handleSuccess = () => {
      cleanup();
      pendingLoadPromise = null;
      resolve();
    };

    const handleFailure = (reason: string) => {
      cleanup();
      pendingLoadPromise = null;
      console.warn(`[YouTubeLoader] API load failed (${reason}). Cleaning up dead script tag.`);
      const existingScript = document.getElementById('yt-iframe-script');
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
      reject(new Error(`YouTube IFrame API failed to load: ${reason}`));
    };

    // Set timeout watchdog for weak network connections
    timer = setTimeout(() => {
      handleFailure(`Timeout after ${timeoutMs}ms (Weak network or blocked)`);
    }, timeoutMs);

    // Register callback into multi-subscriber queue
    readyListeners.push(handleSuccess);

    // If global onYouTubeIframeAPIReady has not been hooked yet
    const existingHook = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (existingHook) {
        try {
          existingHook();
        } catch (e) {
          console.warn('[YouTubeLoader] Error in existing hook:', e);
        }
      }
      while (readyListeners.length > 0) {
        const listener = readyListeners.shift();
        if (listener) listener();
      }
    };

    // Inject or reuse script tag
    let scriptTag = document.getElementById('yt-iframe-script') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'yt-iframe-script';
      scriptTag.src = 'https://www.youtube.com/iframe_api';
      scriptTag.async = true;

      scriptTag.onerror = () => {
        handleFailure('Network connection timed out or blocked by client');
      };

      document.body.appendChild(scriptTag);
    } else {
      // Script tag exists but window.YT is not ready yet.
      // Re-attach error listener in case it fails in flight.
      scriptTag.onerror = () => {
        handleFailure('Existing script failed to load');
      };
    }
  });

  return pendingLoadPromise;
}

/**
 * Resets the loader state and attempts a forced reload of the YouTube API
 */
export function retryLoadYouTubeIframeAPI(timeoutMs: number = 6000): Promise<void> {
  pendingLoadPromise = null;
  const existingScript = document.getElementById('yt-iframe-script');
  if (existingScript && existingScript.parentNode) {
    existingScript.parentNode.removeChild(existingScript);
  }
  return loadYouTubeIframeAPI(timeoutMs);
}
