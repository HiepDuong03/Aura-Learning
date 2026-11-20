import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface NotifyContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
  confirmDialog: (options: ConfirmOptions | string) => Promise<boolean>;
}

const NotifyContext = createContext<NotifyContextValue | null>(null);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const pushToast = useCallback((variant: ToastVariant, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev.slice(-3), { id, variant, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const confirmDialog = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    const normalized: ConfirmOptions = typeof opts === 'string' ? { message: opts } : opts;
    return new Promise((resolve) => {
      setConfirmState({ options: normalized, resolve });
    });
  }, []);

  const handleConfirmClose = (accepted: boolean) => {
    if (confirmState) {
      confirmState.resolve(accepted);
      setConfirmState(null);
    }
  };

  const value: NotifyContextValue = {
    toast: {
      success: (msg) => pushToast('success', msg),
      error: (msg) => pushToast('error', msg),
      info: (msg) => pushToast('info', msg)
    },
    confirmDialog
  };

  return (
    <NotifyContext.Provider value={value}>
      {children}

      {/* Floating Toast Stack */}
      <div className="fixed top-4 right-4 z-[90] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-2xl shadow-lg border text-xs font-bold animate-fade-in backdrop-blur-md ${
              t.variant === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
                : t.variant === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-900'
                : 'bg-white/95 border-slate-200 text-slate-800'
            }`}
          >
            {t.variant === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
            {t.variant === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
            {t.variant === 'info' && <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />}
            <span className="flex-1 leading-relaxed">{t.message}</span>
            <button
              type="button"
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
              aria-label="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Global Accessible Confirm Dialog */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]"
          onClick={() => handleConfirmClose(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3">
              <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmState.options.destructive ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-700'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900">
                  {confirmState.options.title || 'Xác nhận thao tác'}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
              >
                {confirmState.options.cancelLabel || 'Hủy'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow-sm transition-all ${
                  confirmState.options.destructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                {confirmState.options.confirmLabel || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotifyContext.Provider>
  );
};

export function useNotify(): NotifyContextValue {
  const ctx = useContext(NotifyContext);
  if (!ctx) {
    throw new Error('useNotify must be used inside <ToastProvider>');
  }
  return ctx;
}
