import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Table, MenuItem, OrderSession, SessionItem } from '../types';
import { mockUsers, mockMenu, generateMockTables } from '../data/mockData';
import { DashboardMetrics } from '../lib/posDataParser';

interface AppState {
  currentUser: User | null;
  users: User[];
  menu: MenuItem[];
  tables: Table[];
  sessions: OrderSession[];
  dashboardMetrics: DashboardMetrics | null;
}

interface AppContextType extends AppState {
  login: (userId: string, pin: string) => boolean;
  logout: () => void;
  updateTable: (tableId: number, updates: Partial<Table>) => void;
  createSession: (tableId: number, guestCount: number) => OrderSession;
  updateSession: (sessionId: string, updates: Partial<OrderSession>) => void;
  addItem: (tableId: number, item: MenuItem, isUpsold?: boolean) => void;
  updatePendingItemQty: (tableId: number, itemId: string, delta: number) => void;
  removePendingItem: (tableId: number, itemId: string) => void;
  sendRoundToKitchen: (tableId: number) => void;
  serveItem: (tableId: number, itemId: string) => void;
  cancelItem: (tableId: number, itemId: string, reason: string) => void;
  recordUpsellAttempt: (tableId: number, attempt: { menuItemId: string, result: 'TC' | 'TChối', reason?: string }) => void;
  checkoutSession: (tableId: number, paymentMethod: 'Tiền Mặt' | 'Thẻ NCB' | 'VietQR' | 'Voucher') => void;
  setDashboardMetrics: (metrics: DashboardMetrics) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Loading state from localStorage
  const [users] = useState<User[]>(mockUsers);
  const [menu] = useState<MenuItem[]>(mockMenu);
  
  const [tables, setTables] = useState<Table[]>(() => {
    const saved = localStorage.getItem('brasserie_tables');
    return saved ? JSON.parse(saved) : generateMockTables();
  });
  
  const [sessions, setSessions] = useState<OrderSession[]>(() => {
    const saved = localStorage.getItem('brasserie_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(() => {
    const saved = localStorage.getItem('brasserie_metrics');
    return saved ? JSON.parse(saved) : null;
  });

  // Save to localStorage when tables/sessions/metrics change
  useEffect(() => {
    localStorage.setItem('brasserie_tables', JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem('brasserie_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (dashboardMetrics) {
      localStorage.setItem('brasserie_metrics', JSON.stringify(dashboardMetrics));
    }
  }, [dashboardMetrics]);

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

  // Session Logic
  const createSession = (tableId: number, guestCount: number) => {
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
          id: `log_${Date.now()}`,
          time: Date.now(),
          staffId: currentUser?.id || 'UNKNOWN',
          staffName: currentUser?.name || 'UNKNOWN',
          action: 'OPEN_TABLE',
          details: `Mở bàn cho ${guestCount} khách`
        }
      ]
    };
    
