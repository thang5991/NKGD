import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';

interface AuthContextValue {
  authenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function authRequest(path: string, body?: Record<string, string>) {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({})) as { error?: string; configured?: boolean; authenticated?: boolean };
  if (!response.ok) throw new Error(payload.error || 'Không thể xác thực');
  return payload;
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const status = await authRequest('/api/auth/status');
      setConfigured(!!status.configured);
      setAuthenticated(!!status.authenticated);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void checkStatus(); }, [checkStatus]);

  const unlock = async (password: string) => {
    await authRequest(configured ? '/api/auth/login' : '/api/auth/setup', { password });
    setConfigured(true);
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
      {authenticated ? children : <LoginScreen configured={configured} onUnlock={unlock} />}
    </AuthContext.Provider>
  );
};

function LoginScreen({ configured, onUnlock }: { configured: boolean; onUnlock: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) return setError('Mật khẩu phải có ít nhất 6 ký tự');
    if (!configured && password !== confirmPassword) return setError('Mật khẩu xác nhận chưa khớp');
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
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-2xl border border-line-strong bg-surface p-6 shadow-2xl sm:p-7">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-accent-border bg-accent-soft text-accent">
            {configured ? <LockKeyhole className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </span>
          <h1 className="mt-4 text-xl font-black tracking-tight">{configured ? 'Mở khóa Trading Journal' : 'Thiết lập mật khẩu'}</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {configured ? 'Nhập mật khẩu local để truy cập dữ liệu giao dịch.' : 'Tạo mật khẩu bảo vệ dữ liệu trên máy này. Mật khẩu không được lưu dưới dạng văn bản.'}
          </p>
        </div>

        <label className="block text-[11px] font-semibold text-muted">Mật khẩu</label>
        <div className="relative mt-1.5">
          <input autoFocus autoComplete={configured ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-line bg-bg py-2.5 pl-3 pr-10 text-sm outline-none focus:border-accent" placeholder="Tối thiểu 6 ký tự" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {!configured && <><label className="mt-3 block text-[11px] font-semibold text-muted">Xác nhận mật khẩu</label><input autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent" placeholder="Nhập lại mật khẩu" /></>}

        {error && <p className="mt-3 rounded-lg border border-loss/30 bg-loss-soft px-3 py-2 text-[11px] text-loss">{error}</p>}
        <button disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-black text-bg transition-colors hover:bg-[#c5ff68] disabled:opacity-50">
          <LockKeyhole className="h-4 w-4" /> {busy ? 'Đang xử lý...' : configured ? 'Đăng nhập' : 'Tạo mật khẩu & truy cập'}
        </button>
        <p className="mt-4 text-center text-[10px] text-muted-2">Dữ liệu và thông tin xác thực chỉ được lưu trên máy đang chạy NKGD.</p>
      </form>
    </main>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
