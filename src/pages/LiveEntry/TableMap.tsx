import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { Table, TableStatus, OrderSession } from '../../types';
import { cn } from '../../lib/utils';
import { Lock, Clock, Settings, Save, Move, Plus, Trash2, Edit2, X } from 'lucide-react';

import { toast } from '../../components/ui/Toast';
import { confirmModal } from '../../components/ui/ConfirmModal';

export function TableMap() {
  const { tables, zones, sessions, currentUser, updateTable, addTable, deleteTable, createSession } = useApp();
  const navigate = useNavigate();
  const [selectingTable, setSelectingTable] = React.useState<Table | null>(null);
  const [editingTable, setEditingTable] = React.useState<Partial<Table> | null>(null);
  
  const isManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const [isEditMode, setIsEditMode] = useState(false);
  const [managingZones, setManagingZones] = useState(false);
  const [localCoords, setLocalCoords] = useState<Record<number, {x: number, y: number}>>({});
  const zoneRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const handlePointerDown = (e: React.PointerEvent, tableId: number, zone: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    const zoneEl = zoneRefs.current[zone];
    if (!zoneEl) return;

    const handlePointerMove = (ev: PointerEvent) => {
      const rect = zoneEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100));
      setLocalCoords(prev => ({ ...prev, [tableId]: { x, y } }));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const saveLayout = () => {
    Object.entries(localCoords).forEach(([idStr, coords]) => {
       updateTable(Number(idStr), coords);
    });
    setIsEditMode(false);
    toast.success("Đã lưu sơ đồ bàn");
  };

  // Force re-render periodically to update wait times
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000); // 30s
    return () => clearInterval(timer);
  }, []);

  const isTableLockedByOther = (table: Table) => {
    return table.lockedBy && table.lockedBy !== currentUser?.id && table.lockedAt && (Date.now() - table.lockedAt < 10 * 60 * 1000);
  };

  const handleTableClick = async (table: Table) => {
    // Check if locked by someone else
    if (isTableLockedByOther(table)) {
      if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
        const ok = await confirmModal({
          title: 'Mở khóa bàn cưỡng bức',
          message: `Bàn đang bị khóa bởi ${table.lockedBy}. Bạn có muốn mở khóa cưỡng bức không?`,
          confirmText: 'MỞ KHÓA',
          danger: true
        });
        if (ok) {
          updateTable(table.id, { lockedBy: null, lockedAt: null });
        }
      } else {
        toast.error(`Bàn đang được ${table.lockedBy} sử dụng. Vui lòng liên hệ quản lý nếu cần hỗ trợ.`);
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

  const confirmGuests = async (num: number) => {
    if (!selectingTable) return;
    
    // Create session immediately
    const session = await createSession(selectingTable.id, num);
    if (!session) return;
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
    if (isTableLockedByOther(table)) return 'border-[var(--color-border-main)] bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] opacity-50';
    if (!metrics) return 'border-[var(--color-accent-green)]/50 border-dashed text-[var(--color-accent-green)]';
    
    if (metrics.sent > 0) return 'border-[var(--color-accent-orange)] bg-[var(--color-accent-orange)]/10 text-[var(--color-accent-orange)]';
    if (metrics.pending > 0) return 'border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]';
    if (metrics.served > 0) return 'border-[var(--color-accent-green)] bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]';
    return 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)]'; // Just seated
  };

  return (
    <div className="p-6 h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">Sơ Đồ Bàn</h2>
          {isManager && (
            <>
              {isEditMode && (
                <>
                  <button
                    onClick={() => setManagingZones(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors bg-[var(--color-bg-surface)] text-white hover:bg-[var(--color-bg-surface-hover)] border border-[var(--color-border-main)]"
                  >
                    <Settings className="w-3.5 h-3.5" /> QUẢN LÝ KHU VỰC
                  </button>
                  <button
                    onClick={() => setEditingTable({ name: '', capacity: 4, zone: zones[0] || 'Trong Nhà' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors bg-[var(--color-bg-surface)] text-white hover:bg-[var(--color-bg-surface-hover)] border border-[var(--color-border-main)]"
                  >
                    <Plus className="w-3.5 h-3.5" /> THÊM BÀN
                  </button>
                </>
              )}
              <button
                onClick={() => isEditMode ? saveLayout() : setIsEditMode(true)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                  isEditMode 
                    ? "bg-[var(--color-accent-green)] text-black" 
                    : "bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-white border border-[var(--color-border-main)]"
                )}
              >
                {isEditMode ? <><Save className="w-3.5 h-3.5" /> LƯU SƠ ĐỒ</> : <><Settings className="w-3.5 h-3.5" /> SỬA SƠ ĐỒ</>}
              </button>
            </>
          )}
          <button 
            onClick={async () => {
              const ok = await confirmModal({
                title: 'Reset Dữ Liệu Test',
                message: 'Bạn có muốn xóa toàn bộ dữ liệu demo (sessions & tables) để test lại từ đầu không?',
                confirmText: 'RESET',
                danger: true
              });
              if (ok) {
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
          
          const isAbsoluteLayout = isEditMode || zoneTables.some(t => t.x !== undefined || t.y !== undefined);

          return (
            <div key={zone}>
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4 border-b border-[var(--color-border-main)] pb-2">
                Khu vực: {zone}
              </h3>
              
              <div 
                ref={el => { zoneRefs.current[zone] = el; }}
                className={cn(
                  "w-full transition-all duration-300",
                  isAbsoluteLayout 
                     ? "relative h-[400px] bg-[var(--color-bg-surface)]/30 rounded-2xl border border-[var(--color-border-main)] overflow-hidden" 
                     : "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4"
                )}
              >
                {zoneTables.map((table, i) => {
                  const session = sessions.find(s => s.id === table.currentSessionId);
                  const metrics = getTableMetrics(session);
                  
                  const coords = localCoords[table.id] || { 
                     x: table.x ?? (isAbsoluteLayout ? (i % 8) * 12 + 2 : undefined), 
                     y: table.y ?? (isAbsoluteLayout ? Math.floor(i / 8) * 15 + 2 : undefined) 
                  };

                  return (
                    <div
                      key={table.id}
                      onPointerDown={(e) => handlePointerDown(e, table.id, zone)}
                      onClick={() => !isEditMode && handleTableClick(table)}
                      style={isAbsoluteLayout ? {
                        position: 'absolute',
                        left: `${coords.x}%`,
                        top: `${coords.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '80px',
                        height: '80px',
                        touchAction: isEditMode ? 'none' : 'auto'
                      } : {}}
                      className={cn(
                        "rounded-xl border-2 flex flex-col items-center justify-center transition-all bg-[var(--color-bg-main)] shadow-lg group select-none",
                        isEditMode ? "cursor-grab active:cursor-grabbing hover:border-white ring-2 ring-transparent hover:ring-[var(--color-accent-gold)]/50 z-10 hover:z-20 scale-100" : "cursor-pointer active:scale-95",
                        !isAbsoluteLayout && "aspect-square",
                        getStatusColor(table, metrics)
                      )}
                    >
                      {isEditMode && (
                         <div className="absolute -top-2 -right-2 bg-[var(--color-bg-main)] rounded-full p-1 border border-[var(--color-border-main)] text-[var(--color-text-muted)] pointer-events-none">
                           <Move className="w-3 h-3" />
                         </div>
                      )}
                      {isEditMode && (
                        <button 
                          className="absolute -top-2 -left-2 bg-[var(--color-bg-surface)] rounded-full p-1 border border-[var(--color-border-main)] text-white hover:text-[var(--color-accent-gold)] hover:border-[var(--color-accent-gold)] transition-colors z-30"
                          onPointerDown={e => e.stopPropagation()} 
                          onClick={(e) => { e.stopPropagation(); setEditingTable(table); }}
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                      )}
                      
                      <span className="text-lg font-bold">{table.name}</span>
                      
                      {isTableLockedByOther(table) || (table.lockedBy === currentUser?.id) ? (
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

      {editingTable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-[var(--color-bg-surface)] rounded-[32px] border border-[var(--color-border-main)] shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-300 flex flex-col gap-4">
              <div className="text-center mb-2">
                <h3 className="text-[var(--color-accent-gold)] uppercase tracking-[0.2em] font-black text-[10px] mb-2">
                  {editingTable.id ? 'Sửa bàn' : 'Thêm bàn mới'}
                </h3>
              </div>
              
              <div>
                <label className="text-[10px] uppercase text-[var(--color-text-muted)] font-bold mb-1 block">Tên/Số Bàn</label>
                <input 
                  type="text" 
                  value={editingTable.name || ''} 
                  onChange={e => setEditingTable(prev => prev ? {...prev, name: e.target.value} : null)}
                  className="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--color-accent-gold)]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-[var(--color-text-muted)] font-bold mb-1 block">Sức chứa (người)</label>
                <input 
                  type="number" 
                  value={editingTable.capacity || 4} 
                  onChange={e => setEditingTable(prev => prev ? {...prev, capacity: Number(e.target.value)} : null)}
                  className="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--color-accent-gold)]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-[var(--color-text-muted)] font-bold mb-1 block">Khu vực</label>
                <div className="flex gap-2">
                  <select 
                    value={editingTable.zone || ''}
                    onChange={e => setEditingTable(prev => prev ? {...prev, zone: e.target.value} : null)}
                    className="flex-1 bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--color-accent-gold)]"
                  >
                    {zones.map(z => <option key={z} value={z}>{z}</option>)}
                    <option value="_NEW_">-- Thêm khu vực mới --</option>
                  </select>
                </div>
                {editingTable.zone === '_NEW_' && (
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Nhập tên khu vực..."
                    onChange={e => setEditingTable(prev => prev ? {...prev, _newZone: e.target.value} as any : null)}
                    className="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--color-accent-gold)] mt-2"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => {
                    const finalZone = editingTable.zone === '_NEW_' ? (editingTable as any)._newZone : editingTable.zone;
                    if (!editingTable.name || !finalZone) return toast.error("Vui lòng điền đủ thông tin");
                    
                    if (editingTable.id) {
                      updateTable(editingTable.id, {
                        name: editingTable.name,
                        capacity: editingTable.capacity,
                        zone: finalZone
                      });
                      toast.success("Sửa bàn thành công");
                    } else {
                      addTable({
                        name: editingTable.name,
                        capacity: editingTable.capacity || 4,
                        zone: finalZone
                      });
                      toast.success("Thêm bàn thành công");
                    }
                    setEditingTable(null);
                  }}
                  className="flex-1 bg-[var(--color-accent-green)] text-black font-bold py-3 text-sm rounded-xl"
                >
                  LƯU
                </button>
                <button
                  onClick={() => setEditingTable(null)}
                  className="flex-1 bg-[var(--color-bg-main)] border border-[var(--color-border-main)] text-white font-bold py-3 text-sm rounded-xl"
                >
                  HỦY
                </button>
              </div>

              {editingTable.id && (
                <button
                  onClick={async () => {
                    if (await confirmModal({ title: 'Xóa bàn', message: 'Bạn có chắc muốn xóa bàn này?', danger: true })) {
                      deleteTable(editingTable.id as number);
                      setEditingTable(null);
                      toast.success("Đã xóa bàn");
                    }
                  }}
                  className="text-xs text-[var(--color-accent-red)] font-bold py-2 hover:bg-[var(--color-accent-red)]/10 rounded-xl mt-2 border border-transparent shadow-none"
                >
                  XÓA BÀN NÀY
                </button>
              )}
           </div>
        </div>
      )}

      {managingZones && (
        <ZoneManagerModal onClose={() => setManagingZones(false)} />
      )}
    </div>
  );
}

function ZoneManagerModal({ onClose }: { onClose: () => void }) {
  const { tables, zones, addZone, deleteZone, renameZone } = useApp();
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [newZoneName, setNewZoneName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addZoneName, setAddZoneName] = useState('');

  const handleSaveRename = () => {
    if (!editingZone || !newZoneName.trim()) return;
    if (editingZone === newZoneName.trim()) {
      setEditingZone(null);
      return;
    }
    
    renameZone(editingZone, newZoneName.trim());
    toast.success(`Đã đổi tên khu vực thành "${newZoneName.trim()}"`);
    setEditingZone(null);
  };

  const handleAddZone = () => {
    if (!addZoneName.trim()) return;
    if (zones.includes(addZoneName.trim())) {
      toast.error("Khu vực này đã tồn tại");
      return;
    }
    addZone(addZoneName.trim());
    toast.success(`Đã thêm khu vực "${addZoneName.trim()}"`);
    setAddZoneName('');
    setIsAdding(false);
  };

  const handleDeleteZone = async (zone: string) => {
    const tablesInZone = tables.filter(t => t.zone === zone);
    
    let deleteTables = false;
    if (tablesInZone.length > 0) {
      const choice = await confirmModal({
        title: 'Xóa khu vực',
        message: `Khu vực "${zone}" đang có ${tablesInZone.length} bàn. Bạn muốn làm gì?`,
        confirmText: 'XÓA CẢ BÀN',
        cancelText: 'CHỈ XÓA KHU VỰC (Giữ bàn)',
        danger: true
      });
      
      // If we don't have a specific "Cancel" vs "Alternative" button in our confirmModal, 
      // I'll assume they might want to just move them or something.
      // But let's assume they want to delete everything if they say confirm.
      if (choice === undefined) return; // Closed modal
      deleteTables = choice;
    } else {
      if (!(await confirmModal({ title: 'Xóa khu vực', message: `Bạn có chắc muốn xóa khu vực "${zone}"?`, danger: true }))) return;
    }

    deleteZone(zone, deleteTables);
    if (deleteTables) {
       toast.success(`Đã xóa khu vực "${zone}" và ${tablesInZone.length} bàn`);
    } else {
       toast.success(`Đã xóa khu vực "${zone}". Các bàn được chuyển sang khu vực mặc định.`);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-[var(--color-bg-surface)] rounded-[32px] border border-[var(--color-border-main)] shadow-2xl p-6 sm:p-8 flex flex-col gap-6 max-h-[80vh]">
        <div className="flex justify-between items-center border-b border-[var(--color-border-main)] pb-4">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Quản Lý Khu Vực</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-[var(--color-text-muted)] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--color-text-muted)] font-medium">Danh sách khu vực tại nhà hàng</p>
          {!isAdding && (
             <button 
               onClick={() => setIsAdding(true)}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent-blue)] text-white rounded-lg text-xs font-bold hover:bg-[var(--color-accent-blue)]/80 transition-colors"
             >
               <Plus className="w-3.5 h-3.5" /> THÊM KHU VỰC
             </button>
          )}
        </div>

        {isAdding && (
          <div className="flex gap-2 items-center bg-[var(--color-bg-main)] p-3 rounded-xl border border-[var(--color-accent-blue)] animate-in slide-in-from-top-2 duration-200">
            <input 
              autoFocus
              type="text" 
              placeholder="Nhập tên khu vực mới..."
              value={addZoneName}
              onChange={e => setAddZoneName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddZone()}
              className="flex-1 bg-transparent text-white outline-none font-bold"
            />
            <button onClick={handleAddZone} className="px-3 py-1.5 bg-[var(--color-accent-blue)] text-white rounded-lg font-bold text-xs">
              THÊM
            </button>
            <button onClick={() => setIsAdding(false)} className="p-1.5 text-[var(--color-text-muted)] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {zones.length === 0 ? (
            <div className="text-center text-[var(--color-text-muted)] py-8">Chưa có khu vực nào</div>
          ) : (
            zones.map(zone => {
              const tablesCount = tables.filter(t => t.zone === zone).length;
              const isEditing = editingZone === zone;
              
              if (isEditing) {
                return (
                  <div key={zone} className="flex gap-2 items-center bg-[var(--color-bg-main)] p-3 rounded-xl border border-[var(--color-accent-gold)]">
                    <input 
                      autoFocus
                      type="text" 
                      value={newZoneName}
                      onChange={e => setNewZoneName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveRename()}
                      className="flex-1 bg-transparent text-white outline-none font-bold"
                    />
                    <button onClick={handleSaveRename} className="px-3 py-1.5 bg-[var(--color-accent-green)] text-black rounded-lg font-bold text-xs">
                      LƯU
                    </button>
                    <button onClick={() => setEditingZone(null)} className="p-1.5 text-[var(--color-text-muted)] hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              }

              return (
                <div key={zone} className="flex items-center justify-between p-4 bg-[var(--color-bg-main)] rounded-xl border border-[var(--color-border-main)] group hover:border-white/20 transition-colors">
                  <div>
                    <h3 className="font-bold text-white text-base">{zone}</h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{tablesCount} bàn</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingZone(zone); setNewZoneName(zone); }}
                      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent-blue)] hover:bg-[var(--color-accent-blue)]/10 rounded-lg transition-colors"
                      title="Sửa tên"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteZone(zone)}
                      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent-red)] hover:bg-[var(--color-accent-red)]/10 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
