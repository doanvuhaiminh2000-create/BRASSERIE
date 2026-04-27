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
  zone: string;
  status: TableStatus;
  lockedBy?: string | null;
  lockedAt?: number | null;
  currentSessionId?: string | null;
  x?: number; // percentage (0-100)
  y?: number; // percentage (0-100)
}

export type MenuSection = 'APPETIZER' | 'BURGER, PASTA, PIZZA' | 'MAIN DISHES' | 'PREMIUM' | 'DESSERTS';

export type MenuPOSCategory =
  | 'F04 - BREAD' | 'F17 - SOUP' | 'F14 - SALAD' | 'F23 - PIZZA'
  | 'F22 - NOODLES' | 'F25 - MAIN COURSE' | 'F05 - BURGER'
  | 'F10 - GRILLED' | 'F01 - A LA CARTE';

export interface MenuItem {
  id: string;                    // = posCode để đảm bảo unique
  posCode: string;               // PRODNUM, ví dụ "2146446156"
  posName: string;               // "SALAD PHO MAI BURRATA"
  displayNameEN: string;         // "Burrata Salad"
  displayName: string;           // "Salad Phô Mai Burrata"
  section: MenuSection;
  category: MenuPOSCategory;
  price: number;                 // VND, có VAT
  cost?: number;                 // optional, sẽ map từ file định lượng sau
  isActive: boolean;
  station: 'P' | 'N' | 'L' | 'B';
  cookTime: number;              // mặc định 10 nếu chưa biết
  complexity: 1 | 2 | 3;         // mặc định 2
}

export interface POSRawData {
  detailRows: Array<{
    productId: string;       // POS Product ID
    productName: string;
    quantity: number;
    finalAmount: number;
    timeOrder: string;
  }>;
  uploadedAt: number;
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
