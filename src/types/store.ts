export interface POSBatch {
  batchId: string;
  fileName: string;
  dateFrom: string;
  dateTo: string;
  uploadedAt: number;
  uploadedBy: string;
  summary: POSSummaryRow[];
  details: POSDetailRow[];
  payments: POSPaymentRow[];
  totalTransactions: number;
  totalRevenue: number;
  totalCustomers: number;
}

export interface POSSummaryRow {
  transaction: number;
  timeStart: number;
  timeEnd: number;
  date: number;
  table: number | string;
  customer: number;
  netTotal: number;
  vat: number;
  finalTotal: number;
  whoClose: string;
  whoStart: string;
}

export interface POSDetailRow {
  transaction: number;
  table: number | string;
  date: number;
  categoryId: string;
  category: string;
  subCategoryId: string;
  subCategory: string;
  productId: string;
  posCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  netAmount: number;
  finalAmount: number;
  timeOrder: number;
  whoOrder: string;
}

export interface POSPaymentRow {
  transaction: number;
  openDate: number;
  paymentMethod: string;
  tender: number;
  change: number;
  timePayment: number;
  whoPayment: string;
}

export interface MenuItemFull {
  posCode: string;
  posName: string;
  displayNameEN: string;
  displayName: string;
  section: 'APPETIZER' | 'BURGER, PASTA, PIZZA' | 'MAIN DISHES' | 'PREMIUM' | 'DESSERTS';
  category: string;
  price: number;
  isActive: boolean;
  station: 'P' | 'N' | 'L' | 'B';
  cookTime: number;
  complexity: 1 | 2 | 3;
  cost?: number;
  costRatio?: number;
  priceFromRecipe?: number;
  costSource?: 'recipe' | 'manual' | 'fallback';
  costUpdatedAt?: number;
  recipeMatchMethod?: 'exact' | 'normalized' | 'fuzzy' | 'manual';
}
