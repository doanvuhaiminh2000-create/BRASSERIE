import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Table, MenuItem, OrderSession } from '../types';
import { mockUsers, mockMenu, generateMockTables } from '../data/mockData';

interface AppState {
  currentUser: User | null;
  users: User[];
  menu: MenuItem[];
  tables: Table[];
  sessions: OrderSession[];
}

interface AppContextType extends AppState {
  login: (userId: string, pin: string) => boolean;
  logout: () => void;
  updateTable: (tableId: number, updates: Partial<Table>) => void;
  createSession: (tableId: number, guestCount: number) => OrderSession;
  updateSession: (sessionId: string, updates: Partial<OrderSession>) => void;
  completeSession: (sessionId: string) => void;
  getDashboardStats: () => any; // Will implement later
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

  // Save to localStorage when tables/sessions change
  useEffect(() => {
    localStorage.setItem('brasserie_tables', JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem('brasserie_sessions', JSON.stringify(sessions));
  }, [sessions]);

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
      timeline: {
        T1_Seated: Date.now(),
        T2_OrderEnd: null,
        T4_FinalConfirm: null,
        T5_SendToKitchen: null,
        T6A_FirstDish: null,
        T6A_LastDish: null,
        T6B_Checkout: null,
        T7_Leave: null,
      }
    };
    
    setSessions(prev => [...prev, newSession]);
    updateTable(tableId, { status: 'DA_NGOI', currentSessionId: newSession.id });
    return newSession;
  };

  const updateSession = (sessionId: string, updates: Partial<OrderSession>) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updates } : s));
  };

  const completeSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const finalSession = { 
      ...session, 
      status: 'COMPLETED' as const, 
      closedAt: Date.now(),
      timeline: { ...session.timeline, T7_Leave: Date.now() }
    };
    
    setSessions(prev => prev.map(s => s.id === sessionId ? finalSession : s));
    updateTable(session.tableId, { status: 'TRONG', currentSessionId: null, lockedBy: null, lockedAt: null });
  };

  const getDashboardStats = () => { return {}; };

  return (
    <AppContext.Provider value={{
      currentUser, users, menu, tables, sessions,
      login, logout, updateTable, createSession, updateSession, completeSession, getDashboardStats
    }}>
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
