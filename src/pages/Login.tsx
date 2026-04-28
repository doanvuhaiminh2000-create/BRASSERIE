import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export function Login() {
  const { signInWithGoogle, profile, loading } = useAuth();
  const [error, setError] = React.useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-main)]">
        <div className="text-[var(--color-accent-gold)] uppercase tracking-widest animate-pulse">Đang tải...</div>
      </div>
    );
  }

  // Already logged in
  if (profile && profile.role !== 'pending') {
    return <Navigate to={profile.role === 'staff' ? '/live-entry' : '/dashboard'} replace />;
  }

  // Pending approval
  if (profile && profile.role === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-main)] p-6">
        <div className="bg-[var(--color-bg-surface)] p-8 rounded-2xl border border-[var(--color-border-main)] max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[var(--color-accent-orange)]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            ⏳
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Tài khoản đang chờ phê duyệt</h1>
          <p className="text-[var(--color-text-muted)] mb-6">
            Email <strong className="text-white">{profile.email}</strong> đã được đăng ký. 
            Vui lòng liên hệ quản lý để được cấp quyền truy cập.
          </p>
          <button 
            onClick={() => useAuth().signOut()}
            className="px-6 py-3 bg-[var(--color-bg-main)] border border-[var(--color-border-main)] text-white rounded-xl"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-main)] p-6">
      <div className="bg-[var(--color-bg-surface)] p-8 rounded-2xl border border-[var(--color-border-main)] max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--color-accent-gold)] rounded-2xl flex items-center justify-center font-bold text-3xl text-black mx-auto mb-4">
            B
          </div>
          <h1 className="text-2xl font-bold text-white">BRASSERIE Ops</h1>
          <p className="text-[var(--color-text-muted)] mt-2">Hệ thống quản lý vận hành</p>
        </div>

        <button 
          onClick={async () => {
            try {
              await signInWithGoogle();
            } catch (err: any) {
              setError(err.message || 'Đăng nhập thất bại');
            }
          }}
          className="w-full bg-white text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Đăng nhập với Google
        </button>

        {error && (
          <p className="text-[var(--color-accent-red)] text-sm text-center mt-4">{error}</p>
        )}

        <p className="text-[10px] text-[var(--color-text-muted)] text-center mt-6 leading-relaxed">
          Lần đầu đăng nhập sẽ tạo tài khoản chờ phê duyệt.<br/>
          Liên hệ quản lý để được cấp quyền truy cập.
        </p>
      </div>
    </div>
  );
}
