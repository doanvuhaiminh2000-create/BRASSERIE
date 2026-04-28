import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { formatTime, cn } from '../../lib/utils';
import { ChevronLeft, Trash2, CheckCircle2, XCircle, UtensilsCrossed, AlertCircle, Clock } from 'lucide-react';
import { Table, SessionItem } from '../../types';

export function SessionFlow() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { 
    tables, sessions, menu, currentUser, 
    createSession, updateTable, addItem, updatePendingItemQty, 
    removePendingItem, sendRoundToKitchen, serveItem, cancelItem, recordUpsellAttempt, checkoutSession
  } = useApp();
  
  const table = tables.find(t => t.id === Number(tableId));
  const activeSessionId = table?.currentSessionId;
  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Hub stages: ORDER -> UPSELL -> REVIEW (then SEND)
  const [hubStage, setHubStage] = useState<'ORDER' | 'UPSELL' | 'REVIEW'>('ORDER');
  
  // Left column state (Menu)
  const [selectedSection, setSelectedSection] = useState<string>(() => {
    const defaultSec = menu.find(m => m.isActive)?.section;
    return defaultSec || 'APPETIZER';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Right column modals/state
  const [upsellTargetItem, setUpsellTargetItem] = useState<any | null>(null);
  const [upsellRejectReason, setUpsellRejectReason] = useState<string>('Ăn không hết');
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Tiền Mặt' | 'Thẻ NCB' | 'VietQR' | 'Voucher' | null>(null);
  
  // Force re-render every 30s to update "cooking" timers
  const [, setTick] = useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Lock management
  React.useEffect(() => {
    if (!table || !currentUser) return;
    
    // Acquire lock
    updateTable(table.id, {
      lockedBy: currentUser.id,
      lockedAt: Date.now()
    });

    // Heartbeat mỗi 5 phút
    const heartbeat = setInterval(() => {
      updateTable(table.id, { lockedAt: Date.now() });
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(heartbeat);
      // Clear lock on unmount
      updateTable(table.id, {
        lockedBy: null,
        lockedAt: null
      });
    };
  }, [table?.id, currentUser?.id]);

  if (!table) return <div className="p-10 text-center font-bold text-[var(--color-text-muted)] uppercase">Bàn không tồn tại</div>;

  if (!activeSession) {
    return (
      <div className="flex flex-col h-full bg-[var(--color-bg-main)] relative min-h-0">
        <div className="flex-none flex items-center justify-between p-4 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-main)]">
           <span className="text-xs font-black text-white uppercase">Mở Bàn {table.name}</span>
           <button onClick={() => navigate('/live-entry')} className="text-[10px] font-black text-[var(--color-text-muted)] hover:text-white flex items-center gap-1 uppercase">
             <XCircle className="w-4 h-4" /> THOÁT
           </button>
        </div>
        <T1GuestSeated table={table} createSession={createSession} />
      </div>
    );
  }

  const sections = Array.from(new Set(menu.filter(m => m.isActive).map(m => m.section)));
  const filteredMenu = menu.filter(m => {
    const matchesSection = m.section === selectedSection;
    const matchesSearch = m.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    return m.isActive && matchesSection && matchesSearch;
  });

  const handleMenuClick = (item: any) => {
    if (hubStage === 'ORDER' || hubStage === 'REVIEW') {
      addItem(table.id, item, false);
    } else if (hubStage === 'UPSELL') {
      setUpsellTargetItem(item);
    }
  };

  const handleUpsellDecision = (result: 'TC' | 'TChối') => {
    if (!upsellTargetItem) return;
    if (result === 'TC') {
      addItem(table.id, upsellTargetItem, true);
      recordUpsellAttempt(table.id, { menuItemId: upsellTargetItem.id, result: 'TC' });
    } else {
      recordUpsellAttempt(table.id, { 
        menuItemId: upsellTargetItem.id, 
        result: 'TChối', 
        reason: upsellRejectReason 
      });
    }
    setUpsellTargetItem(null);
  };

  const handleSendToKitchen = () => {
    sendRoundToKitchen(table.id);
    setHubStage('ORDER');
  };

  const calculateTotal = (items: SessionItem[]) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((acc, item) => acc + ((item?.menuItem?.price || 0) * (item?.quantity || 0)), 0);
  };

  const rawItems = activeSession?.items || [];
  const pendingItems = rawItems.filter(i => i?.status === 'PENDING');
  const sentItems = rawItems.filter(i => i?.status === 'SENT');
  const servedItems = rawItems.filter(i => i?.status === 'SERVED');
  const canceledItems = rawItems.filter(i => i?.status === 'CANCELED');
  const grandTotal = calculateTotal([...pendingItems, ...sentItems, ...servedItems]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-main)] overflow-hidden min-h-0">
      {/* 1. ĐẦU MỤC QUAN TRỌNG */}
      <div className="flex-none flex flex-col pb-2 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-main)]">
        {/* Table info & Exit for mobile */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
           <div className="flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full", activeSession ? "bg-red-500 animate-pulse" : "bg-green-500")} />
              <span className="text-[10px] font-black text-white uppercase tracking-tight">Bàn {table.name} • {activeSession?.guestCount || 0} khách</span>
           </div>
           <button onClick={() => navigate('/live-entry')} className="text-[9px] font-black text-[var(--color-text-muted)] hover:text-white flex items-center gap-1 uppercase bg-[var(--color-bg-main)]/50 px-2 py-1 rounded-lg border border-[var(--color-border-main)] transition-all active:scale-95">
              <XCircle className="w-3.5 h-3.5" /> THOÁT RA BẢN ĐỒ
           </button>
        </div>

        {/* Stages */}
        <div className="flex px-3 pt-1 gap-1 shrink-0">
          {['ORDER', 'UPSELL', 'REVIEW'].map((s, idx) => (
            <div key={s} className={cn("flex-1 py-1 rounded-lg text-[10px] font-black text-center transition-all border", hubStage === s ? "bg-[var(--color-accent-gold)] text-black border-[var(--color-accent-gold)]" : "text-[var(--color-text-muted)] border-transparent bg-[var(--color-bg-main)]/50")}>
              {idx + 1}. {s === 'ORDER' ? 'GỌI MÓN' : s === 'UPSELL' ? 'UPSELL' : 'XÁC NHẬN'}
            </div>
          ))}
        </div>

        {/* Sections */}
        <div className="flex overflow-x-auto gap-2 px-3 pt-2 pb-2 custom-scrollbar shrink-0 xl:hidden">
          {sections.map(sec => (
            <button key={sec} onClick={() => setSelectedSection(sec)} className={cn("px-4 py-1.5 rounded-full font-bold text-[11px] uppercase transition-all whitespace-nowrap border text-white", selectedSection === sec ? "bg-[var(--color-accent-gold)] text-black border-[var(--color-accent-gold)]" : "bg-[var(--color-bg-main)] text-[var(--color-text-muted)] hover:text-white border-[var(--color-border-main)]")}>
              {sec}
            </button>
          ))}
        </div>
      </div>

      {isCheckoutMode ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative bg-[var(--color-bg-surface)]">
           <button onClick={() => setIsCheckoutMode(false)} className="absolute top-4 left-4 text-xs text-[var(--color-text-muted)] hover:text-white flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> QUAY LẠI</button>
           <h2 className="text-[var(--color-accent-gold)] text-[10px] font-black uppercase tracking-widest mb-2">Tổng hóa đơn</h2>
           <div className="text-4xl font-black text-white mb-10">{new Intl.NumberFormat('vi-VN').format(grandTotal)} đ</div>
           <div className="w-full max-w-xs space-y-2 mb-10">
             {['Tiền Mặt', 'Thẻ NCB', 'VietQR', 'Voucher'].map(method => (
               <button key={method} onClick={() => setPaymentMethod(method as any)} className={cn("w-full py-3 rounded-xl font-bold border-2 text-sm", paymentMethod === method ? "border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)]" : "border-[var(--color-border-main)] text-white")}>{method}</button>
             ))}
           </div>
           <button onClick={() => { if (paymentMethod) { checkoutSession(table.id, paymentMethod); navigate('/live-entry'); } }} disabled={!paymentMethod} className="w-full max-w-xs py-4 rounded-2xl font-black bg-[var(--color-accent-green)] text-black uppercase tracking-widest disabled:opacity-30">Hoàn Tất</button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* DESKTOP ONLY: Vertical section sidebar */}
          <aside className="hidden xl:flex flex-col w-44 border-r border-[var(--color-border-main)] bg-[var(--color-bg-surface)]/50 overflow-y-auto custom-scrollbar shrink-0 min-h-0">
            <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-black p-4 border-b border-[var(--color-border-main)]">Danh mục</h3>
            {sections.map(sec => (
              <button 
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={cn(
                  "px-4 py-3 text-left text-[11px] font-bold border-l-2 transition-all uppercase tracking-tight",
                  selectedSection === sec 
                    ? "bg-[var(--color-accent-gold)]/10 border-[var(--color-accent-gold)] text-[var(--color-accent-gold)]"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-white hover:bg-white/5"
                )}
              >
                {sec}
              </button>
            ))}
          </aside>

          <div className="flex-1 flex flex-col min-h-0">
            {/* 2. MENU */}
            <div className={cn(
              "p-3 bg-[var(--color-bg-main)]/30 custom-scrollbar border-b border-[var(--color-border-main)] overscroll-x-contain",
              "flex-[5] min-h-0 md:flex-1 md:overflow-y-auto overflow-x-auto"
            )}>
              <div className={cn(
                "flex gap-3 h-full pb-2", // Mobile/Tablet side scroll
                "md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:h-auto md:pb-0" // PC Grid
              )}>
                {filteredMenu.map(item => (
                  <div key={item.posCode} onClick={() => handleMenuClick(item)} className={cn("bg-[var(--color-bg-surface)] border p-3 rounded-2xl cursor-pointer active:scale-95 transition-all shadow-md w-[40vw] max-w-[160px] md:w-auto md:max-w-none shrink-0 flex flex-col justify-between", hubStage === 'UPSELL' ? "border-[var(--color-accent-green)]/50" : "border-[var(--color-border-main)]")}>
                    <h4 className="font-bold text-sm text-white line-clamp-3 mb-1 leading-tight">{item.displayName}</h4>
                    <div>
                       <p className="text-[var(--color-accent-gold)] font-mono text-xs font-bold">{new Intl.NumberFormat('vi-VN').format(item.price)}đ</p>
                       {hubStage === 'UPSELL' && <div className="mt-2 py-1 bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)] text-[9px] font-black uppercase text-center rounded-lg">Bấm để Gợi ý</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. ORDER LIST (Mobile view - merged into sidebar on PC/Tablet?) */}
            <div className="md:hidden flex-[6] min-h-0 overflow-y-auto p-3 bg-[var(--color-bg-surface)] custom-scrollbar">
              {pendingItems.length === 0 && sentItems.length === 0 && servedItems.length === 0 && (
                 <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-[10px] uppercase font-bold tracking-widest">
                   Chưa có món nào được chọn.
                 </div>
              )}
              
              <div className="space-y-4 pb-4">
                <OrderContent 
                  pendingItems={pendingItems}
                  sentItems={sentItems}
                  servedItems={servedItems}
                  tableId={table.id}
                  updateQty={updatePendingItemQty}
                  removePending={removePendingItem}
                  serveItem={serveItem}
                  activeSession={activeSession}
                />
              </div>
            </div>

            {/* 4. ACTIONS (Mobile footer) */}
            <div 
              className="md:hidden flex-none border-t border-[var(--color-border-main)] bg-[var(--color-bg-surface)] px-3 pt-3 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-20"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
            >
               <OrderActions 
                 pendingItems={pendingItems}
                 hubStage={hubStage}
                 setHubStage={setHubStage}
                 grandTotal={grandTotal}
                 setIsCheckoutMode={setIsCheckoutMode}
                 sentItems={sentItems}
                 handleSendToKitchen={handleSendToKitchen}
               />
            </div>
          </div>

          {/* TABLET/PC SIDEBAR: ORDER PANEL */}
          <aside className="hidden md:flex flex-col w-[320px] lg:w-[380px] bg-[var(--color-bg-surface)] border-l border-[var(--color-border-main)] shrink-0 overflow-hidden min-h-0">
             <div className="p-4 border-b border-[var(--color-border-main)] bg-[var(--color-bg-main)] flex justify-between items-center shrink-0">
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Chi tiết Order</h3>
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">Bàn {table.name}</span>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 min-h-0">
                <OrderContent 
                  pendingItems={pendingItems}
                  sentItems={sentItems}
                  servedItems={servedItems}
                  tableId={table.id}
                  updateQty={updatePendingItemQty}
                  removePending={removePendingItem}
                  serveItem={serveItem}
                  activeSession={activeSession}
                />
             </div>

             <div className="p-4 border-t border-[var(--color-border-main)] space-y-4 shrink-0">
                <OrderActions 
                  pendingItems={pendingItems}
                  hubStage={hubStage}
                  setHubStage={setHubStage}
                  grandTotal={grandTotal}
                  setIsCheckoutMode={setIsCheckoutMode}
                  sentItems={sentItems}
                  handleSendToKitchen={handleSendToKitchen}
                />
             </div>
          </aside>
        </div>

      )}

      {/* UPSLL DECISION MODAL */}
      {upsellTargetItem && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
           <div className="bg-[var(--color-bg-surface)] p-8 rounded-[40px] max-w-md w-full border border-[var(--color-accent-green)] shadow-[0_0_50px_rgba(35,181,137,0.2)]">
              <span className="text-[var(--color-accent-green)] text-[10px] font-black uppercase tracking-widest mb-2 block">Cung cấp dữ liệu Năng suất</span>
              <h3 className="text-xl font-black text-white mb-2 leading-tight">Mời khách dùng thêm: <span className="text-[var(--color-accent-green)]">{upsellTargetItem.displayName}</span></h3>
              <p className="text-[var(--color-text-muted)] text-sm mb-8 leading-relaxed underline decoration-[var(--color-accent-gold)]">Hãy ghi nhận kết quả phản hồi của khách hàng sau khi tư vấn!</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                 <button onClick={() => handleUpsellDecision('TC')} className="py-6 rounded-3xl bg-[var(--color-accent-green)] text-black font-black flex flex-col items-center gap-2 text-sm shadow-xl active:scale-95 transition-all"><CheckCircle2 className="w-8 h-8"/> THÀNH CÔNG</button>
                 <div className="flex flex-col gap-2">
                    <select value={upsellRejectReason} onChange={(e) => setUpsellRejectReason(e.target.value)} className="bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-xl p-3 text-white text-xs outline-none">{['Ăn không hết', 'Giá cao', 'Không đúng vị', 'Đã đủ rồi', 'Lý do khác'].map(r => <option key={r} value={r}>{r}</option>)}</select>
                    <button onClick={() => handleUpsellDecision('TChối')} className="flex-1 py-4 rounded-xl border border-red-500 text-red-500 font-bold bg-red-500/5 hover:bg-red-500 hover:text-white text-xs uppercase">TỪ CHỐI</button>
                 </div>
              </div>
              <button onClick={() => setUpsellTargetItem(null)} className="w-full py-2 text-[var(--color-text-muted)] text-[10px] font-bold hover:text-white uppercase tracking-widest">Bỏ qua / Xem lại</button>
           </div>
        </div>
      )}
    </div>
  );
}

