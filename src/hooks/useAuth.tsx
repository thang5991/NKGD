import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, LockKeyhole, Moon, Sun } from 'lucide-react';
import { useTheme } from './useTheme';

interface AuthContextValue {
  authenticated: boolean;
  logout: () => Promise<void>;
}

interface AuthPayload {
  error?: string;
  configured?: boolean;
  authenticated?: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function authRequest(path: string, body?: Record<string, string>): Promise<AuthPayload> {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({})) as AuthPayload;
  if (!response.ok) throw new Error(payload.error || 'Không thể xác thực');
  return payload;
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [startupError, setStartupError] = useState('');

  useEffect(() => {
    let active = true;
    const requireFreshLogin = async () => {
      try {
        // A page load is a new app access: invalidate the previous cookie first.
        await authRequest('/api/auth/logout', {});
        const status = await authRequest('/api/auth/status');
        if (active) {
          setConfigured(!!status.configured);
          setAuthenticated(false);
        }
      } catch (error) {
        if (active) setStartupError(error instanceof Error ? error.message : 'Không thể kết nối máy chủ');
      } finally {
        if (active) setLoading(false);
      }
    };
    void requireFreshLogin();
    return () => { active = false; };
  }, []);

  const unlock = async (password: string) => {
    await authRequest('/api/auth/login', { password });
    setAuthenticated(true);
  };

  const logout = useCallback(async () => {
    await authRequest('/api/auth/logout', {});
    setAuthenticated(false);
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-bg text-xs text-muted">Đang kiểm tra bảo mật...</div>;
  }

  return (
    <AuthContext.Provider value={{ authenticated, logout }}>
      {authenticated ? children : <LoginScreen configured={configured} startupError={startupError} onUnlock={unlock} />}
    </AuthContext.Provider>
  );
};

function LoginScreen({ configured, startupError, onUnlock }: {
  configured: boolean;
  startupError: string;
  onUnlock: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!configured) return;
    if (!password) return setError('Vui lòng nhập mật khẩu');
    try {
      setBusy(true);
      await onUnlock(password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-10 text-text">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(184,243,90,0.12),transparent_38%)]" />
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-4 top-4 z-10 rounded-lg border border-line bg-surface p-2.5 text-muted shadow-sm transition-colors hover:text-text"
        title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
        aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-2xl border border-line-strong bg-surface p-6 shadow-2xl sm:p-7">
        <div className="mb-6 text-center">
          <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border ${configured ? 'border-accent-border bg-accent-soft text-accent' : 'border-amber/30 bg-amber/10 text-amber'}`}>
            {configured ? <LockKeyhole className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </span>
          <h1 className="mt-4 text-xl font-black tracking-tight">{configured ? 'Đăng nhập Trading Journal' : 'Chưa cấu hình mật khẩu'}</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {configured ? 'Nhập mật khẩu được cấu hình trong file .env để truy cập ứng dụng.' : <>Thêm <code className="text-accent">NKGD_APP_PASSWORD</code> vào file <code className="text-accent">.env</code>, sau đó khởi động lại server.</>}
          </p>
        </div>

        {configured && (
          <>
            <label className="block text-[11px] font-semibold text-muted">Mật khẩu</label>
            <div className="relative mt-1.5">
              <input autoFocus autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-line bg-bg py-2.5 pl-3 pr-10 text-sm outline-none focus:border-accent" placeholder="Nhập mật khẩu trong .env" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}

        {(startupError || error) && <p className="mt-3 rounded-lg border border-loss/30 bg-loss-soft px-3 py-2 text-[11px] text-loss">{startupError || error}</p>}
        {configured && <button disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-black text-bg transition-colors hover:bg-accent-hover disabled:opacity-50"><LockKeyhole className="h-4 w-4" />{busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>}
        <p className="mt-4 text-center text-[10px] text-muted-2">Ứng dụng yêu cầu nhập lại mật khẩu sau mỗi lần tải trang.</p>
      </form>
    </main>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
