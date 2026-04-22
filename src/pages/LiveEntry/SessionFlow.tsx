import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { formatTime, cn } from '../../lib/utils';
import { ChevronLeft } from 'lucide-react';

export function SessionFlow() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { tables, sessions, currentUser, createSession, updateSession, completeSession, updateTable } = useApp();
  
  const table = tables.find(t => t.id === Number(tableId));
  const activeSessionId = table?.currentSessionId;
  const activeSession = sessions.find(s => s.id === activeSessionId);

  const [currentStep, setCurrentStep] = useState(1);

  // Determine current step based on session state Timeline
  useEffect(() => {
    if (!activeSession) {
      setCurrentStep(1); // T1
    } else if (!activeSession.timeline.T2_OrderEnd) {
      setCurrentStep(2); // T2
    } else if (!activeSession.timeline.T4_FinalConfirm) {
      setCurrentStep(3); // T3 (Upsell) or T4
    } else if (!activeSession.timeline.T5_SendToKitchen) {
      setCurrentStep(5); // T5
    } else if (!activeSession.timeline.T6B_Checkout) {
      setCurrentStep(6); // T6A or T6B
    } else {
      setCurrentStep(7); // T7
    }
  }, [activeSession]);

  if (!table) return <div>Bàn không tồn tại</div>;

  const steps = [
    { id: 1, label: 'T1' },
    { id: 2, label: 'T2' },
    { id: 3, label: 'T3' },
    { id: 4, label: 'T4' },
    { id: 5, label: 'T5' },
    { id: 6, label: 'T6' },
    { id: 7, label: 'T7' },
  ];

  const handleBack = () => {
    // If empty table was locked, unlock it
    if (table.status === 'KHOA' && table.lockedBy === currentUser?.id) {
       updateTable(table.id, { status: 'TRONG', lockedBy: null, lockedAt: null });
    }
    navigate('/live-entry');
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-main)] relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-main)] shrink-0">
        <button onClick={handleBack} className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-white p-2">
          <ChevronLeft className="w-6 h-6" />
          <span className="font-medium text-lg">Quay Lại Sơ Đồ</span>
        </button>
        <div className="text-xl font-bold text-white flex items-center gap-4">
          Bàn {table.name} 
          <span className="text-sm font-normal text-[var(--color-text-muted)] bg-[var(--color-border-main)] px-3 py-1 rounded-full">{currentUser?.name}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex justify-between items-center py-4 px-12 bg-[var(--color-bg-main)] border-b border-[var(--color-border-main)] shrink-0">
        {steps.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-2 z-10 w-10">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                  isCompleted ? "bg-[var(--color-accent-green)] text-black" :
                  isCurrent ? "bg-[var(--color-accent-gold)] text-black ring-4 ring-[var(--color-accent-gold)]/20" :
                  "bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border border-[var(--color-border-main)]"
                )}>
                  {isCompleted ? '✓' : step.label}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className={cn(
                  "h-1 flex-1 mx-2 rounded-full transition-colors",
                  isCompleted ? "bg-[var(--color-accent-green)]" : "bg-[var(--color-border-main)]"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {currentStep === 1 && <T1GuestSeated table={table} createSession={createSession} />}
        {currentStep === 2 && <T2InitialOrder session={activeSession!} />}
        {currentStep === 3 && <T3Upsell session={activeSession!} setCurrentStep={setCurrentStep} />}
        {currentStep === 4 && <T4FinalOrder session={activeSession!} setCurrentStep={setCurrentStep} />}
        {currentStep === 5 && <T5SendToKitchen session={activeSession!} setCurrentStep={setCurrentStep} />}
        {currentStep === 6 && <T6ServeAndCheckout session={activeSession!} setCurrentStep={setCurrentStep} />}
        {currentStep === 7 && <T7LeaveTable session={activeSession!} setCurrentStep={setCurrentStep} />}
      </div>
    </div>
  );
}

