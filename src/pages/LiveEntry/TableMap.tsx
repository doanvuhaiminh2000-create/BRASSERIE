import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { Table, TableStatus, OrderSession } from '../../types';
import { cn } from '../../lib/utils';
import { Lock, Clock } from 'lucide-react';

export function TableMap() {
  const { tables, sessions, currentUser, updateTable, createSession } = useApp();
  const navigate = useNavigate();
  const [selectingTable, setSelectingTable] = React.useState<Table | null>(null);

  // Force re-render periodically to update wait times
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000); // 30s
    return () => clearInterval(timer);
  }, []);

  const handleTableClick = (table: Table) => {
    // Check if locked by someone else
    if (table.status === 'KHOA' && table.lockedBy !== currentUser?.id) {
      if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
        if (window.confirm(`Bàn đang bị khóa bởi ${table.lockedBy}. Bạn có muốn mở khóa cưỡng bức không?`)) {
          updateTable(table.id, { status: 'TRONG', lockedBy: null, lockedAt: null });
        }
      } else {
        alert(`Bàn đang được ${table.lockedBy} sử dụng. Vui lòng liên hệ quản lý nếu cần hỗ trợ.`);
      }
      return;
    }

    // If occupied/already has session, go straight in
    if (table.currentSessionId) {
      navigate(`/live-entry/table/${table.id}`);
      return;
    }

    // If empty, show guest selection modal
    setSelectingTable(table);
  };

  const confirmGuests = (num: number) => {
    if (!selectingTable) return;
    
    // Create session immediately
    const session = createSession(selectingTable.id, num);
    setSelectingTable(null);
    navigate(`/live-entry/table/${selectingTable.id}`);
  };

  const getTableMetrics = (session?: OrderSession) => {
    if (!session) return null;
    const pending = session.items.filter(i => i.status === 'PENDING');
    const sent = session.items.filter(i => i.status === 'SENT');
    const served = session.items.filter(i => i.status === 'SERVED');
    
    let maxWaitMin = 0;
    if (sent.length > 0) {
       const oldestSent = Math.min(...sent.map(i => i.sentAt || Date.now()));
       maxWaitMin = Math.floor((Date.now() - oldestSent) / 60000);
    }
    
    return { pending: pending.length, sent: sent.length, served: served.length, maxWaitMin };
  };

  const getStatusColor = (table: Table, metrics: any) => {
    if (table.status === 'KHOA') return 'border-[var(--color-border-main)] bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] opacity-50';
    if (!metrics) return 'border-[var(--color-accent-green)]/50 border-dashed text-[var(--color-accent-green)]';
    
    if (metrics.sent > 0) return 'border-[var(--color-accent-orange)] bg-[var(--color-accent-orange)]/10 text-[var(--color-accent-orange)]';
    if (metrics.pending > 0) return 'border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]';
    if (metrics.served > 0) return 'border-[var(--color-accent-green)] bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]';
    return 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)]'; // Just seated
  };

  const zones = ['Trong Nhà', 'Ngoài Trời', 'Cửa Sổ', 'Góc VIP'];

  return (
    <div className="p-6 h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">Sơ Đồ Bàn</h2>
          <button 
            onClick={() => {
              if (window.confirm('Bạn có muốn xóa toàn bộ dữ liệu demo (sessions & tables) để test lại từ đầu không?')) {
                localStorage.removeItem('brasserie_tables');
                localStorage.removeItem('brasserie_sessions');
                window.location.reload();
              }
            }}
            className="text-[10px] bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/20 px-2 py-1 rounded hover:bg-[var(--color-accent-red)] hover:text-white transition-colors"
          >
            RESET DỮ LIỆU TEST
          </button>
        </div>
        <div className="flex gap-4 text-xs font-medium bg-[var(--color-bg-surface)] px-4 py-2 rounded-lg border border-[var(--color-border-main)] text-white">
          <span className="flex items-center gap-1.5 text-[var(--color-accent-green)]"><div className="w-2.5 h-2.5 outline-dashed outline-1 outline-current"></div> Trống / Xong</span>
          <span className="flex items-center gap-1.5 text-[var(--color-accent-gold)]"><div className="w-2.5 h-2.5 bg-current rounded-sm"></div> Khách Mới</span>
          <span className="flex items-center gap-1.5 text-[var(--color-accent-blue)]"><div className="w-2.5 h-2.5 bg-current rounded-sm"></div> Đang Chọn</span>
          <span className="flex items-center gap-1.5 text-[var(--color-accent-orange)]"><div className="w-2.5 h-2.5 bg-current rounded-sm"></div> Chờ Bếp</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
        {zones.map(zone => {
          const zoneTables = tables.filter(t => t.zone === zone);
          if (zoneTables.length === 0) return null;
          return (
            <div key={zone}>
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4 border-b border-[var(--color-border-main)] pb-2">
                Khu vực: {zone}
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {zoneTables.map(table => {
                  const session = sessions.find(s => s.id === table.currentSessionId);
                  const metrics = getTableMetrics(session);
                  
                  return (
                    <div
                      key={table.id}
                      onClick={() => handleTableClick(table)}
                      className={cn(
                        "aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 shadow-lg relative group",
                        getStatusColor(table, metrics)
                      )}
                    >
                      <span className="text-xl font-bold">{table.name}</span>
                      
                      {table.status === 'KHOA' ? (
                         <div className="flex items-center gap-1 mt-1 text-[10px]">
                           <Lock className="w-3 h-3" />
                           <span className="truncate max-w-[60px]">{table.lockedBy}</span>
                         </div>
                      ) : metrics ? (
                         <div className="mt-1 flex flex-col items-center">
                            {metrics.sent > 0 ? (
                               <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                                 <Clock className="w-2.5 h-2.5 animate-pulse" /> {metrics.maxWaitMin}p ({metrics.sent})
                               </div>
                            ) : metrics.pending > 0 ? (
                               <span className="text-[9px] bg-black/40 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">ĐANG CHỌN</span>
                            ) : metrics.served > 0 ? (
                               <span className="text-[9px] bg-black/40 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">ĐÃ LÊN XONG</span>
                            ) : (
                               <span className="text-[10px] opacity-60 uppercase font-bold tracking-tighter">{session?.guestCount} Khách</span>
                            )}
                         </div>
                      ) : (
                        <span className="text-[10px] opacity-60 mt-1 uppercase font-bold tracking-tighter">Max: {table.capacity}p</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Guest Selection Modal Overlay */}

      {selectingTable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-[var(--color-bg-surface)] rounded-[32px] border border-[var(--color-border-main)] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
              <div className="text-center mb-6">
                <h3 className="text-[var(--color-accent-gold)] uppercase tracking-[0.2em] font-black text-[10px] mb-2">Mở bàn mới</h3>
                <h2 className="text-2xl font-black text-white">Bàn {selectingTable.name}</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">Chọn số lượng khách thực tế</p>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mb-8">
                {[1,2,3,4,5,6,7,8,10,12,15,20].map(num => (
                  <button
                    key={num}
                    onClick={() => confirmGuests(num)}
                    className="aspect-square rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-main)] text-white text-lg font-black hover:border-[var(--color-accent-gold)] hover:text-[var(--color-accent-gold)] transition-all active:scale-90"
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setSelectingTable(null)}
                className="w-full py-4 text-[var(--color-text-muted)] hover:text-white font-bold text-sm uppercase tracking-widest transition-colors"
              >
                Hủy bỏ
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
