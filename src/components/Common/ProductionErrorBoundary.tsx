import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, ChevronDown, ChevronUp, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onReset?: () => void;
  onGoHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

/**
 * Production-Grade Resilient Error Boundary (BR-15: No Silent Failures, BR-13: Audit Logging)
 * Compliant with AURA AI Principal Engineer Constitution.
 * 
 * Prevents White Screen of Death (WSOD), isolates failures per domain/tab,
 * and provides safe cache recovery if local storage or IndexedDB encounters corrupted state.
 */
export class ProductionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Production error audit logging (BR-13)
    console.error(`[Production Error Boundary Caught - ${this.props.componentName || 'Global'}]:`, {
      timestamp: new Date().toISOString(),
      component: this.props.componentName || 'Global',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = (): void => {
    const isDynamicImportFailure =
      this.state.error?.message?.includes('dynamically imported module') ||
      this.state.error?.message?.includes('Failed to fetch');

    if (isDynamicImportFailure) {
      this.handleReload();
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    this.props.onReset?.();
  };

  handleReload = async (): Promise<void> => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
    } catch (e) {
      console.warn('[CachePurge] Error during reload cache purge:', e);
    }
    // Hard reload with timestamp to bypass stale browser cache
    window.location.href = window.location.origin + window.location.pathname + '?reload=' + Date.now();
  };

  /**
   * Safe Cache Recovery: Clears potentially corrupted localStorage caches
   * and Service Worker caches without deleting user Anki progress in IndexedDB.
   */
  handleSafeCacheReset = async (): Promise<void> => {
    try {
      localStorage.removeItem('4you_lessons_v2');
      localStorage.removeItem('4you_custom_lessons_v1');
      localStorage.removeItem('4you_saved_words_v2');
      localStorage.removeItem('4you_scenarios_v2');
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      console.info('[Storage] Corrupted cache keys and SW caches cleared successfully.');
    } catch (e) {
      console.warn('[Storage] Error clearing caches:', e);
    }
    window.location.href = window.location.origin + window.location.pathname + '?clean=' + Date.now();
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const compName = this.props.componentName || 'phần hiển thị này';

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4 sm:p-6 my-6 animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-rose-100 shadow-xl text-center space-y-4">
            <div className="size-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto shadow-inner ring-8 ring-rose-50/50">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-slate-900">
                Đã xảy ra sự cố tại {compName}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hệ thống đã cách ly lỗi để bảo vệ ứng dụng. Dữ liệu từ vựng và tiến độ học Anki của bạn vẫn được lưu trữ an toàn trong IndexedDB.
              </p>
              {this.state.error?.message && (
                <div className="inline-block mt-2 px-3 py-1 bg-rose-50 text-rose-700 rounded-xl text-[11px] font-mono border border-rose-200/60 max-w-full truncate">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="py-3 px-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20 transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Thử tải lại
              </button>

              <button
                type="button"
                onClick={this.props.onGoHome || this.handleReload}
                className="py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" /> Về Trang chủ
              </button>
            </div>

            {/* Emergency Cache Flush */}
            <div className="pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={this.handleSafeCacheReset}
                className="w-full py-2 px-3 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="Bấm nếu màn hình bị kẹt lỗi liên tục do dữ liệu đệm cũ bị lỗi"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Khôi phục dữ liệu đệm gốc & Làm mới</span>
              </button>
            </div>

            {/* Error Stack Trace (Collapsible) */}
            <div className="pt-1 text-left">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto cursor-pointer"
              >
                <span>Chi tiết kỹ thuật</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-mono overflow-x-auto max-h-48 text-left space-y-1">
                  <p className="font-bold text-rose-600">{this.state.error?.toString()}</p>
                  <pre className="whitespace-pre-wrap text-[9px] text-slate-500">{this.state.errorInfo?.componentStack}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
