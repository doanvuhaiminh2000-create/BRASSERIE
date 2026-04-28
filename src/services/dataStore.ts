import Dexie, { type Table } from 'dexie';
import { supabase } from './supabaseClient';
import { 
  posBatchFromDB, posBatchToDB, 
  menuItemFromDB, menuItemToDB,
  orderSessionFromDB, orderSessionToDB
} from './mappers';
import { POSBatch, MenuItemFull } from '../types/store';
import { OrderSession } from '../types';

// Keep Dexie for migration purposes (Phase 5.5)
export class AppDatabase extends Dexie {
  pos_batches!: Table<POSBatch, string>;
  live_sessions!: Table<OrderSession, string>;
  menu_items!: Table<MenuItemFull, string>;
  app_settings!: Table<{key: string, value: any}, string>;

  constructor() {
    super('BrasserieOpsDB');
    this.version(1).stores({
      pos_batches: 'batchId, dateFrom, dateTo, uploadedAt', 
      live_sessions: 'id, openedAt, status',
      menu_items: 'posCode, section, category',
      app_settings: 'key'
    });
    this.version(2).stores({
      pos_batches: 'batchId, dateFrom, dateTo, uploadedAt',
      live_sessions: 'id, openedAt, status, tableId',
      menu_items: 'posCode, section, category',
      app_settings: 'key'
    });
  }
}

export const db = new AppDatabase();

export const dataStore = {
  // --- POS Batches ---
  async getAllPOSBatches() {
    const { data, error } = await supabase
      .from('pos_batches')
      .select('*')
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data.map(posBatchFromDB);
  },
  
  async addPOSBatch(batch: POSBatch) {
    const { error } = await supabase
      .from('pos_batches')
      .insert(posBatchToDB(batch));
    if (error) throw error;
  },
  
  async deletePOSBatch(batchId: string) {
    const { error } = await supabase
      .from('pos_batches')
      .delete()
      .eq('batch_id', batchId);
    if (error) throw error;
  },

  async clearPOSBatches() {
    // Only clear batches that user has access to based on RLS (usually all for admin)
    const { error } = await supabase
      .from('pos_batches')
      .delete()
      .neq('batch_id', 'invalid_id_just_delete_all'); // Quick hack to delete all or use RPC
    if (error) console.error("Could not clear POS batches via RLS", error);
  },

  async getPOSBatchesInRange(dateFromStr: string, dateToStr: string) {
    const start = new Date(dateFromStr).toISOString();
    const end = new Date(new Date(dateToStr).getTime() + 86399999).toISOString();
    
    // In our DB schema date_from and date_to might be stored as date strings or timestamps
    const { data, error } = await supabase
      .from('pos_batches')
      .select('*')
      .gte('date_from', start)
      .lte('date_to', end);
    if (error) throw error;
    return data.map(posBatchFromDB);
  },
  
  // --- Live Sessions ---
  async getAllSessions() {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*');
    if (error) throw error;
    return data.map(orderSessionFromDB);
  },

  async getSessionsInRange(startMs: number, endMs: number) {
    const startIso = new Date(startMs).toISOString();
    const endIso = new Date(endMs).toISOString();
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .gte('opened_at', startIso)
      .lte('opened_at', endIso);
    if (error) throw error;
    return data.map(orderSessionFromDB);
  },
  
  async addSession(session: OrderSession) {
    const { error } = await supabase
      .from('live_sessions')
      .insert(orderSessionToDB(session));
    if (error) throw error;
  },
  
  async updateSession(id: string, updates: Partial<OrderSession>) {
    // Basic mapping (needs careful mapping for partials)
    const dbUpdates: any = {};
    if ('status' in updates) dbUpdates.status = updates.status;
    if ('closedAt' in updates) dbUpdates.closed_at = updates.closedAt ? new Date(updates.closedAt).toISOString() : null;
    if ('items' in updates) dbUpdates.items = updates.items;
    if ('totalAmount' in updates) dbUpdates.total_amount = updates.totalAmount;
    if ('totalGuests' in updates) dbUpdates.total_guests = updates.totalGuests;
    if ('cashier' in updates) dbUpdates.cashier = updates.cashier;
    if ('eventLogs' in updates) dbUpdates.event_logs = updates.eventLogs;
    if ('staffCommissions' in updates) dbUpdates.staff_commissions = updates.staffCommissions;

    const { error } = await supabase
      .from('live_sessions')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
  },

  async clearSessions() {
    const { error } = await supabase
      .from('live_sessions')
      .delete()
      .neq('id', 'invalid_id_just_delete_all');
    if (error) console.error("Could not clear sessions via RLS", error);
  },

  async replaceAllSessions(sessions: OrderSession[]) {
    // Delete all
    await this.clearSessions();
    if (sessions.length > 0) {
      const { error } = await supabase
        .from('live_sessions')
        .insert(sessions.map(orderSessionToDB));
      if (error) throw error;
    }
  },
  
  // --- Menu Items ---
  async getAllMenuItems() {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*');
    if (error) throw error;
    return data.map(menuItemFromDB);
  },
  
  async saveMenuItems(items: MenuItemFull[]) {
    await this.clearMenuItems();
    if (items.length > 0) {
      const { error } = await supabase
        .from('menu_items')
        .insert(items.map(menuItemToDB));
      if (error) throw error;
    }
  },

  async clearMenuItems() {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .neq('pos_code', 'invalid');
    if (error) console.error("Could not clear menu items via RLS", error);
  },

  async toggleMenuItemStatus(posCode: string, isActive: boolean) {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_active: isActive })
      .eq('pos_code', posCode);
    if (error) throw error;
  },
  
  // --- App Settings ---
  async getSetting(key: string) {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();
    if (error && error.code !== 'PGRST116') { // PGRST116 is not found
      console.error(error);
      return null;
    }
    return data ? data.value : null;
  },
  
  async setSetting(key: string, value: any) {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
};
