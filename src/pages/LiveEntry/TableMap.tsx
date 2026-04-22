import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { Table, TableStatus } from '../../types';
import { cn } from '../../lib/utils';
import { Lock } from 'lucide-react';

export function TableMap() {
  const { tables, currentUser, updateTable } = useApp();
  const navigate = useNavigate();

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

    // Lock the table if empty
    if (table.status === 'TRONG') {
      updateTable(table.id, { 
        status: 'KHOA', 
        lockedBy: currentUser?.id, 
        lockedAt: Date.now() 
      });
    }
    
    navigate(`/live-entry/table/${table.id}`);
  };

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'TRONG': return 'border-[var(--color-accent-green)]/50 border-dashed text-[var(--color-accent-green)]';
      case 'DA_NGOI': return 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)]';
      case 'DA_ORDER': return 'border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]';
      case 'DANG_PHUC_VU': return 'border-[var(--color-accent-orange)] bg-[var(--color-accent-orange)]/10 text-[var(--color-accent-orange)]';
      case 'CHECKOUT': return 'border-[var(--color-accent-red)] bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)]';
      case 'KHOA': return 'border-[var(--color-border-main)] bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] opacity-50';
      default: return 'border-transparent bg-slate-800';
    }
  };

  const zones = ['Trong Nhà', 'Ngoài Trời', 'Cửa Sổ', 'Góc VIP'];

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-xl font-semibold text-white">Sơ Đồ Bàn</h2>
        <div className="flex gap-4 text-xs font-medium bg-[var(--color-bg-surface)] px-4 py-2 rounded-lg border border-[var(--color-border-main)]">
          <span className="flex items-center gap-1.5 text-[var(--color-accent-green)]"><div className="w-2.5 h-2.5 outline-dashed outline-1 outline-current"></div> Trống</span>
          <span className="flex items-center gap-1.5 text-[var(--color-accent-gold)]"><div className="w-2.5 h-2.5 bg-current rounded-sm"></div> Đã ngồi</span>
          <span className="flex items-center gap-1.5 text-[var(--color-accent-blue)]"><div className="w-2.5 h-2.5 bg-current rounded-sm"></div> Đã Order</span>
          <span className="flex items-center gap-1.5 text-[var(--color-accent-orange)]"><div className="w-2.5 h-2.5 bg-current rounded-sm"></div> Đang Phục Vụ</span>
          <span className="flex items-center gap-1.5 text-[var(--color-accent-red)]"><div className="w-2.5 h-2.5 bg-current rounded-sm"></div> Checkout</span>
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
                {zoneTables.map(table => (
                  <div
                    key={table.id}
                    onClick={() => handleTableClick(table)}
                    className={cn(
                      "aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 shadow-lg",
                      getStatusColor(table.status)
                    )}
                  >
                    <span className="text-xl font-bold">{table.name}</span>
                    {table.status === 'KHOA' ? (
                       <div className="flex items-center gap-1 mt-1 text-[10px]">
                         <Lock className="w-3 h-3" />
                         <span className="truncate max-w-[60px]">{table.lockedBy}</span>
                       </div>
                    ) : (
                      <span className="text-xs opacity-80 mt-1 uppercase font-medium">{table.capacity} khách</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
