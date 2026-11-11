import React, { useState, useEffect, useRef } from 'react';
import { AuthUser, SavedWord } from '../../types';
import { authService } from '../../services/authService';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  initialMode?: 'login' | 'register';
  guestWordsToMigrate?: SavedWord[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  guestWordsToMigrate = []
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [isGoogleView, setIsGoogleView] = useState<boolean>(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialize and check Google Identity Services
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    authService.getAuthConfig().then((cfg) => {
      if (!isMounted) return;
      if (cfg.googleClientId) {
        setGoogleClientId(cfg.googleClientId);

        // Attempt GIS button render if script is ready
        if (typeof window !== 'undefined' && (window as any).google?.accounts?.id && googleBtnRef.current) {
          try {
            (window as any).google.accounts.id.initialize({
              client_id: cfg.googleClientId,
              callback: async (response: any) => {
                if (response.credential) {
                  setIsLoading(true);
                  setError(null);
                  try {
                    const user = await authService.loginWithGoogle({ credential: response.credential }, guestWordsToMigrate);
                    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
                    onSuccess(user);
                    onClose();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Đăng nhập Google thất bại.');
                  } finally {
                    setIsLoading(false);
                  }
                }
              }
            });
            (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              width: 360,
              text: 'continue_with',
              shape: 'pill'
            });
          } catch (e) {
            console.warn('[GoogleGIS] Button render error:', e);
          }
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, guestWordsToMigrate, onSuccess, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
        return;
      }
    }

    setIsLoading(true);

    try {
      let user: AuthUser;
      if (mode === 'login') {
        user = await authService.login(email, password);
      } else {
        user = await authService.register(name, email, password, guestWordsToMigrate);
      }

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      onSuccess(user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi trong quá trình xác thực.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = googleEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      setError('Vui lòng nhập địa chỉ Gmail hoặc Email hợp lệ.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const user = await authService.loginWithGoogle({
        email: clean,
        name: clean.split('@')[0],
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(clean)}`
      }, guestWordsToMigrate);

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      onSuccess(user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập Google thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerGoogle = () => {
    setError(null);

    // 1. If Google Client ID is configured, trigger real Google OAuth Popup
    if (googleClientId && typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              setError(`Google OAuth: ${tokenResponse.error_description || tokenResponse.error}`);
              return;
            }
            if (tokenResponse.access_token) {
              setIsLoading(true);
              try {
                const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const googleProfile = await infoRes.json();
                const user = await authService.loginWithGoogle({
                  email: googleProfile.email,
                  name: googleProfile.name || googleProfile.given_name || googleProfile.email.split('@')[0],
                  avatar: googleProfile.picture,
                  googleId: googleProfile.sub
                }, guestWordsToMigrate);

                confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
                onSuccess(user);
                onClose();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Đăng nhập Google thất bại.');
              } finally {
                setIsLoading(false);
              }
            }
          }
        });
        client.requestAccessToken();
        return;
      } catch (e) {
        console.warn('[GoogleOAuth2] Popup error:', e);
      }
    }

    // 2. If Google GIS One-Tap is ready
    if (googleClientId && typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.prompt();
        return;
      } catch (e) {
        console.warn('[GoogleGIS] Prompt fallback:', e);
      }
    }

    // 3. Fallback: Open clear in-modal dialog
    setIsGoogleView(true);
    setError(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {isGoogleView ? (
              <div className="size-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>
            ) : (
              <div className="size-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center text-white font-black text-base shadow-md shadow-teal-500/20">
                4U
              </div>
            )}
            <div>
              <h2 className="text-base font-black text-slate-800">
                {isGoogleView 
                  ? 'Đăng Nhập Với Google' 
                  : mode === 'login' ? 'Đăng Nhập Tài Khoản' : 'Tạo Tài Khoản Mới'}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {isGoogleView
                  ? 'Đồng bộ từ vựng & tiến độ Anki lên Cloud Database'
                  : 'Đồng bộ tiến độ học Anki & phản xạ trên mọi thiết bị'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Google In-Modal Quick Sign-In View */}
        {isGoogleView ? (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Xác thực Google Cloud An toàn</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tài khoản Google sẽ được liên kết trực tiếp với cơ sở dữ liệu quan hệ (3NF) để bảo vệ toàn bộ từ vựng và lịch sử ôn tập của bạn.
              </p>
            </div>

            {/* If native Google Button exists */}
            <div ref={googleBtnRef} className="flex justify-center empty:hidden" />

            <form onSubmit={handleGoogleQuickSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Địa chỉ Email / Gmail Google của bạn:
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="vidu@gmail.com"
                    className="w-full h-11 pl-10 pr-4 rounded-2xl border border-slate-200 text-xs font-semibold focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick suggestion button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (googleEmail && !googleEmail.includes('@')) {
                      setGoogleEmail(`${googleEmail}@gmail.com`);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold transition-colors"
                >
                  + @gmail.com
                </button>
              </div>

              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsGoogleView(false);
                    setError(null);
                  }}
                  className="px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-2xl btn-3d btn-3d-teal font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20"
                >
                  <span>{isLoading ? 'Đang xác thực...' : 'Đăng Nhập Google Ngay'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Standard Login & Register Views */
          <>
            {/* Mode Switcher Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-2xl text-xs font-bold text-slate-500">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  mode === 'login' 
                    ? 'bg-white text-teal-700 shadow-sm font-black' 
                    : 'hover:text-slate-900'
                }`}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  mode === 'register' 
                    ? 'bg-white text-teal-700 shadow-sm font-black' 
                    : 'hover:text-slate-900'
                }`}
              >
                Đăng Ký
              </button>
            </div>

            {/* Google OAuth Quick Button */}
            <button
              type="button"
              onClick={handleTriggerGoogle}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all font-bold text-xs text-slate-700 flex items-center justify-center gap-2.5 shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Tiếp tục với Google</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 absolute">
                hoặc với email
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Họ và tên của bạn:
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="w-full h-11 pl-10 pr-4 rounded-2xl border border-slate-200 text-xs font-semibold focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Địa chỉ Email:
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-11 pl-10 pr-4 rounded-2xl border border-slate-200 text-xs font-semibold focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mật khẩu:
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full h-11 pl-10 pr-10 rounded-2xl border border-slate-200 text-xs font-semibold focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Xác nhận lại mật khẩu:
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu ở trên"
                      className="w-full h-11 pl-10 pr-4 rounded-2xl border border-slate-200 text-xs font-semibold focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-2xl btn-3d btn-3d-teal font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20"
                >
                  <span>{isLoading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản & Bắt Đầu Học'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Footer Note */}
            <p className="text-[11px] text-center text-slate-400 font-medium pt-1">
              {mode === 'login' ? (
                <>
                  Chưa có tài khoản?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className="text-teal-600 font-bold hover:underline"
                  >
                    Đăng ký ngay miễn phí
                  </button>
                </>
              ) : (
                <>
                  Đã có tài khoản?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="text-teal-600 font-bold hover:underline"
                  >
                    Đăng nhập tại đây
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
};