    setSessions(prev => [...prev, newSession]);
    updateTable(tableId, { status: 'DA_NGOI', currentSessionId: newSession.id });
    return newSession;
  };

  const updateSession = (sessionId: string, updates: Partial<OrderSession>) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updates } : s));
  };

  // --- Table Hub Actions ---

  const addItem = (tableId: number, item: MenuItem, isUpsold: boolean = false) => {
    if (!item?.id) return;
    setSessions(prev => prev.map(s => {
      if (s.tableId === tableId && s.status === 'ACTIVE') {
        const items = s.items || [];
        const existingItemIndex = items.findIndex(i => 
          i.status === 'PENDING' && 
          i.menuItem?.id === item.id && 
          i.isUpsold === isUpsold
        );
        
        let newItems: SessionItem[];
        if (existingItemIndex >= 0) {
           newItems = items.map((it, idx) => 
             idx === existingItemIndex ? { ...it, quantity: (it.quantity || 0) + 1 } : it
           );
        } else {
            const newItem: SessionItem = {
              id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              menuItem: item,
              quantity: 1,
              isUpsold,
              status: 'PENDING',
              round: s.currentRound || 1
            };
            newItems = [...items, newItem];
        }

        const newLog = {
          id: `log_${Date.now()}`,
          time: Date.now(),
          staffId: currentUser?.id || 'UNKNOWN',
          staffName: currentUser?.name || 'UNKNOWN',
          action: 'ADD_ITEM' as const,
          details: `Thêm món/Tăng SL: ${item.displayName}`
        };

        return {
          ...s,
          items: newItems,
          eventLogs: Array.isArray(s.eventLogs) ? [...s.eventLogs, newLog] : [newLog]
        };
      }
      return s;
    }));
  };

  const updatePendingItemQty = (tableId: number, itemId: string, delta: number) => {
    setSessions(prev => prev.map(s => {
      if (s.tableId === tableId && s.status === 'ACTIVE') {
        const item = s.items.find(i => i.id === itemId);
        if (item && item.status === 'PENDING') {
          const newQty = Math.max(1, item.quantity + delta);
          return {
            ...s,
            items: s.items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i)
          };
        }
      }
      return s;
    }));
  };

  const removePendingItem = (tableId: number, itemId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.tableId === tableId && s.status === 'ACTIVE') {
        return {
          ...s,
          items: s.items.filter(i => !(i.id === itemId && i.status === 'PENDING'))
        };
      }
      return s;
    }));
  };

  const sendRoundToKitchen = (tableId: number) => {
    setSessions(prev => prev.map(s => {
      if (s.tableId === tableId && s.status === 'ACTIVE') {
        const pendingItemsCount = s.items.filter(i => i.status === 'PENDING').length;
        if (pendingItemsCount === 0) return s;

        const updatedItems = s.items.map(i => i.status === 'PENDING' ? { ...i, status: 'SENT' as const, sentAt: Date.now() } : i);
        const newLog = {
          id: `log_${Date.now()}`,
          time: Date.now(),
          staffId: currentUser?.id || 'UNKNOWN',
          staffName: currentUser?.name || 'UNKNOWN',
          action: 'SEND_KITCHEN',
          details: `Gửi ${pendingItemsCount} món vào bếp lần ${s.currentRound}`
        };
        return {
          ...s,
          items: updatedItems,
          currentRound: s.currentRound + 1,
          eventLogs: [...s.eventLogs, newLog]
        };
      }
      return s;
    }));
    updateTable(tableId, { status: 'DANG_PHUC_VU' });
  };

  const serveItem = (tableId: number, itemId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.tableId === tableId && s.status === 'ACTIVE') {
        const item = s.items.find(i => i.id === itemId);
        if (!item || item.status !== 'SENT') return s;

        const updatedItems = s.items.map(i => i.id === itemId ? { ...i, status: 'SERVED' as const } : i);
        const newLog = {
          id: `log_${Date.now()}`,
          time: Date.now(),
          staffId: currentUser?.id || 'UNKNOWN',
          staffName: currentUser?.name || 'UNKNOWN',
          action: 'SERVE_ITEM',
          details: `Phục vụ món: ${item.menuItem.displayName}`
        };
        return {
          ...s,
          items: updatedItems,
          eventLogs: [...s.eventLogs, newLog]
        };
      }
      return s;
    }));
  };

  const cancelItem = (tableId: number, itemId: string, reason: string) => {
    setSessions(prev => prev.map(s => {
      if (s.tableId === tableId && s.status === 'ACTIVE') {
        const item = s.items.find(i => i.id === itemId);
        if (!item) return s;

        const updatedItems = s.items.map(i => i.id === itemId ? { ...i, status: 'CANCELED' as const, cancelReason: reason } : i);
        const newLog = {
          id: `log_${Date.now()}`,
          time: Date.now(),
          staffId: currentUser?.id || 'UNKNOWN',
          staffName: currentUser?.name || 'UNKNOWN',
          action: 'CANCEL_ITEM',
          details: `Hủy món ${item.menuItem.displayName}. Lý do: ${reason}`
        };
        return {
          ...s,
          items: updatedItems,
          eventLogs: [...s.eventLogs, newLog]
        };
      }
      return s;
    }));
  };

  const recordUpsellAttempt = (tableId: number, attempt: { menuItemId: string, result: 'TC' | 'TChối', reason?: string }) => {
    setSessions(prev => prev.map(s => {
      if (s.tableId === tableId && s.status === 'ACTIVE') {
        const item = menu.find(m => m.id === attempt.menuItemId);
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
          id: `log_${Date.now()}`,
          time: Date.now(),
          staffId: currentUser?.id || 'UNKNOWN',
          staffName: currentUser?.name || 'UNKNOWN',
          action: 'UPSELL_ATTEMPT',
          details: `Gợi ý ${item?.displayName || 'món'}: ${attempt.result === 'TC' ? 'Thành công' : 'Từ chối (' + attempt.reason + ')'}`
        };
        return {
          ...s,
          upsellAttempts: [...s.upsellAttempts, newAttempt],
          eventLogs: [...s.eventLogs, newLog]
        };
      }
      return s;
    }));
  };

  const checkoutSession = (tableId: number, paymentMethod: 'Tiền Mặt' | 'Thẻ NCB' | 'VietQR' | 'Voucher') => {
    setSessions(prev => prev.map(s => {
      if (s.tableId === tableId && s.status === 'ACTIVE') {
        const newLog = {
          id: `log_${Date.now()}`,
          time: Date.now(),
          staffId: currentUser?.id || 'UNKNOWN',
          staffName: currentUser?.name || 'UNKNOWN',
          action: 'CHECKOUT',
          details: `Thanh toán bằng ${paymentMethod}`
        };
        return {
          ...s,
          status: 'COMPLETED' as const,
          closedAt: Date.now(),
          paymentMethod,
          eventLogs: [...s.eventLogs, newLog]
        };
      }
      return s;
    }));
    updateTable(tableId, { status: 'TRONG', currentSessionId: null, lockedBy: null, lockedAt: null });
  };

  const value = React.useMemo(() => ({
    currentUser, users, menu, tables, sessions, dashboardMetrics,
    login, logout, updateTable, createSession, updateSession, 
    addItem, updatePendingItemQty, removePendingItem, sendRoundToKitchen, serveItem, cancelItem, recordUpsellAttempt, checkoutSession,
    setDashboardMetrics
  }), [currentUser, users, menu, tables, sessions, dashboardMetrics]);

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