function OrderContent({ pendingItems, sentItems, servedItems, tableId, updateQty, removePending, serveItem, activeSession }: any) {
  return (
    <div className="space-y-4">
      {/* PENDING ITEMS */}
      {pendingItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-black text-white uppercase tracking-widest border-l-2 border-[var(--color-accent-gold)] pl-2">🛒 Món đang chọn</h4>
          {pendingItems.map((item: any) => (
            <div key={item.id} className="bg-[var(--color-bg-main)] p-3 rounded-xl border border-[var(--color-border-main)] relative overflow-hidden flex flex-col gap-2 justify-between">
              {item.isUpsold && <div className="absolute top-0 right-0 bg-[var(--color-accent-green)] text-black text-[8px] font-black px-2 py-0.5 rounded-bl-lg">UPSELL TC</div>}
              <div className="flex-1 pr-6">
                <span className="font-bold text-white text-sm block leading-tight">{item.menuItem.displayName}</span>
                <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{new Intl.NumberFormat('vi-VN').format(item.menuItem.price)}đ</span>
              </div>
              <div className="flex items-center gap-3 justify-between shrink-0">
                <div className="flex items-center gap-1 bg-[var(--color-bg-surface)] rounded-lg p-1 border border-[var(--color-border-main)]">
                  <button onClick={() => updateQty(tableId, item.id, -1)} className="w-8 h-8 flex items-center justify-center text-white text-lg font-black bg-[var(--color-bg-main)] rounded active:scale-90">-</button>
                  <span className="w-6 text-center font-bold text-sm text-white">{item.quantity}</span>
                  <button onClick={() => updateQty(tableId, item.id, 1)} className="w-8 h-8 flex items-center justify-center text-black text-lg font-black bg-[var(--color-accent-gold)] rounded active:scale-90">+</button>
                </div>
                <button onClick={() => removePending(tableId, item.id)} className="p-2 text-[var(--color-text-muted)] hover:text-red-500 rounded bg-red-500/10 active:scale-90">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SENT ITEMS */}
      {sentItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-black text-[var(--color-accent-orange)] uppercase tracking-widest border-l-2 border-[var(--color-accent-orange)] pl-2 flex items-center gap-1">
             <span className="animate-pulse">🍳</span> Đang Chế Biến
          </h4>
          {sentItems.map((item: any) => {
            const minutesElapsed = item.sentAt ? Math.floor((Date.now() - item.sentAt) / 60000) : 0;
            return (
              <div key={item.id} className="bg-[#1a1510] p-3 rounded-xl border border-[var(--color-accent-orange)]/30 relative flex justify-between items-center gap-2">
                 <div className="flex-1">
                    <span className="font-bold text-white text-sm block leading-tight">{item.quantity}x {item.menuItem.displayName}</span>
                    <div className="flex items-center gap-2 mt-1">
                       <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1", minutesElapsed > 15 ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-white/5 text-[var(--color-text-muted)]")}>
                         <Clock className="w-2.5 h-2.5" /> Chờ {minutesElapsed}p
                       </span>
                    </div>
                 </div>
                 <button onClick={() => serveItem(tableId, item.id)} className="bg-[var(--color-accent-green)] text-black font-black px-4 py-3 rounded-lg shadow-md active:scale-95 transition-all text-sm uppercase shrink-0">
                   RA
                 </button>
              </div>
            );
          })}
        </div>
      )}

      {/* SERVED ITEMS */}
      {servedItems.length > 0 && (
        <details className="group pt-2">
          <summary className="text-[10px] font-black text-[var(--color-text-muted)] uppercase cursor-pointer mb-2 list-none flex items-center justify-between border border-[var(--color-border-main)] p-2 rounded-lg bg-[var(--color-bg-main)]">
             <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-[var(--color-accent-green)]" />
                <span>Món Đã Lên ({servedItems.length})</span>
             </div>
             <span className="transition-transform group-open:rotate-90">▶</span>
          </summary>
          <div className="space-y-1 pl-1">
            {servedItems.map((item: any) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between py-1 border-b border-white/5 gap-2">
                 <span className="text-xs text-white/50 font-medium"><b>{item.quantity}x</b> {item.menuItem.displayName}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* EVENT LOGS */}
      {activeSession && activeSession.eventLogs.length > 0 && (
        <details className="group pt-2">
          <summary className="text-[10px] font-black text-[var(--color-text-muted)] uppercase cursor-pointer mb-2 list-none flex items-center justify-between border border-[var(--color-border-main)] p-2 rounded-lg bg-[var(--color-bg-main)]">
             <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-[var(--color-accent-blue)]" />
                <span>Lịch Sử ({activeSession.eventLogs.length})</span>
             </div>
             <span className="transition-transform group-open:rotate-90">▶</span>
          </summary>
          <div className="space-y-3 pl-3 border-l-2 border-[var(--color-border-main)] ml-1 mt-3 mb-2">
            {activeSession.eventLogs.slice().reverse().map((log: any) => {
              const d = new Date(log.time);
              const hhmm = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
              return (
                <div key={log.id} className="relative before:absolute before:-left-[15px] before:top-1.5 before:w-2 before:h-2 before:bg-[var(--color-accent-blue)] before:rounded-full">
                   <div className="flex items-center gap-2 mb-0.5">
                     <span className="text-[10px] text-[var(--color-accent-blue)] font-bold">{hhmm}</span>
                     <span className="text-[9px] font-bold text-white bg-white/10 px-1 py-0.5 rounded uppercase">{log.staffName}</span>
                   </div>
                   <p className="text-[11px] text-[var(--color-text-muted)] leading-tight">{log.details}</p>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

function OrderActions({ pendingItems, hubStage, setHubStage, grandTotal, setIsCheckoutMode, sentItems, handleSendToKitchen }: any) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center px-1">
        <span className="text-[var(--color-text-muted)] font-black uppercase text-[10px]">TỔNG CỘNG</span>
        <span className="text-[var(--color-accent-gold)] text-base font-black">{new Intl.NumberFormat('vi-VN').format(grandTotal)}đ</span>
      </div>
      
      <div className="flex gap-2 w-full">
        {hubStage === 'ORDER' && <button onClick={() => setHubStage('UPSELL')} disabled={pendingItems.length === 0} className="flex-1 py-3 bg-[var(--color-accent-gold)] text-black font-black rounded-xl uppercase text-xs disabled:opacity-50 tracking-widest shadow-lg">TIẾP TỤC →</button>}
        
        {hubStage === 'UPSELL' && <>
          <button onClick={() => setHubStage('ORDER')} className="px-5 bg-[var(--color-bg-main)] border border-[var(--color-border-main)] text-white font-bold rounded-xl text-[11px] uppercase">Lùi</button>
          <button onClick={() => setHubStage('REVIEW')} className="flex-1 py-3 bg-[var(--color-accent-green)] text-black font-black rounded-xl uppercase text-xs tracking-widest shadow-lg">XONG →</button>
        </>}
        
        {hubStage === 'REVIEW' && <>
          <button onClick={() => setHubStage('UPSELL')} className="px-5 bg-[var(--color-bg-main)] border border-[var(--color-border-main)] text-white font-bold rounded-xl text-[11px] uppercase">Lùi</button>
          <button onClick={handleSendToKitchen} className="flex-1 py-3 bg-[var(--color-accent-orange)] text-white font-black rounded-xl animate-pulse uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-2"><UtensilsCrossed className="w-4 h-4"/> GỬI BẾP</button>
        </>}
        
        {pendingItems.length === 0 && hubStage === 'ORDER' && grandTotal > 0 && (
          <button onClick={() => setIsCheckoutMode(true)} disabled={sentItems.length > 0} className="flex-1 py-3 border-2 border-[var(--color-accent-green)]/30 text-[var(--color-accent-green)] font-black rounded-xl uppercase text-[11px] tracking-widest bg-[var(--color-accent-green)]/5">THANH TOÁN</button>
        )}
      </div>
    </div>
  );
}

function T1GuestSeated({ table, createSession }: { table: Table, createSession: any }) {
  const [guests, setGuests] = useState<number | null>(null);
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto p-4">
      <div className="text-4xl mb-8 font-black font-mono text-[var(--color-accent-blue)]">{formatTime(new Date())}</div>
      <div className="w-full bg-[var(--color-bg-surface)] p-8 rounded-[40px] border border-[var(--color-border-main)] text-center">
        <h2 className="text-2xl font-black text-white mb-8">SỐ LƯỢNG KHÁCH</h2>
        <div className="grid grid-cols-5 gap-2 mb-10">
          {[1,2,3,4,5,6,7,8,10,12,15,20,25,30,50].map(num => (
            <button key={num} onClick={() => setGuests(num)} className={cn("aspect-square rounded-xl text-xs font-black flex items-center justify-center transition-all", guests === num ? "bg-[var(--color-accent-gold)] text-black" : "bg-[var(--color-bg-main)] text-[var(--color-text-muted)] border border-white/5")}>{num}</button>
          ))}
        </div>
        <button onClick={() => { if (guests) createSession(table.id, guests); }} disabled={!guests} className="w-full py-5 rounded-2xl font-black text-sm bg-[var(--color-accent-green)] text-black uppercase tracking-widest disabled:opacity-20 transition-all shadow-xl">MỞ BÀN</button>
      </div>
    </div>
  );
}
