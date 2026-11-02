import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Repeat, 
  Sparkles, 
  Gauge,
  Keyboard
} from 'lucide-react';

interface VideoControlsBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  onReplayCurrentSub: () => void;
}

export const VideoControlsBar: React.FC<VideoControlsBarProps> = ({
  isPlaying,
  onTogglePlay,
  playbackRate,
  onChangePlaybackRate,
  isLooping,
  onToggleLoop,
  onReplayCurrentSub
}) => {
  const speeds = [0.5, 0.75, 1.0, 1.25];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 text-white shadow-md">
      {/* Play / Pause & Quick Replay */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          className="size-9 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-md transition-all active:scale-95"
          title={isPlaying ? 'Tạm dừng (Space)' : 'Tiếp tục phát (Space)'}
          aria-label={isPlaying ? 'Tạm dừng video' : 'Phát video'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={onReplayCurrentSub}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
          title="Phát lại câu hiện tại (Phím R)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Phát lại câu</span>
        </button>

        {/* Loop Subtitle Button */}
        <button
          type="button"
          onClick={onToggleLoop}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            isLooping
              ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-300'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          title="Tự động lặp lại câu này cho đến khi bấm dừng"
        >
          <Repeat className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Lặp câu: {isLooping ? 'BẬT' : 'TẮT'}</span>
        </button>
      </div>

      {/* Speed Selector & Keyboard shortcuts hint */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl text-xs">
          <Gauge className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5 hidden sm:inline" />
          {speeds.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => onChangePlaybackRate(rate)}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                playbackRate === rate
                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        <div 
          className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 font-semibold px-2 py-1 rounded-lg bg-slate-800/80"
          title="Phím tắt: Space (Phát/Dừng), A (Câu trước), D (Câu sau), R (Phát lại)"
        >
          <Keyboard className="w-3.5 h-3.5 text-teal-400" />
          <span>Space / A / D / R</span>
        </div>
      </div>
    </div>
  );
};
