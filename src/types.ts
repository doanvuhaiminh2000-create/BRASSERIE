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

export interface OrderItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  isUpsold?: boolean;
  servedAt?: number | null;
}

export interface UpsellAttempt {
  id: string;
  dishId: string;
  dishName: string;
  result: 'TC' | 'TChối';
  reason?: string;
  timestamp: number;
  staffId: string;
}

export interface SessionTimeline {
  T1_Seated: number | null;      // Khách ngồi
  T2_OrderEnd: number | null;    // Gọi món xong
  T4_FinalConfirm: number | null; // Chốt order gửi bếp
  T5_SendToKitchen: number | null; // Gửi bếp (thực tế)
  T6A_FirstDish: number | null;  // Món đầu ra
  T6A_LastDish: number | null;   // Món cuối ra
  T6B_Checkout: number | null;   // Khách gọi TT
  T7_Leave: number | null;       // Khách rời bàn
}

export interface OrderSession {
  id: string;
  tableId: number;
  guestCount: number;
  status: 'ACTIVE' | 'COMPLETED';
  openedAt: number;
  closedAt?: number | null;
  openedByStaffId: string;
  
  items: OrderItem[];
  upsellAttempts: UpsellAttempt[];
  
  timeline: SessionTimeline;
  
  paymentMethod?: 'Tiền Mặt' | 'Thẻ NCB' | 'VietQR' | 'Voucher';
}
