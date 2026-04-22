import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const { users, login } = useApp();
  const navigate = useNavigate();
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(selectedUserId, pin)) {
      const user = users.find(u => u.id === selectedUserId);
      if (user?.role === 'staff') {
        navigate('/live-entry');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError('Mã PIN không đúng.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-main)]">
      <div className="bg-[var(--color-bg-surface)] p-8 rounded-2xl border border-[var(--color-border-main)] shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-[var(--color-accent-gold)] rounded-2xl flex items-center justify-center font-bold text-3xl text-black mx-auto mb-4">
              B
           </div>
           <h1 className="text-2xl font-bold text-white">BRASSERIE Ops</h1>
           <p className="text-[var(--color-text-muted)] mt-2">Hệ thống quản lý vận hành</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Chọn Tên Nhân Viên
            </label>
            <select 
              className="w-full bg-[var(--color-border-main)]/50 border border-[var(--color-border-main)] text-white rounded-lg p-3 outline-none focus:border-[var(--color-accent-gold)] transition-colors"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              required
            >
              <option value="" disabled>-- Chọn tài khoản --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Mã PIN (4 số)
            </label>
            <input 
              type="password"
              maxLength={4}
              className="w-full bg-[var(--color-border-main)]/50 border border-[var(--color-border-main)] text-white rounded-lg p-3 outline-none focus:border-[var(--color-accent-gold)] transition-colors text-center text-2xl tracking-widest"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          {error && <p className="text-[var(--color-accent-red)] text-sm text-center">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-[var(--color-accent-gold)] hover:bg-[#c09142] text-black font-bold py-3.5 rounded-lg transition-colors mt-4"
          >
            ĐĂNG NHẬP
          </button>
        </form>
      </div>
    </div>
  );
}
