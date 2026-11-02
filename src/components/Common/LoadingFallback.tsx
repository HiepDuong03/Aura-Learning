import React from 'react';

interface LoadingFallbackProps {
  message?: string;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  message = 'Đang tải màn hình học tập...' 
}) => {
  return (
    <div className="min-h-[420px] flex flex-col items-center justify-center p-8 space-y-4 animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Brand animated pulsing ring */}
      <div className="relative flex items-center justify-center">
        <div className="size-16 rounded-full border-4 border-teal-100 animate-ping absolute" />
        <div className="size-16 rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-teal-500/25 animate-pulse">
          4U
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-black text-slate-800">
          {message}
        </p>
        <p className="text-xs text-slate-400 font-medium">
          Tối ưu tải trang tức thì với Code-Splitting
        </p>
      </div>

      {/* Modern skeleton bars */}
      <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-teal-500 rounded-full animate-indeterminate" />
      </div>
    </div>
  );
};
