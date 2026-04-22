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
  // PIZZA (P)
  { id: 'p1', posName: 'Signature Pizza', displayName: 'Signature Pizza', category: 'Pizza', station: 'P', price: 300000, cost: 80000, cookTime: 12, complexity: 2 },
  { id: 'p2', posName: 'Pizza Margherita', displayName: 'Pizza Margherita', category: 'Pizza', station: 'P', price: 200000, cost: 50000, cookTime: 10, complexity: 1 },
  { id: 'p3', posName: 'Pizza Gà BBQ', displayName: 'Pizza Gà BBQ', category: 'Pizza', station: 'P', price: 250000, cost: 70000, cookTime: 12, complexity: 2 },
  { id: 'p4', posName: 'Pizza Hải Sản', displayName: 'Pizza Hải Sản', category: 'Pizza', station: 'P', price: 300000, cost: 100000, cookTime: 14, complexity: 3 },
  
  // PASTA (N)
  { id: 'pa1', posName: 'Signature Spaghetti', displayName: 'Signature Spaghetti', category: 'Pasta', station: 'N', price: 350000, cost: 90000, cookTime: 15, complexity: 2 },
  { id: 'pa2', posName: 'Mỳ Ý Bò Bằm', displayName: 'Mỳ Ý Bò Bằm', category: 'Pasta', station: 'N', price: 240000, cost: 60000, cookTime: 10, complexity: 1 },
  
  // SALAD (L)
  { id: 's1', posName: 'Salad Gà Và Hạt', displayName: 'Salad Gà Và Hạt', category: 'Salad', station: 'L', price: 180000, cost: 40000, cookTime: 5, complexity: 1 },
  { id: 's2', posName: 'Salad Tôm Nướng', displayName: 'Salad Tôm Nướng', category: 'Salad', station: 'L', price: 200000, cost: 60000, cookTime: 7, complexity: 2 },
  
  // DRINKS (B)
  { id: 'd1', posName: 'Coke', displayName: 'Coke', category: 'Đồ Uống', station: 'B', price: 60000, cost: 15000, cookTime: 2, complexity: 1 },
  { id: 'd2', posName: 'Sinh Tố Xoài', displayName: 'Sinh Tố Xoài', category: 'Đồ Uống', station: 'B', price: 80000, cost: 25000, cookTime: 5, complexity: 1 },
  { id: 'd3', posName: 'Bia Tiger', displayName: 'Bia Tiger', category: 'Đồ Uống', station: 'B', price: 55000, cost: 20000, cookTime: 2, complexity: 1 },

  // MAIN (N)
  { id: 'm1', posName: 'Bò Nướng Wagyu', displayName: 'Bò Nướng Wagyu', category: 'Main Course', station: 'N', price: 600000, cost: 250000, cookTime: 20, complexity: 3 }
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
