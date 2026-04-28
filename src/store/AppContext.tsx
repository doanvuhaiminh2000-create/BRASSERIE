import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Table, OrderSession, SessionItem } from '../types';
import { MenuItemFull, POSBatch } from '../types/store';
import { generateMockTables } from '../data/mockData';
import { dataStore } from '../services/dataStore';
import { supabase } from '../services/supabaseClient';
import { orderSessionFromDB, menuItemFromDB, posBatchFromDB } from '../services/mappers';
import { normalizePosCode } from '../lib/utils';
import { useAuth, UserProfile } from '../hooks/useAuth';
import { auditLogger } from '../services/auditLogger';

import { toast } from '../components/ui/Toast';

interface AppState {
  currentUser: UserProfile | null;
  menu: MenuItemFull[];
  tables: Table[];
  zones: string[];
  sessions: OrderSession[];
  posBatches: POSBatch[];
  posAggregateByPosCode: Map<string, { qty: number; revenue: number; productName: string; isInCurrentMenu: boolean }>;
  isReady: boolean;
}

interface AppContextType extends AppState {
  updateTable: (tableId: number, updates: Partial<Table>) => void;
  addTable: (table: Omit<Table, 'id' | 'status' | 'currentSessionId'>) => void;
  deleteTable: (tableId: number) => void;
  addZone: (name: string) => void;
  deleteZone: (name: string, deleteTables?: boolean) => void;
  renameZone: (oldName: string, newName: string) => void;
  createSession: (tableId: number, guestCount: number) => Promise<OrderSession | null>;
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
  const [tablesHydrated, setTablesHydrated] = useState(false);
  const auth = useAuth();
  const currentUser = auth.profile;
  
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<string[]>([]);

