import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ChevronLeft, LogOut, Clock, Search } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { confirmModal } from '../../components/ui/ConfirmModal';

export function TopBar() {
  const { currentUser, logout, updateTable, tables } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    const confirmed = await confirmModal({
      title: 'Đăng Xuất',
      message: 'Bạn có chắc chắn muốn đăng xuất không?',
      danger: true,
      confirmText: 'Đăng xuất'
    });
    if (confirmed) {
      logout();
      navigate('/');
    }
  };

  const isTableDetail = location.pathname.includes('/table/');
  
  const handleBack = () => {
    // Attempt to extract tableId from path regex
    const match = location.pathname.match(/\/table\/(\d+)/);
    if (match) {
      const tableId = Number(match[1]);
      const table = tables.find(t => t.id === tableId);
      if (table && table.status === 'KHOA' && table.lockedBy === currentUser?.id) {
         updateTable(table.id, { status: 'TRONG', lockedBy: null, lockedAt: null });
      }
    }
    navigate('/live-entry');
  };

  return (
    <div className="min-h-14 border-b border-[var(--color-border-main)] bg-[var(--color-bg-surface)] shrink-0 flex items-center justify-between px-2 relative z-40 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center gap-2">
        {isTableDetail ? (
          <button 
            onClick={handleBack}
            className="p-3 text-[var(--color-accent-gold)] hover:bg-[var(--color-accent-gold)]/10 rounded-full transition-colors active:scale-95"
            aria-label="Quay lại"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        ) : (
          <div className="pl-3 py-2 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-[var(--color-accent-gold)] flex items-center justify-center text-black font-black text-xs shadow-[0_0_15px_rgba(212,162,78,0.4)]">
               BR
             </div>
             <div>
               <p className="text-white font-bold text-sm leading-tight tracking-wide">BRASSERIE</p>
               <p className="text-[10px] text-[var(--color-text-muted)] tracking-widest uppercase font-semibold">Live POS</p>
             </div>
          </div>
        )}
      </div>

      {!isTableDetail && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-main)] rounded-full border border-[var(--color-border-main)]">
           <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
           <span className="text-xs font-bold text-white tabular-nums tracking-wider">{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex flex-col items-end mr-2">
           <span className="text-xs font-bold text-white leading-tight">{currentUser?.name}</span>
           <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)]">{currentUser?.role}</span>
        </div>
        <button 
           onClick={handleLogout}
           className="w-10 h-10 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-accent-red)] hover:bg-[var(--color-accent-red)]/10 rounded-full transition-colors active:scale-95"
           aria-label="Đăng xuất"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
