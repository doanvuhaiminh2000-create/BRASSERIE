import { db, dataStore } from '../services/dataStore';
import { toast } from '../components/ui/Toast';

export const migrateLocalData = async () => {
  try {
    const batches = await db.pos_batches.toArray();
    const sessions = await db.live_sessions.toArray();
    const menu = await db.menu_items.toArray();

    if (batches.length === 0 && sessions.length === 0 && menu.length === 0) {
      toast.info('Không có dữ liệu local cần migrate.');
      return;
    }

    if (menu.length > 0) {
      await dataStore.saveMenuItems(menu);
    }

    // Insert batches one by one to avoid huge payload
    for (const batch of batches) {
      try {
        await dataStore.addPOSBatch(batch);
      } catch (err: any) {
        if (err.code !== '23505') { // ignore duplicate key
          console.error("Lỗi migrate batch", err);
        }
      }
    }

    // Sessions
    try {
      await dataStore.replaceAllSessions(sessions);
    } catch (err) {
      console.error("Lỗi migrate sessions", err);
    }

    // Clear dexie
    await db.pos_batches.clear();
    await db.live_sessions.clear();
    await db.menu_items.clear();

    toast.success('Migrate dữ liệu thành công!');
  } catch (error) {
    console.error('Lỗi khi migrate:', error);
    toast.error('Lỗi khi migrate dữ liệu. Xem console để biết chi tiết.');
  }
};
