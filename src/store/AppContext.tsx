import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { User, Table, OrderSession, SessionItem } from '../types';
import { MenuItemFull, POSBatch } from '../types/store';
import { mockUsers, generateMockTables } from '../data/mockData';
import { dataStore, db } from '../services/dataStore';

import { toast } from '../components/ui/Toast';

interface AppState {
  currentUser: User | null;
  users: User[];
  menu: MenuItemFull[];
  tables: Table[];
  sessions: OrderSession[];
  posBatches: POSBatch[];
  posAggregateByPosCode: Map<string, { qty: number; revenue: number; productName: string; isInCurrentMenu: boolean }>;
  isReady: boolean;
}

interface AppContextType extends AppState {
  login: (userId: string, pin: string) => boolean;
  logout: () => void;
  updateTable: (tableId: number, updates: Partial<Table>) => void;
  createSession: (tableId: number, guestCount: number) => Promise<OrderSession>;
  updateSession: (sessionId: string, updates: Partial<OrderSession>) => Promise<void>;
  addItem: (tableId: number, item: MenuItemFull, isUpsold?: boolean) => Promise<void>;
  updatePendingItemQty: (tableId: number, itemId: string, delta: number) => Promise<void>;
  removePendingItem: (tableId: number, itemId: string) => Promise<void>;
  sendRoundToKitchen: (tableId: number) => Promise<void>;
  serveItem: (tableId: number, itemId: string) => Promise<void>;
  cancelItem: (tableId: number, itemId: string, reason: string) => Promise<void>;
  recordUpsellAttempt: (tableId: number, attempt: { menuItemId: string, result: 'TC' | 'TChối', reason?: string }) => Promise<void>;
  checkoutSession: (tableId: number, paymentMethod: 'Tiền Mặt' | 'Thẻ NCB' | 'VietQR' | 'Voucher') => Promise<void>;
  setMenu: (menu: MenuItemFull[]) => Promise<void>;
  clearMenu: () => Promise<void>;
  toggleMenuItemActive: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isTablesLoaded, setIsTablesLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users] = useState<User[]>(mockUsers);
  
  const [tables, setTables] = useState<Table[]>([]);

  // Dexie live queries
  const _sessions = useLiveQuery(() => db.live_sessions.toArray());
  const _menu = useLiveQuery(() => db.menu_items.toArray());
  const _posBatches = useLiveQuery(() => db.pos_batches.toArray());

  const sessions = _sessions || [];
  const menu = _menu || [];
  const posBatches = _posBatches || [];

  const isReady = isTablesLoaded && _sessions !== undefined && _menu !== undefined && _posBatches !== undefined;

  const posAggregateByPosCode = useMemo(() => {
    const map = new Map();
    const menuPosCodes = new Set(menu.map(m => m.posCode));
    
    for (const batch of posBatches) {
      for (const detail of batch.details) {
        // Strip S3P prefix if any
        const cleanCode = String(detail.productId).replace(/^S\d+P/, '').trim();
        const cat = String(detail.category || '');
        // ONLY count Food items
        if (!cat.includes('Food') && !cat.startsWith('1.')) continue;
        
        if (!map.has(cleanCode)) {
          map.set(cleanCode, {
            qty: 0, revenue: 0, productName: detail.productName,
            isInCurrentMenu: menuPosCodes.has(cleanCode)
          });
        }
        const cur = map.get(cleanCode)!;
        cur.qty += Number(detail.quantity) || 0;
        cur.revenue += Number(detail.finalAmount) || 0;
      }
    }
    return map;
  }, [posBatches, menu]);

  // Init tables on mount
  useEffect(() => {
    const initApp = async () => {
      const savedTables = await dataStore.getSetting('brasserie_tables');
      if (savedTables) {
        setTables(savedTables);
      } else {
        const defaultTables = generateMockTables();
        setTables(defaultTables);
        await dataStore.setSetting('brasserie_tables', defaultTables);
      }
      setIsTablesLoaded(true);
    };
    initApp();
  }, []);

  // Save tables changes to DB Setting
  useEffect(() => {
    if (isReady) {
      dataStore.setSetting('brasserie_tables', tables);
    }
  }, [tables, isReady]);

  // Auth
  const login = (userId: string, pin: string) => {
    const user = users.find(u => u.id === userId && u.pin === pin);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  // Table Logic
  const updateTable = (tableId: number, updates: Partial<Table>) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...updates } : t));
  };

  // Session Management
  const createSession = async (tableId: number, guestCount: number) => {
    try {
      const newSession: OrderSession = {
        id: `session_${Date.now()}`,
        tableId,
        guestCount,
        status: 'ACTIVE',
        openedAt: Date.now(),
        openedByStaffId: currentUser?.id || 'UNKNOWN',
        items: [],
        upsellAttempts: [],
        currentRound: 1,
        eventLogs: [
          {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            time: Date.now(),
            staffId: currentUser?.id || 'UNKNOWN',
            staffName: currentUser?.name || 'UNKNOWN',
            action: 'OPEN_TABLE',
            details: `Mở bàn cho ${guestCount} khách`
          }
        ]
      };
      
      await dataStore.addSession(newSession);
      updateTable(tableId, { status: 'DA_NGOI', currentSessionId: newSession.id });
      return newSession;
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi tạo session.');
    }
  };

  const updateSession = async (sessionId: string, updates: Partial<OrderSession>) => {
    try {
      await dataStore.updateSession(sessionId, updates);
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi cập nhật session.');
    }
  };

  const getActiveSessionByTable = (tableId: number) => {
    return sessions.find(s => s.tableId === tableId && s.status === 'ACTIVE');
  };

  const addItem = async (tableId: number, item: MenuItemFull, isUpsold: boolean = false) => {
    if (!item?.posCode) return;
    const session = getActiveSessionByTable(tableId);
    if (!session) return;

    const items = session.items || [];
    const existingIndex = items.findIndex(i => 
      i.status === 'PENDING' && i.menuItem?.posCode === item.posCode && i.isUpsold === isUpsold
    );

    let newItems: SessionItem[];
    if (existingIndex >= 0) {
      newItems = items.map((it, idx) => idx === existingIndex ? { ...it, quantity: (it.quantity || 0) + 1 } : it);
    } else {
      const newItem: SessionItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        menuItem: item as any,
        quantity: 1,
        isUpsold,
        status: 'PENDING',
        round: session.currentRound || 1
      };
      newItems = [...items, newItem];
    }

    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      time: Date.now(),
      staffId: currentUser?.id || 'UNKNOWN',
      staffName: currentUser?.name || 'UNKNOWN',
      action: 'ADD_ITEM',
      details: `Thêm món/Tăng SL: ${item.displayName}`
    };

    await updateSession(session.id, {
      items: newItems,
      eventLogs: [...(session.eventLogs || []), newLog]
    });
  };

  const updatePendingItemQty = async (tableId: number, itemId: string, delta: number) => {
    const session = getActiveSessionByTable(tableId);
    if (!session) return;

    const newItems = session.items.map(i => {
      if (i.id === itemId && i.status === 'PENDING') {
        return { ...i, quantity: Math.max(1, i.quantity + delta) };
      }
      return i;
    });

    await updateSession(session.id, { items: newItems });
  };

  const removePendingItem = async (tableId: number, itemId: string) => {
    const session = getActiveSessionByTable(tableId);
    if (!session) return;
    const newItems = session.items.filter(i => !(i.id === itemId && i.status === 'PENDING'));
    await updateSession(session.id, { items: newItems });
  };

  const sendRoundToKitchen = async (tableId: number) => {
    const session = getActiveSessionByTable(tableId);
    if (!session) return;

    const pendingCount = session.items.filter(i => i.status === 'PENDING').length;
    if (pendingCount === 0) return;

    const updatedItems = session.items.map(i => i.status === 'PENDING' ? { ...i, status: 'SENT' as const, sentAt: Date.now() } : i);
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      time: Date.now(),
      staffId: currentUser?.id || 'UNKNOWN',
      staffName: currentUser?.name || 'UNKNOWN',
      action: 'SEND_KITCHEN',
      details: `Gửi ${pendingCount} món vào bếp lần ${session.currentRound}`
    };

    await updateSession(session.id, {
      items: updatedItems,
      currentRound: session.currentRound + 1,
      eventLogs: [...(session.eventLogs || []), newLog]
    });
    updateTable(tableId, { status: 'DANG_PHUC_VU' });
  };

  const serveItem = async (tableId: number, itemId: string) => {
    const session = getActiveSessionByTable(tableId);
    if (!session) return;

    const item = session.items.find(i => i.id === itemId);
    if (!item) return;

    const updatedItems = session.items.map(i => i.id === itemId ? { ...i, status: 'SERVED' as const } : i);
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      time: Date.now(),
      staffId: currentUser?.id || 'UNKNOWN',
      staffName: currentUser?.name || 'UNKNOWN',
      action: 'SERVE_ITEM',
      details: `Phục vụ món: ${item.menuItem.displayName}`
    };

    await updateSession(session.id, {
      items: updatedItems,
      eventLogs: [...(session.eventLogs || []), newLog]
    });
  };

  const cancelItem = async (tableId: number, itemId: string, reason: string) => {
    const session = getActiveSessionByTable(tableId);
    if (!session) return;
    
    const item = session.items.find(i => i.id === itemId);
    if (!item) return;

    const updatedItems = session.items.map(i => i.id === itemId ? { ...i, status: 'CANCELED' as const, cancelReason: reason } : i);
    const newLog = {
       id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
       time: Date.now(),
       staffId: currentUser?.id || 'UNKNOWN',
       staffName: currentUser?.name || 'UNKNOWN',
       action: 'CANCEL_ITEM',
       details: `Hủy món ${item.menuItem.displayName}. Lý do: ${reason}`
    };
    await updateSession(session.id, { items: updatedItems, eventLogs: [...(session.eventLogs || []), newLog] });
  };

  const recordUpsellAttempt = async (tableId: number, attempt: { menuItemId: string, result: 'TC' | 'TChối', reason?: string }) => {
    const session = getActiveSessionByTable(tableId);
    if (!session) return;

    const item = menu.find(m => m.posCode === attempt.menuItemId);
    const newAttempt = {
      id: `attempt_${Date.now()}`,
      staffId: currentUser?.id || 'UNKNOWN',
      staffName: currentUser?.name || 'UNKNOWN',
      menuItemId: attempt.menuItemId,
      result: attempt.result,
      reason: attempt.reason,
      timestamp: Date.now()
    };
    const newLog = {
       id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
       time: Date.now(),
       staffId: currentUser?.id || 'UNKNOWN',
       staffName: currentUser?.name || 'UNKNOWN',
       action: 'UPSELL_ATTEMPT',
       details: `Gợi ý ${item?.displayName || 'món'}: ${attempt.result === 'TC' ? 'Thành công' : 'Từ chối (' + attempt.reason + ')'}`
    };
    await updateSession(session.id, {
      upsellAttempts: [...(session.upsellAttempts || []), newAttempt],
      eventLogs: [...(session.eventLogs || []), newLog]
    });
  };

  const checkoutSession = async (tableId: number, paymentMethod: 'Tiền Mặt' | 'Thẻ NCB' | 'VietQR' | 'Voucher') => {
    const session = getActiveSessionByTable(tableId);
    if (!session) return;
    
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      time: Date.now(),
      staffId: currentUser?.id || 'UNKNOWN',
      staffName: currentUser?.name || 'UNKNOWN',
      action: 'CHECKOUT',
      details: `Thanh toán bằng ${paymentMethod}`
    };

    await updateSession(session.id, {
      status: 'COMPLETED',
      closedAt: Date.now(),
      paymentMethod,
      eventLogs: [...(session.eventLogs || []), newLog]
    } as Partial<OrderSession>);

    updateTable(tableId, { status: 'TRONG', currentSessionId: null, lockedBy: null, lockedAt: null });
  };

  const setMenu = async (newMenu: MenuItemFull[]) => {
    await dataStore.saveMenuItems(newMenu);
  };

  const clearMenu = async () => {
    try {
      await db.menu_items.clear();
      toast.success("Đã xóa toàn bộ menu thành công!");
    } catch (error) {
      console.error("Clear menu error:", error);
      toast.error("Không thể xóa menu. Vui lòng thử lại.");
    }
  };

  const toggleMenuItemActive = async (id: string) => {
    const item = menu.find(m => m.posCode === id);
    if (!item) return;
    // We update item in dexie
    await db.menu_items.update(item.posCode, { isActive: !item.isActive });
  };

  const value = useMemo(() => ({
    currentUser, users, menu, tables, sessions, isReady, posBatches, posAggregateByPosCode,
    login, logout, updateTable, createSession, updateSession, 
    addItem, updatePendingItemQty, removePendingItem, sendRoundToKitchen, serveItem, cancelItem, recordUpsellAttempt, checkoutSession,
    setMenu, clearMenu, toggleMenuItemActive
  }), [currentUser, users, menu, tables, sessions, isReady, posBatches, posAggregateByPosCode, clearMenu, setMenu, toggleMenuItemActive]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