  const [sessions, setSessions] = useState<OrderSession[]>([]);
  const [menu, setMenuState] = useState<MenuItemFull[]>([]);
  const [posBatches, setPosBatches] = useState<POSBatch[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const isReady = !auth.loading && tablesHydrated && (!auth.profile || isDataLoaded);

  useEffect(() => {
    if (!auth.profile) return;

    let mounted = true;
    const loadData = async () => {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
        const [
          { data: sessionsData },
          { data: menuData },
          { data: batchesData }
        ] = await Promise.all([
          supabase.from('live_sessions').select('*').gte('opened_at', thirtyDaysAgo),
          supabase.from('menu_items').select('*'),
          supabase.from('pos_batches').select('*')
        ]);

        if (!mounted) return;

        if (sessionsData) setSessions(sessionsData.map(orderSessionFromDB));
        if (menuData) setMenuState(menuData.map(menuItemFromDB));
        if (batchesData) setPosBatches(batchesData.map(posBatchFromDB));
        
        setIsDataLoaded(true);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    
    loadData();

    const channel = supabase.channel('app_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => {
        supabase.from('live_sessions').select('*').gte('opened_at', new Date(Date.now() - 30 * 86400000).toISOString())
          .then(({ data }) => { if (mounted && data) setSessions(data.map(orderSessionFromDB)) });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        supabase.from('menu_items').select('*')
          .then(({ data }) => { if (mounted && data) setMenuState(data.map(menuItemFromDB)) });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_batches' }, () => {
        supabase.from('pos_batches').select('*')
          .then(({ data }) => { if (mounted && data) setPosBatches(data.map(posBatchFromDB)) });
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [auth.profile]);

  const posAggregateRaw = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number; productName: string }>();
    for (const batch of posBatches) {
      for (const detail of batch.details) {
        const cleanCode = normalizePosCode(detail.productId);
        if (!map.has(cleanCode)) {
          map.set(cleanCode, { qty: 0, revenue: 0, productName: detail.productName });
        }
        const cur = map.get(cleanCode)!;
        cur.qty += Number(detail.quantity) || 0;
        cur.revenue += Number(detail.finalAmount) || 0;
      }
    }
    return map;
  }, [posBatches]);

  const posAggregateByPosCode = useMemo(() => {
    const menuPosCodes = new Set(menu.map(m => m.posCode));
    const result = new Map();
    for (const [code, data] of posAggregateRaw) {
      result.set(code, { ...data, isInCurrentMenu: menuPosCodes.has(code) });
    }
    return result;
  }, [posAggregateRaw, menu]);

  // Init tables on mount
  useEffect(() => {
    const initApp = async () => {
      const savedTables = await dataStore.getSetting('brasserie_tables');
      const savedZones = await dataStore.getSetting('brasserie_zones');
      
      if (savedTables) {
        setTables(savedTables);
        if (savedZones) {
          setZones(savedZones);
        } else {
          // Backward compatibility: extract from tables
          const uniqueZones = Array.from(new Set(savedTables.map((t: Table) => t.zone)));
          setZones(uniqueZones as string[]);
        }
      } else {
        const defaultTables = generateMockTables();
        const uniqueZones = Array.from(new Set(defaultTables.map(t => t.zone)));
        setTables(defaultTables);
        setZones(uniqueZones);
        await dataStore.setSetting('brasserie_tables', defaultTables);
        await dataStore.setSetting('brasserie_zones', uniqueZones);
      }
      setTablesHydrated(true);
    };
    initApp();
  }, []);

  // Save tables changes to DB Setting
  useEffect(() => {
    if (tablesHydrated) {
      dataStore.setSetting('brasserie_tables', tables);
      dataStore.setSetting('brasserie_zones', zones);
    }
  }, [tables, zones, tablesHydrated]);

  // Table Logic
  const updateTable = (tableId: number, updates: Partial<Table>) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...updates } : t));
  };
  
  const addTable = (table: Omit<Table, 'id' | 'status' | 'currentSessionId'>) => {
    setTables(prev => {
      const maxId = prev.length > 0 ? Math.max(...prev.map(t => t.id)) : 0;
      return [...prev, { ...table, id: maxId + 1, status: 'TRONG', currentSessionId: null }];
    });
    auditLogger.log('Thêm bàn mới', { name: table.name, zone: table.zone });
  };

  const deleteTable = (tableId: number) => {
    setTables(prev => prev.filter(t => t.id !== tableId));
    auditLogger.log('Xóa bàn', { tableId });
  };

  const addZone = (name: string) => {
    setZones(prev => prev.includes(name) ? prev : [...prev, name]);
    auditLogger.log('Thêm khu vực', { name });
  };

  const deleteZone = (name: string, deleteTables: boolean = false) => {
    setZones(prev => prev.filter(z => z !== name));
    if (deleteTables) {
      setTables(prev => prev.filter(t => t.zone !== name));
    } else {
      // Default to moving to a "Chờ Sắp Xếp" zone or just leave them?
      // Better to move them to the first available zone if any
      setTables(prev => prev.map(t => t.zone === name ? { ...t, zone: zones.find(z => z !== name) || 'Mặc Định' } : t));
    }
    auditLogger.log('Xóa khu vực', { name, deleteTables });
  };

  const renameZone = (oldName: string, newName: string) => {
    setZones(prev => prev.map(z => z === oldName ? newName : z));
    setTables(prev => prev.map(t => t.zone === oldName ? { ...t, zone: newName } : t));
    auditLogger.log('Đổi tên khu vực', { oldName, newName });
  };

  // Session Management
  const createSession = async (tableId: number, guestCount: number): Promise<OrderSession | null> => {
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
      return null;
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
    try {
      const session = sessions.find(s => s.tableId === tableId && s.status === 'ACTIVE');
      if (!session) return;

      const newItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        menuItem: item,
        quantity: 1,
        isUpsold,
        status: 'PENDING',
        round: session.currentRound || 1
      };

      const newLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        time: Date.now(),
        staffId: currentUser?.id || 'UNKNOWN',
        staffName: currentUser?.name || 'UNKNOWN',
        action: 'ADD_ITEM',
        details: `Thêm món/Tăng SL: ${item.displayName}`
      };

      const { error } = await supabase.rpc('add_pending_item', {
        p_session_id: session.id,
        p_item: newItem,
        p_log: newLog
      });

      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast.error("Lỗi thêm món");
    }
  };

  const updatePendingItemQty = async (tableId: number, itemId: string, delta: number) => {
    try {
      const session = sessions.find(s => s.tableId === tableId && s.status === 'ACTIVE');
      if (!session) return;

      const { error } = await supabase.rpc('update_pending_item_qty', {
        p_session_id: session.id,
        p_item_id: itemId,
        p_delta: delta
      });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast.error("Lỗi cập nhật số lượng món");
    }
  };

  const removePendingItem = async (tableId: number, itemId: string) => {
    try {
      const session = sessions.find(s => s.tableId === tableId && s.status === 'ACTIVE');
      if (!session) return;

      const { error } = await supabase.rpc('remove_pending_item', {
        p_session_id: session.id,
        p_item_id: itemId
      });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast.error("Lỗi xóa món");
    }
  };

  const sendRoundToKitchen = async (tableId: number) => {
    try {
      const session = sessions.find(s => s.tableId === tableId && s.status === 'ACTIVE');
      if (!session) return;

      const pendingCount = session.items.filter(i => i.status === 'PENDING').length;
      if (pendingCount === 0) return;

      const newLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        time: Date.now(),
        staffId: currentUser?.id || 'UNKNOWN',
        staffName: currentUser?.name || 'UNKNOWN',
        action: 'SEND_KITCHEN',
        details: `Gửi ${pendingCount} món vào bếp lần ${session.currentRound}`
      };

      const { error } = await supabase.rpc('send_round_to_kitchen', {
        p_session_id: session.id,
        p_log: newLog,
        p_sent_at: Date.now()
      });
      
      if (error) throw error;
      updateTable(tableId, { status: 'DANG_PHUC_VU' });
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  const serveItem = async (tableId: number, itemId: string) => {
    try {
      const session = sessions.find(s => s.tableId === tableId && s.status === 'ACTIVE');
      if (!session) return;

      const item = session.items.find(i => i.id === itemId);
      if (!item) return;

      const newLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        time: Date.now(),
        staffId: currentUser?.id || 'UNKNOWN',
        staffName: currentUser?.name || 'UNKNOWN',
        action: 'SERVE_ITEM',
        details: `Phục vụ món: ${item.menuItem.displayName}`,
        targetItemId: itemId
      };

      const { error } = await supabase.rpc('serve_item', {
        p_session_id: session.id,
        p_item_id: itemId,
        p_log: newLog,
        p_served_at: Date.now()
      });

      if (error) throw error;
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  const cancelItem = async (tableId: number, itemId: string, reason: string) => {
    try {
      const session = sessions.find(s => s.tableId === tableId && s.status === 'ACTIVE');
      if (!session) return;
      
      const item = session.items.find(i => i.id === itemId);
      if (!item) return;

      const newLog = {
         id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
         time: Date.now(),
         staffId: currentUser?.id || 'UNKNOWN',
         staffName: currentUser?.name || 'UNKNOWN',
         action: 'CANCEL_ITEM',
         details: `Hủy món ${item.menuItem.displayName}. Lý do: ${reason}`
      };

      const { error } = await supabase.rpc('cancel_item', {
        p_session_id: session.id,
        p_item_id: itemId,
        p_reason: reason,
        p_log: newLog
      });

      if (error) throw error;
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  const recordUpsellAttempt = async (tableId: number, attempt: { menuItemId: string, result: 'TC' | 'TChối', reason?: string }) => {
    try {
      const session = sessions.find(s => s.tableId === tableId && s.status === 'ACTIVE');
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

      const { error } = await supabase.rpc('record_upsell_attempt', {
        p_session_id: session.id,
        p_attempt: newAttempt,
        p_log: newLog
      });

      if (error) throw error;
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  const checkoutSession = async (tableId: number, paymentMethod: 'Tiền Mặt' | 'Thẻ NCB' | 'VietQR' | 'Voucher') => {
    try {
      const session = sessions.find(s => s.tableId === tableId && s.status === 'ACTIVE');
      if (!session) return;
      
      const newLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        time: Date.now(),
        staffId: currentUser?.id || 'UNKNOWN',
        staffName: currentUser?.name || 'UNKNOWN',
        action: 'CHECKOUT',
        details: `Thanh toán bằng ${paymentMethod}`
      };

      const { error } = await supabase.rpc('checkout_session', {
        p_session_id: session.id,
        p_payment_method: paymentMethod,
        p_log: newLog,
        p_closed_at: Date.now()
      });

      if (error) throw error;

      updateTable(tableId, { status: 'TRONG', currentSessionId: null, lockedBy: null, lockedAt: null });
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('unserved')) {
        toast.error('Không thể thanh toán: Bàn vẫn còn món chưa phục vụ xong!');
      } else {
        toast.error('Có lỗi xảy ra, vui lòng thử lại');
      }
    }
  };

  const setMenu = async (newMenu: MenuItemFull[]) => {
    await dataStore.saveMenuItems(newMenu);
  };

  const toggleMenuItemActive = async (id: string) => {
    const item = menu.find(m => m.posCode === id);
    if (!item) return;
    await dataStore.toggleMenuItemStatus(item.posCode, !item.isActive);
  };

  const clearMenu = async () => {
    try {
      await dataStore.clearMenuItems();
      toast.success("Đã xóa toàn bộ menu thành công!");
    } catch (error) {
      console.error("Clear menu error:", error);
      toast.error("Không thể xóa menu. Vui lòng thử lại.");
    }
  };

  const value = useMemo(() => ({
    currentUser, menu, tables, zones, sessions, isReady, posBatches, posAggregateByPosCode,
    updateTable, addTable, deleteTable, addZone, deleteZone, renameZone, createSession, updateSession, 
    addItem, updatePendingItemQty, removePendingItem, sendRoundToKitchen, serveItem, cancelItem, recordUpsellAttempt, checkoutSession,
    setMenu, clearMenu, toggleMenuItemActive
  }), [currentUser, menu, tables, zones, sessions, isReady, posBatches, posAggregateByPosCode, clearMenu, setMenu, toggleMenuItemActive, addTable, deleteTable, addZone, deleteZone, renameZone]);

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