// -----------------------------------------------------
// T1 - KHÁCH NGỒI
// -----------------------------------------------------
function T1GuestSeated({ table, createSession }: { table: Table, createSession: any }) {
  const [guests, setGuests] = useState<number>(table.capacity);

  const handleConfirm = () => {
    createSession(table.id, guests);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto">
      <div className="text-4xl mb-8 font-mono text-[var(--color-accent-blue)]">
        {formatTime(new Date())}
      </div>
      
      <div className="w-full bg-[var(--color-bg-surface)] p-8 rounded-2xl border border-[var(--color-border-main)] shadow-xl relative">
        <h3 className="text-center text-[var(--color-text-muted)] uppercase tracking-widest font-semibold mb-6">Chọn Số Khách</h3>
        
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[1,2,3,4,5,6,7,8,9,10].map(num => (
            <button
              key={num}
              onClick={() => setGuests(num)}
              className={cn(
                "aspect-square rounded-xl text-xl font-bold flex items-center justify-center transition-all active:scale-95",
                guests === num 
                  ? "bg-[var(--color-accent-gold)] text-black shadow-[0_0_15px_rgba(212,162,78,0.3)]" 
                  : "bg-[var(--color-border-main)]/50 text-white hover:bg-[var(--color-border-main)]"
              )}
            >
              {num}
            </button>
          ))}
        </div>

        <button 
          onClick={handleConfirm}
          className="w-full bg-[var(--color-accent-green)] hover:bg-[#25b589] text-black font-bold text-xl py-5 rounded-xl transition-all shadow-[0_4px_20px_rgba(45,212,160,0.2)] flex items-center justify-center gap-2"
        >
          ✓ XÁC NHẬN KHÁCH ĐÃ NGỒI
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// T2 - ORDER LẦN ĐẦU
// -----------------------------------------------------
function T2InitialOrder({ session }: { session: any }) {
  const { menu, updateSession, updateTable } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('Pizza');
  const categories = Array.from(new Set(menu.map(m => m.category)));

  // Local state for initial order builder
  const [cart, setCart] = useState<{menuItem: any, qty: number}[]>([]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(p => p.menuItem.id === item.id);
      if (existing) return prev.map(p => p.menuItem.id === item.id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { menuItem: item, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.menuItem.id === id) {
        const newQty = Math.max(0, p.qty + delta);
        return { ...p, qty: newQty };
      }
      return p;
    }).filter(p => p.qty > 0));
  };

  const totalAmount = cart.reduce((acc, item) => acc + (item.menuItem.price * item.qty), 0);

  const confirmOrder = () => {
    if (cart.length === 0) return;
    
    const formattedItems = cart.map(c => ({
      id: `item_${Date.now()}_${Math.random()}`,
      menuItem: c.menuItem,
      quantity: c.qty,
      isUpsold: false
    }));

    updateSession(session.id, {
      items: formattedItems,
      timeline: { ...session.timeline, T2_OrderEnd: Date.now() },
    });
    updateTable(session.tableId, { status: 'DA_ORDER' });
  };

  return (
    <div className="flex h-full gap-6">
      {/* Menu Area */}
      <div className="flex-1 flex flex-col bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] overflow-hidden">
        {/* Category Tabs */}
        <div className="flex overflow-x-auto p-4 gap-2 border-b border-[var(--color-border-main)] custom-scrollbar shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-6 py-2.5 rounded-full whitespace-nowrap font-medium text-sm transition-all",
                selectedCategory === cat 
                  ? "bg-[var(--color-accent-gold)] text-black" 
                  : "bg-[var(--color-border-main)]/50 text-[var(--color-text-muted)] hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {menu.filter(m => m.category === selectedCategory).map(item => (
              <div 
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-[var(--color-bg-main)] border border-[var(--color-border-main)] p-4 rounded-xl flex flex-col justify-between cursor-pointer active:scale-95 transition-all hover:border-[var(--color-accent-gold)]/50 group"
              >
                <div>
                  <h4 className="font-bold text-white text-lg leading-tight mb-2 group-hover:text-[var(--color-accent-gold)] transition-colors">{item.displayName}</h4>
                  <p className="text-[var(--color-accent-gold)] font-mono">{new Intl.NumberFormat('vi-VN').format(item.price)}đ</p>
                </div>
                <div className="mt-4 flex justify-between items-center text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wider">
                  <span className="bg-[var(--color-border-main)] px-2 py-1 rounded">Bếp {item.station}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Area */}
      <div className="w-[380px] bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] flex flex-col overflow-hidden shrink-0">
        <div className="p-4 bg-[var(--color-border-main)]/30 border-b border-[var(--color-border-main)]">
           <h3 className="font-bold text-white tracking-widest uppercase">Order Ban Đầu</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] italic">
              Chưa có món nào
            </div>
          ) : (
            cart.map(item => (
              <div key={item.menuItem.id} className="flex items-center justify-between bg-[var(--color-bg-main)] p-3 rounded-lg border border-[var(--color-border-main)]/50">
                <div className="flex-1 pr-3 overflow-hidden">
                  <div className="font-semibold text-white truncate">{item.menuItem.displayName}</div>
                  <div className="text-[var(--color-text-muted)] text-sm">{new Intl.NumberFormat('vi-VN').format(item.menuItem.price)}đ</div>
                </div>
                <div className="flex items-center gap-3 bg-[var(--color-bg-surface)] rounded-lg p-1 border border-[var(--color-border-main)] shrink-0">
                  <button onClick={() => updateQty(item.menuItem.id, -1)} className="w-8 h-8 flex items-center justify-center text-white bg-[var(--color-border-main)] rounded-md hover:bg-[var(--color-accent-red)] transition-colors">-</button>
                  <span className="w-4 text-center font-bold">{item.qty}</span>
                  <button onClick={() => updateQty(item.menuItem.id, 1)} className="w-8 h-8 flex items-center justify-center text-white bg-[var(--color-border-main)] rounded-md hover:bg-[var(--color-accent-green)] transition-colors text-black">+</button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-[var(--color-border-main)] bg-[var(--color-bg-main)]">
          <div className="flex justify-between items-end mb-4">
             <span className="text-[var(--color-text-muted)] font-medium uppercase tracking-wider text-sm">Tổng cộng</span>
             <span className="text-3xl font-bold text-white">{new Intl.NumberFormat('vi-VN').format(totalAmount)}<span className="text-lg text-[var(--color-accent-gold)] ml-1">đ</span></span>
          </div>
          <button 
            onClick={confirmOrder}
            disabled={cart.length === 0}
            className="w-full py-4 rounded-xl font-bold text-lg bg-[var(--color-accent-gold)] text-black hover:bg-[#c09142] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider flex items-center justify-center gap-2"
          >
            Xác Nhận Order Đầu →
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// T3 - UPSELL
// -----------------------------------------------------
function T3Upsell({ session, setCurrentStep }: { session: any, setCurrentStep: any }) {
  const { menu, updateSession } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('Salad');
  const categories = Array.from(new Set(menu.map(m => m.category)));
  const [activeUpsell, setActiveUpsell] = useState<any | null>(null);

  const handleUpsellDecision = (result: 'TC' | 'TChối', reason?: string) => {
    if (!activeUpsell) return;
    
    const attempt = {
      id: `upsell_${Date.now()}`,
      dishId: activeUpsell.id,
      dishName: activeUpsell.displayName,
      result,
      reason,
      timestamp: Date.now(),
      staffId: session.openedByStaffId
    };

    let newItems = session.items || [];
    if (result === 'TC') {
      newItems = [...newItems, {
        id: `item_${Date.now()}`,
        menuItem: activeUpsell,
        quantity: 1,
        isUpsold: true
      }];
    }

    updateSession(session.id, {
      upsellAttempts: [...(session.upsellAttempts || []), attempt],
      items: newItems
    });
    
    setActiveUpsell(null);
  };

  const endUpsell = () => {
    updateSession(session.id, {
      timeline: { ...session.timeline, T3_UpsellEnd: Date.now() },
    });
    setCurrentStep(4);
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-5xl mx-auto">
       <div className="bg-[var(--color-bg-surface)] p-4 rounded-xl border border-[var(--color-border-main)] flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-white text-lg">Tư Vấn Thêm (Upsell)</h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Gợi ý đồ uống, món phụ hoặc món tráng miệng.</p>
          </div>
          <button 
            onClick={endUpsell}
            className="px-6 py-3 bg-[var(--color-border-main)] text-white hover:bg-[var(--color-border-main)]/80 rounded-xl font-bold transition-colors"
          >
            Xong, Chuyển Sang Chốt Order →
          </button>
       </div>

       <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Menu Selection */}
          <div className="flex-[2] flex flex-col bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] overflow-hidden">
            <div className="flex overflow-x-auto p-4 gap-2 border-b border-[var(--color-border-main)] custom-scrollbar shrink-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-6 py-2.5 rounded-full whitespace-nowrap font-medium text-sm transition-all",
                    selectedCategory === cat ? "bg-[var(--color-accent-gold)] text-black" : "bg-[var(--color-border-main)]/50 text-[var(--color-text-muted)] hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {menu.filter(m => m.category === selectedCategory).map(item => (
                  <div 
                    key={item.id}
                    onClick={() => setActiveUpsell(item)}
                    className="bg-[var(--color-bg-main)] border border-[var(--color-border-main)] p-4 rounded-xl flex flex-col justify-between cursor-pointer active:scale-95 transition-all hover:border-[var(--color-accent-gold)]/50"
                  >
                    <div>
                      <h4 className="font-bold text-white text-lg leading-tight mb-2">{item.displayName}</h4>
                      <p className="text-[var(--color-accent-gold)] font-mono">{new Intl.NumberFormat('vi-VN').format(item.price)}đ</p>
                    </div>
                    <div className="mt-4 text-right">
                       <span className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wider bg-[var(--color-border-main)] px-2 py-1 rounded">Chạm để gợi ý</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upsell History Area */}
          <div className="flex-1 bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
             <h4 className="font-bold text-[var(--color-text-muted)] uppercase tracking-widest text-sm mb-2 shrink-0">Lịch Sử Quá Trình</h4>
             {session.upsellAttempts?.map((u: any, idx: number) => (
                <div key={idx} className="bg-[var(--color-bg-main)] border border-[var(--color-border-main)] p-3 rounded-lg flex justify-between items-center">
                   <div>
                     <p className="text-sm font-semibold text-white">{u.dishName}</p>
                     {u.result === 'TC' 
                       ? <p className="text-xs text-[var(--color-accent-green)] mt-1">Thành công</p>
                       : <p className="text-xs text-[var(--color-accent-red)] mt-1">Từ chối: {u.reason}</p>
                     }
                   </div>
                </div>
             ))}
             {(session.upsellAttempts?.length === 0 || !session.upsellAttempts) && (
               <div className="text-[var(--color-text-muted)] text-sm italic text-center mt-10">Chưa có gợi ý nào</div>
             )}
          </div>
       </div>

       {/* Modal Decision */}
       {activeUpsell && (
         <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
           <div className="bg-[var(--color-bg-surface)] p-8 rounded-2xl border border-[var(--color-border-main)] w-full max-w-lg shadow-2xl">
             <h3 className="text-center text-[var(--color-text-muted)] uppercase font-semibold mb-2">Gợi ý món</h3>
             <h2 className="text-center text-3xl font-bold text-white mb-2">{activeUpsell.displayName}</h2>
             <p className="text-center text-[var(--color-accent-gold)] text-xl font-mono mb-8">{new Intl.NumberFormat('vi-VN').format(activeUpsell.price)}đ</p>
             
             <p className="text-center text-lg text-white mb-6">Khách hàng phản hồi?</p>
             
             <div className="flex gap-4 mb-4">
                <button onClick={() => handleUpsellDecision('TC')} className="flex-1 bg-[var(--color-accent-green)] hover:bg-[#25b589] text-black font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2">
                  ✓ ĐỒNG Ý
                </button>
             </div>
             
             <div className="border-t border-[var(--color-border-main)] my-6 relative">
                 <span className="absolute left-1/2 -top-3 -translate-x-1/2 bg-[var(--color-bg-surface)] px-4 text-sm text-[var(--color-text-muted)] font-medium">Hoặc khách từ chối</span>
             </div>

             <div className="grid grid-cols-2 gap-3">
                {['Đã gọi quá nhiều', 'Giá đắt', 'Không hợp khẩu vị', 'Đang vội', 'Không muốn thử', 'Khác'].map(reason => (
                  <button 
                    key={reason}
                    onClick={() => handleUpsellDecision('TChối', reason)}
                    className="bg-[var(--color-border-main)] hover:bg-[var(--color-border-main)]/70 text-white py-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    {reason}
                  </button>
                ))}
            </div>
            
            <button onClick={() => setActiveUpsell(null)} className="w-full mt-6 text-[var(--color-text-muted)] hover:text-white underline text-sm">Hủy bỏ</button>
           </div>
         </div>
       )}
    </div>
  );
}

// -----------------------------------------------------
// T4 - CHỐT ORDER CUỐI CÙNG
// -----------------------------------------------------
function T4FinalOrder({ session, setCurrentStep }: { session: any, setCurrentStep: any }) {
  const { updateSession } = useApp();

  const initialItems = session.items?.filter((i: any) => !i.isUpsold) || [];
  const upsoldItems = session.items?.filter((i: any) => i.isUpsold) || [];

  const initialTotal = initialItems.reduce((acc: number, item: any) => acc + (item.menuItem.price * item.quantity), 0);
  const upsellTotal = upsoldItems.reduce((acc: number, item: any) => acc + (item.menuItem.price * item.quantity), 0);
  const finalTotal = initialTotal + upsellTotal;
  const upsellPct = initialTotal > 0 ? ((upsellTotal / initialTotal) * 100).toFixed(1) : 0;

  const handleConfirm = () => {
    updateSession(session.id, {
      timeline: { ...session.timeline, T4_FinalConfirm: Date.now() }
    });
    setCurrentStep(5);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
       <div className="w-full bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] shadow-xl overflow-hidden flex flex-col">
          <div className="p-6 bg-[var(--color-border-main)]/30 border-b border-[var(--color-border-main)] text-center">
            <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Tổng Hợp Order</h2>
          </div>
          
          <div className="p-8 flex-1 overflow-y-auto custom-scrollbar font-mono text-lg">
             <p className="text-[var(--color-text-muted)] font-bold mb-4">ORDER BAN ĐẦU:</p>
             <div className="space-y-2 mb-8 ml-4">
                {initialItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-[var(--color-text-main)]">
                    <span>- {item.menuItem.displayName} ×{item.quantity}</span>
                    <span>{new Intl.NumberFormat('vi-VN').format(item.menuItem.price * item.quantity)}</span>
                  </div>
                ))}
             </div>

             {upsoldItems.length > 0 && (
               <>
                 <p className="text-[var(--color-accent-green)] font-bold mb-4">UPSELL THÀNH CÔNG:</p>
                 <div className="space-y-2 mb-8 ml-4">
                    {upsoldItems.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-[var(--color-accent-green)]">
                        <span>+ {item.menuItem.displayName} ×{item.quantity} <span className="text-white ml-2">✓</span></span>
                        <span>{new Intl.NumberFormat('vi-VN').format(item.menuItem.price * item.quantity)}</span>
                      </div>
                    ))}
                 </div>
               </>
             )}

             <div className="my-6 border-t border-dashed border-[var(--color-border-main)]"></div>

             <div className="space-y-3">
               <div className="flex justify-between items-center text-[var(--color-text-muted)]">
                  <span>TỔNG BAN ĐẦU:</span>
                  <span>{new Intl.NumberFormat('vi-VN').format(initialTotal)}</span>
               </div>
               <div className="flex justify-between items-center text-[var(--color-accent-green)]">
                  <span>UPSELL THÊM:</span>
                  <span>+{new Intl.NumberFormat('vi-VN').format(upsellTotal)}</span>
               </div>
               <div className="flex justify-between items-center text-3xl font-bold text-white mt-4 pt-4 border-t border-[var(--color-border-main)]">
                  <span>TỔNG CUỐI:</span>
                  <span className="text-[var(--color-accent-gold)]">{new Intl.NumberFormat('vi-VN').format(finalTotal)}đ</span>
               </div>
               {upsellTotal > 0 && (
                 <div className="flex justify-between items-center text-sm text-[var(--color-accent-green)] mt-2">
                    <span>TĂNG THÊM:</span>
                    <span>+{upsellPct}% 📈</span>
                 </div>
               )}
             </div>
          </div>

          <div className="p-6 bg-[var(--color-bg-main)]">
            <button 
              onClick={handleConfirm}
              className="w-full bg-[var(--color-accent-green)] hover:bg-[#25b589] text-black font-bold text-xl py-5 rounded-xl transition-all shadow-[0_4px_20px_rgba(45,212,160,0.2)] flex items-center justify-center gap-2"
            >
              ✓ CHỐT ORDER — GỬI BẾP →
            </button>
          </div>
       </div>
    </div>
  );
}

