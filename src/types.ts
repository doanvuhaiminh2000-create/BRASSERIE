export type Role = 'admin' | 'manager' | 'staff';

export interface User {
  id: string;
  name: string;
  role: Role;
  pin: string;
}

export type TableStatus = 'TRONG' | 'DA_NGOI' | 'DA_ORDER' | 'DANG_PHUC_VU' | 'CHECKOUT' | 'KHOA';

export interface Table {
  id: number;
  name: string;
  capacity: number;
  zone: 'Trong Nhà' | 'Ngoài Trời' | 'Cửa Sổ' | 'Góc VIP';
  status: TableStatus;
  lockedBy?: string | null;
  lockedAt?: number | null;
  currentSessionId?: string | null;
}

export interface MenuItem {
  id: string;
  posName: string;
  displayName: string;
  category: 'Pizza' | 'Pasta' | 'Burger' | 'Main Course' | 'Salad' | 'Soup' | 'Side' | 'Đồ Uống';
  station: 'P' | 'N' | 'L' | 'B';
  price: number;
  cost: number;
  cookTime: number; // minutes
  complexity: 1 | 2 | 3;
}

export interface SessionItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  isUpsold?: boolean;
  status: 'PENDING' | 'SENT' | 'SERVED' | 'CANCELED';
  round: number;
  cancelReason?: string;
  sentAt?: number;
}

export interface UpsellAttempt {
  id: string;
  staffId: string;
  staffName: string;
  menuItemId: string;
  result: 'TC' | 'TChối';
  reason?: string;
  timestamp: number;
}

export interface EventLog {
  id: string;
  time: number;
  staffId: string;
  staffName: string;
  action: string;
  details: string;
}

export interface OrderSession {
  id: string;
  tableId: number;
  guestCount: number;
  status: 'ACTIVE' | 'COMPLETED';
  openedAt: number;
  closedAt?: number | null;
  openedByStaffId: string;
  
  items: SessionItem[];
  upsellAttempts: UpsellAttempt[];
  
  currentRound: number;
  eventLogs: EventLog[];
  
  paymentMethod?: 'Tiền Mặt' | 'Thẻ NCB' | 'VietQR' | 'Voucher';
}
