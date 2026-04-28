import { POSBatch, MenuItemFull } from '../types/store';
import { OrderSession } from '../types';

export const posBatchToDB = (b: POSBatch) => ({
  batch_id: b.batchId,
  file_name: b.fileName,
  date_from: b.dateFrom,
  date_to: b.dateTo,
  uploaded_at: new Date(b.uploadedAt).toISOString(),
  uploaded_by: b.uploadedBy || null,
  summary: b.summary,
  details: b.details,
  payments: b.payments,
  total_transactions: b.totalTransactions,
  total_revenue: b.totalRevenue,
  total_customers: b.totalCustomers,
});

export const posBatchFromDB = (row: any): POSBatch => ({
  batchId: row.batch_id,
  fileName: row.file_name,
  dateFrom: row.date_from,
  dateTo: row.date_to,
  uploadedAt: new Date(row.uploaded_at).getTime(),
  uploadedBy: row.uploaded_by || 'Unknown',
  summary: row.summary || [],
  details: row.details || [],
  payments: row.payments || [],
  totalTransactions: row.total_transactions || 0,
  totalRevenue: Number(row.total_revenue) || 0,
  totalCustomers: row.total_customers || 0,
});

export const menuItemToDB = (m: MenuItemFull) => ({
  pos_code: m.posCode,
  pos_name: m.posName,
  display_name_en: m.displayNameEN,
  display_name: m.displayName,
  section: m.section,
  category: m.category,
  price: m.price,
  cost: m.cost,
  cost_ratio: m.costRatio,
  price_from_recipe: m.priceFromRecipe,
  cost_source: m.costSource,
  cost_updated_at: m.costUpdatedAt ? new Date(m.costUpdatedAt).toISOString() : null,
  recipe_match_method: m.recipeMatchMethod,
  is_active: m.isActive,
  station: m.station,
  cook_time: m.cookTime,
  complexity: m.complexity
});

export const menuItemFromDB = (row: any): MenuItemFull => ({
  posCode: row.pos_code,
  posName: row.pos_name,
  displayNameEN: row.display_name_en,
  displayName: row.display_name,
  section: row.section as any,
  category: row.category,
  price: Number(row.price),
  cost: row.cost ? Number(row.cost) : undefined,
  costRatio: row.cost_ratio ? Number(row.cost_ratio) : undefined,
  priceFromRecipe: row.price_from_recipe ? Number(row.price_from_recipe) : undefined,
  costSource: row.cost_source as any,
  costUpdatedAt: row.cost_updated_at ? new Date(row.cost_updated_at).getTime() : undefined,
  recipeMatchMethod: row.recipe_match_method as any,
  isActive: row.is_active,
  station: row.station as any,
  cookTime: row.cook_time,
  complexity: row.complexity as any
});

export const orderSessionToDB = (s: OrderSession) => ({
  id: s.id,
  table_id: s.tableId,
  guest_count: s.guestCount,
  status: s.status,
  opened_at: s.openedAt,
  closed_at: s.closedAt || null,
  opened_by_staff_id: s.openedByStaffId || null,
  items: s.items || [],
  upsell_attempts: s.upsellAttempts || [],
  current_round: s.currentRound || 1,
  event_logs: s.eventLogs || [],
  payment_method: s.paymentMethod || null,
});

export const orderSessionFromDB = (row: any): OrderSession => ({
  id: row.id,
  tableId: row.table_id,
  guestCount: row.guest_count,
  status: row.status as any,
  openedAt: Number(row.opened_at),
  closedAt: row.closed_at ? Number(row.closed_at) : undefined,
  openedByStaffId: row.opened_by_staff_id,
  items: row.items || [],
  upsellAttempts: row.upsell_attempts || [],
  currentRound: row.current_round,
  eventLogs: row.event_logs || [],
  paymentMethod: row.payment_method as any,
});
