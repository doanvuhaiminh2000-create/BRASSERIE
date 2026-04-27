import Dexie, { type Table } from 'dexie';
import { POSBatch, MenuItemFull } from '../types/store';
import { OrderSession, User } from '../types';

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
  }
}

export const db = new AppDatabase();

export const dataStore = {
  // --- POS Batches ---
  async getAllPOSBatches() {
    return await db.pos_batches.orderBy('uploadedAt').reverse().toArray();
  },
  
  async addPOSBatch(batch: POSBatch) {
    await db.pos_batches.put(batch);
  },
  
  async deletePOSBatch(batchId: string) {
    await db.pos_batches.delete(batchId);
  },

  async clearPOSBatches() {
    await db.pos_batches.clear();
  },

  async getPOSBatchesInRange(dateFromStr: string, dateToStr: string) {
    const start = new Date(dateFromStr).getTime();
    const end = new Date(dateToStr).getTime() + 86399999;
    
    const batches = await db.pos_batches.toArray();
    return batches.filter(b => {
      const bStart = new Date(b.dateFrom).getTime();
      const bEnd = new Date(b.dateTo).getTime();
      return bStart <= end && bEnd >= start;
    });
  },
  
  // --- Live Sessions ---
  async getAllSessions() {
    return await db.live_sessions.toArray();
  },
  
  async addSession(session: OrderSession) {
    await db.live_sessions.put(session);
  },
  
  async updateSession(id: string, updates: Partial<OrderSession>) {
    await db.live_sessions.update(id, updates);
  },

  async clearSessions() {
    await db.live_sessions.clear();
  },

  // WARNING: This is a destructive operation. It will clear all existing sessions and replace them.
  async replaceAllSessions(sessions: OrderSession[]) {
    await db.live_sessions.clear();
    await db.live_sessions.bulkPut(sessions);
  },
  
  // --- Menu Items ---
  async getAllMenuItems() {
    return await db.menu_items.toArray();
  },
  
  async saveMenuItems(items: MenuItemFull[]) {
    await db.menu_items.clear();
    await db.menu_items.bulkPut(items);
  },
  
  // --- App Settings ---
  async getSetting(key: string) {
    const record = await db.app_settings.get(key);
    return record ? record.value : null;
  },
  
  async setSetting(key: string, value: any) {
    await db.app_settings.put({ key, value });
  }
};
