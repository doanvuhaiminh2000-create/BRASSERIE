import { User, MenuItem, Table } from '../types';

export const mockUsers: User[] = [
  { name: "Lê Thị Thu Hà", id: "HALTT", role: "staff", pin: "1234" },
  { name: "Đinh Thị Thanh Huyền", id: "HUYENDTT", role: "staff", pin: "1234" },
  { name: "Võ Hà Thương", id: "THUONGVH", role: "staff", pin: "1234" },
  { name: "Nguyễn Lê Phương", id: "PHUONGNL", role: "staff", pin: "1234" },
  { name: "Nguyễn Thu Diễm", id: "DIEMNT", role: "staff", pin: "1234" },
  { name: "Quản Lý", id: "MANAGER", role: "manager", pin: "5678" },
  { name: "Admin", id: "ADMIN", role: "admin", pin: "0000" }
];

export const mockMenu: MenuItem[] = [
  // Fallback only — sẽ bị thay khi user upload Menu_online.xlsx tại /menu-management.
  { 
    id: 'DEMO_001', posCode: 'DEMO_001', posName: 'Salad Tôm Nướng', displayNameEN: 'Grilled Shrimp Salad', 
    displayName: 'Salad Tôm Nướng', section: 'APPETIZER', category: 'F14 - SALAD', 
    price: 180000, cost: 50000, isActive: true, station: 'L', cookTime: 7, complexity: 1 
  },
  { 
    id: 'DEMO_002', posCode: 'DEMO_002', posName: 'Pizza Gà BBQ', displayNameEN: 'BBQ Chicken Pizza', 
    displayName: 'Pizza Gà BBQ', section: 'BURGER, PASTA, PIZZA', category: 'F23 - PIZZA', 
    price: 250000, cost: 70000, isActive: true, station: 'P', cookTime: 12, complexity: 2 
  },
  { 
    id: 'DEMO_003', posCode: 'DEMO_003', posName: 'Signature Spaghetti', displayNameEN: 'Signature Spaghetti', 
    displayName: 'Signature Spaghetti', section: 'BURGER, PASTA, PIZZA', category: 'F22 - NOODLES', 
    price: 350000, cost: 90000, isActive: true, station: 'N', cookTime: 15, complexity: 2 
  },
  { 
    id: 'DEMO_004', posCode: 'DEMO_004', posName: 'Burger Bò', displayNameEN: 'Beef Burger', 
    displayName: 'Burger Bò', section: 'BURGER, PASTA, PIZZA', category: 'F05 - BURGER', 
    price: 220000, cost: 60000, isActive: true, station: 'N', cookTime: 10, complexity: 2 
  },
  { 
    id: 'DEMO_005', posCode: 'DEMO_005', posName: 'Bò Nướng Wagyu', displayNameEN: 'Grilled Wagyu Beef', 
    displayName: 'Bò Nướng Wagyu', section: 'MAIN DISHES', category: 'F25 - MAIN COURSE', 
    price: 600000, cost: 200000, isActive: true, station: 'N', cookTime: 20, complexity: 3 
  },
  { 
    id: 'DEMO_006', posCode: 'DEMO_006', posName: 'Kem Vani', displayNameEN: 'Vanilla Ice Cream', 
    displayName: 'Kem Vani', section: 'DESSERTS', category: 'F01 - A LA CARTE', 
    price: 80000, cost: 20000, isActive: true, station: 'B', cookTime: 5, complexity: 1 
  }
];

export const generateMockTables = (): Table[] => {
  const tables: Table[] = [];
  for (let i = 1; i <= 30; i++) {
    let zone: Table['zone'] = 'Trong Nhà';
    let capacity = 4;
    if (i > 12 && i <= 20) { zone = 'Ngoài Trời'; }
    if (i > 20 && i <= 26) { zone = 'Cửa Sổ'; capacity = 6; }
    if (i > 26) { zone = 'Góc VIP'; capacity = 8; }
    
    tables.push({
      id: i,
      name: `T${i.toString().padStart(2, '0')}`,
      capacity,
      zone,
      status: 'TRONG',
    });
  }
  return tables;
};