// -----------------------------------------------------
// T5 - GỬI VÀO BẾP
// -----------------------------------------------------
function T5SendToKitchen({ session, setCurrentStep }: { session: any, setCurrentStep: any }) {
  const { updateSession, updateTable } = useApp();

  const handleSend = () => {
    updateSession(session.id, {
      timeline: { ...session.timeline, T5_SendToKitchen: Date.now() }
    });
    updateTable(session.tableId, { status: 'DANG_PHUC_VU' });
    setCurrentStep(6);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto">
      <div className="w-full bg-[var(--color-bg-surface)] p-12 rounded-2xl border border-[var(--color-border-main)] shadow-xl flex flex-col items-center">
        <h3 className="text-[var(--color-text-muted)] uppercase tracking-widest font-semibold mb-8">Danh sách cần chuẩn bị</h3>
        
        <div className="w-full space-y-3 mb-10 overflow-y-auto max-h-[40vh] custom-scrollbar pr-2">
          {session.items?.map((item: any) => (
             <div key={item.id} className="flex justify-between items-center p-4 bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-lg">
                <span className="font-bold text-lg text-white">{item.quantity}x {item.menuItem.displayName}</span>
                <span className="text-xs bg-[var(--color-border-main)] px-2 py-1 rounded text-[var(--color-text-muted)] font-mono">BẾP {item.menuItem.station}</span>
             </div>
          ))}
        </div>

        <button 
          onClick={handleSend}
          className="w-full bg-[var(--color-accent-orange)] hover:bg-[#d68335] text-white font-bold text-2xl py-6 rounded-xl transition-all shadow-[0_4px_20px_rgba(240,148,60,0.3)] flex items-center justify-center gap-3 animate-pulse"
        >
          🔥 GỬI VÀO BẾP
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// T6A / T6B - RA MÓN / CHECKOUT
// -----------------------------------------------------
function T6ServeAndCheckout({ session, setCurrentStep }: { session: any, setCurrentStep: any }) {
  const { updateSession, updateTable } = useApp();

  const handleServe = (itemId: string) => {
    const updatedItems = session.items.map((i: any) => {
      if (i.id === itemId) return { ...i, servedAt: Date.now() };
      return i;
    });
    
    // Check if this is first or last dish
    const servedItems = updatedItems.filter((i: any) => i.servedAt);
    let timelineUpdates = { ...session.timeline };
    
    if (servedItems.length === 1) {
      timelineUpdates.T6A_FirstDish = Date.now();
    }
    if (servedItems.length === updatedItems.length) {
      timelineUpdates.T6A_LastDish = Date.now();
    }

    updateSession(session.id, {
      items: updatedItems,
      timeline: timelineUpdates
    });
  };

  const allServed = session.items?.every((i: any) => i.servedAt);

  const startCheckout = () => {
    updateSession(session.id, {
      timeline: { ...session.timeline, T6B_Checkout: Date.now() }
    });
    updateTable(session.tableId, { status: 'CHECKOUT' });
    setCurrentStep(7);
  };

  return (
    <div className="flex flex-col h-full gap-6 w-full max-w-2xl mx-auto">
       <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border-main)] overflow-hidden flex flex-col flex-1 shadow-lg">
          <h3 className="text-[var(--color-text-muted)] uppercase tracking-widest font-semibold mb-6 shrink-0">Trạng Thái Ra Món</h3>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {session.items?.map((item: any) => {
               const isServed = !!item.servedAt;
               return (
                 <div key={item.id} className={cn(
                   "flex justify-between items-center p-4 border rounded-xl transition-all",
                   isServed ? "bg-[var(--color-bg-main)] border-[var(--color-accent-green)]/30 opacity-70" : "bg-[var(--color-bg-main)] border-[var(--color-border-main)] shadow-sm"
                 )}>
                    <div>
                      <div className="font-bold text-lg text-white">{item.quantity}x {item.menuItem.displayName}</div>
                      {isServed && <div className="text-xs mt-1 text-[var(--color-accent-green)]">✓ Đã ra lúc {formatTime(new Date(item.servedAt))}</div>}
                    </div>
                    {!isServed ? (
                      <button 
                         onClick={() => handleServe(item.id)}
                         className="px-6 py-3 bg-[var(--color-border-main)] hover:bg-[var(--color-accent-green)] hover:text-black font-semibold rounded-lg transition-colors text-white text-sm flex items-center gap-2"
                      >
                         🍽️ Ra Món
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[var(--color-accent-green)]/20 flex items-center justify-center text-[var(--color-accent-green)]">
                        ✓
                      </div>
                    )}
                 </div>
               )
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--color-border-main)] shrink-0">
             <button 
                onClick={startCheckout}
                className="w-full bg-[var(--color-accent-red)] hover:bg-[#d44848] text-white font-bold text-xl py-5 rounded-xl transition-all shadow-[0_4px_20px_rgba(240,96,96,0.3)] flex items-center justify-center gap-3"
             >
                💳 KHÁCH GỌI THANH TOÁN
             </button>
          </div>
       </div>
    </div>
  );
}

// -----------------------------------------------------
// T7 - KHÁCH RỜI BÀN
// -----------------------------------------------------
function T7LeaveTable({ session, setCurrentStep }: { session: any, setCurrentStep: any }) {
  const { completeSession } = useApp();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<any>(null);

  const calculateMinutes = (startAt: number | null, endAt: number | null) => {
    if (!startAt || !endAt) return 0;
    return Math.round((endAt - startAt) / 60000);
  };

  const handleFinish = () => {
    if (!paymentMethod) {
      alert("Vui lòng chọn hình thức thanh toán.");
      return;
    }
    completeSession(session.id);
    navigate('/live-entry');
  };

  const initialItems = session.items?.filter((i: any) => !i.isUpsold) || [];
  const upsoldItems = session.items?.filter((i: any) => i.isUpsold) || [];
  const initialTotal = initialItems.reduce((acc: number, item: any) => acc + (item.menuItem.price * item.quantity), 0);
  const upsellTotal = upsoldItems.reduce((acc: number, item: any) => acc + (item.menuItem.price * item.quantity), 0);
  const total = initialTotal + upsellTotal;
  const pct = initialTotal > 0 ? ((upsellTotal / initialTotal) * 100).toFixed(1) : 0;

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto py-8">
       <div className="w-full bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] shadow-xl overflow-hidden flex flex-col mb-8">
          <div className="p-6 bg-[var(--color-accent-green)]/10 border-b border-[var(--color-border-main)] text-center">
            <h2 className="text-xl font-bold text-[var(--color-accent-green)] uppercase">✅ Phiên Hoàn Thành</h2>
          </div>
          
          <div className="p-8 flex-1 font-mono text-sm text-[var(--color-text-main)] space-y-6">
             <div className="bg-[var(--color-bg-main)] p-4 rounded-lg border border-[var(--color-border-main)] text-center">
                <p className="text-2xl font-bold text-white mb-1">{new Intl.NumberFormat('vi-VN').format(total)}đ</p>
                <p className="text-[var(--color-accent-gold)]">Upsell: +{new Intl.NumberFormat('vi-VN').format(upsellTotal)}đ (+{pct}%)</p>
             </div>

             <div className="grid grid-cols-2 gap-4 border-b border-[var(--color-border-main)] pb-6 mt-6">
                <div>
                  <p className="text-[var(--color-text-muted)] mb-1 uppercase text-[10px]">TỔNG THỜI GIAN</p>
                  <p className="text-xl font-bold">{calculateMinutes(session.timeline.T1_Seated, Date.now())} phút</p>
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)] mb-1 uppercase text-[10px]">BẾP NẤU</p>
                  <p className="text-xl font-bold text-[var(--color-accent-blue)]">{calculateMinutes(session.timeline.T5_SendToKitchen, session.timeline.T6A_FirstDish)} phút</p>
                </div>
             </div>

             <div>
               <p className="font-bold mb-3 text-[var(--color-text-muted)]">HÌNH THỨC THANH TOÁN:</p>
               <div className="grid grid-cols-2 gap-3">
                  {['Tiền Mặt', 'Thẻ NCB', 'VietQR', 'Voucher'].map(pm => (
                    <button 
                      key={pm}
                      onClick={() => setPaymentMethod(pm)}
                      className={cn(
                        "py-4 rounded-xl font-bold text-center border-2 transition-all active:scale-95",
                        paymentMethod === pm ? "border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)]" : "border-[var(--color-border-main)] bg-[var(--color-bg-main)] hover:border-[var(--color-border-main)]/80 text-white"
                      )}
                    >
                      {pm}
                    </button>
                  ))}
               </div>
             </div>
          </div>
       </div>

       <button 
          onClick={handleFinish}
          className="w-full max-w-sm bg-[var(--color-accent-green)] hover:bg-[#25b589] text-black font-bold text-xl py-5 rounded-xl transition-all shadow-[0_4px_20px_rgba(45,212,160,0.2)] flex items-center justify-center gap-2"
       >
          🚪 KHÁCH ĐÃ RỜI BÀN
       </button>
    </div>
  );
}


