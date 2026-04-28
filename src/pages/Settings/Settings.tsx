import React, { useEffect, useState } from 'react';
import { useApp } from '../../store/AppContext';
import { dataStore, db } from '../../services/dataStore';
import { migrateLocalData } from '../../utils/migrateLocalData';
import { toast } from '../../components/ui/Toast';
import { confirmModal } from '../../components/ui/ConfirmModal';
import { auditLogger } from '../../services/auditLogger';
import { Database, AlertTriangle, CloudUpload } from 'lucide-react';

export function Settings() {
  const { clearMenu } = useApp();
  const [hasLocalData, setHasLocalData] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    const checkLocal = async () => {
      try {
        const batchCount = await db.pos_batches.count();
        const sessionCount = await db.live_sessions.count();
        const menuCount = await db.menu_items.count();
        setHasLocalData(batchCount > 0 || sessionCount > 0 || menuCount > 0);
      } catch (err) {
        console.error("Dexie db check error", err);
      }
    };
    checkLocal();
  }, []);

  const handleMigrate = async () => {
    const ok = await confirmModal({
      title: 'Chuyển đổi dữ liệu lên Cloud',
      message: 'Hệ thống sẽ đồng bộ toàn bộ dữ liệu từ trình duyệt này lên máy chủ Supabase. Khi thành công, dữ liệu local sẽ bị xóa. Tiếp tục?',
      confirmText: 'Bắt Đầu Đồng Bộ'
    });
    if (!ok) return;

    setIsMigrating(true);
    await migrateLocalData();
    setIsMigrating(false);
    setHasLocalData(false);
    
    // Hard reload to fetch new data
    window.location.reload();
  };

  const handleClearAllData = async () => {
    const ok = await confirmModal({
      title: 'Xóa toàn bộ dữ liệu (Factory Reset)',
      message: 'Hành động này sẽ xóa toàn bộ dữ liệu POS (file đã up), dữ liệu live session (bills), và dữ liệu menu để bạn có thể test lại từ đầu. Tuyệt đối không thể hoàn tác. Bạn có chắc chắn?',
      confirmText: 'XÓA TOÀN BỘ',
      danger: true
    });

    if (ok) {
      try {
        await dataStore.clearPOSBatches();
        await dataStore.clearSessions();
        await clearMenu();
        await auditLogger.log('Xoá toàn bộ dữ liệu (Hard Reset)');
        toast.success("Đã xóa toàn bộ dữ liệu thành công. Làm mới lại trang để bắt đầu.");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        console.error("Error clearing data:", err);
        toast.error("Có lỗi xảy ra khi xóa dữ liệu.");
      }
    }
  };

  const handleClearPOS = async () => {
    const ok = await confirmModal({
      title: 'Xóa dữ liệu POS',
      message: 'Bạn có chắc chắn muốn xóa tất cả các file POS đã upload?',
      confirmText: 'XÓA POS',
      danger: true
    });
    if (ok) {
      try {
        await dataStore.clearPOSBatches();
        await auditLogger.log('Xoá toàn bộ dữ liệu POS file');
        toast.success("Đã xóa dữ liệu POS.");
      } catch (err) {
        toast.error("Lỗi xóa POS.");
      }
    }
  };

  const handleClearSessions = async () => {
    const ok = await confirmModal({
      title: 'Xóa dữ liệu Live (Bills)',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử bill và phiên live?',
      confirmText: 'XÓA LIVE SESSIONS',
      danger: true
    });
    if (ok) {
      try {
        await dataStore.clearSessions();
        await auditLogger.log('Xoá toàn bộ lịch sử Live Sessions');
        toast.success("Đã xóa lịch sử Live.");
      } catch (err) {
        toast.error("Lỗi xóa Live.");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-main)] text-white overflow-hidden p-6 gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-sans tracking-tight">Cài Đặt Hệ Thống</h1>
          <p className="text-[var(--color-text-muted)] mt-1">Quản lý ứng dụng, cấu hình và dữ liệu hệ thống.</p>
        </div>
      </div>
      
      <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border-main)] flex-1 overflow-y-auto">
        
        {hasLocalData && (
          <div className="mb-8 p-6 border border-emerald-500/30 bg-emerald-500/10 rounded-xl">
            <div className="flex gap-3 mb-4 text-emerald-400">
              <CloudUpload className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">Đồng Bộ Dữ Liệu Cũ (Migration)</h3>
                <p className="text-sm opacity-80 mt-1 text-emerald-100">
                  Hệ thống phát hiện có dữ liệu cũ chưa được đồng bộ trên trình duyệt. Hãy chạy để lưu lên máy chủ Supabase.
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleMigrate}
              disabled={isMigrating}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isMigrating ? 'Đang Xử Lý...' : 'Chuyển Đổi Dữ Liệu (Migrate)'}
            </button>
          </div>
        )}

        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Quản Lý Dữ Liệu (Reset)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-[var(--color-border-main)] rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="font-medium text-lg text-[var(--color-accent-orange)]">Dữ liệu POS (Files)</h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">
                Xóa toàn bộ các file Excel báo cáo POS đã upload. Thích hợp để dọn dẹp và upload test dữ liệu mới.
              </p>
            </div>
            <button 
              onClick={handleClearPOS}
              className="px-4 py-2 bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-lg hover:border-[var(--color-accent-orange)] hover:text-[var(--color-accent-orange)] transition-colors text-left w-max text-sm"
            >
              Xóa Dữ Liệu POS
            </button>
          </div>
          
          <div className="p-4 border border-[var(--color-border-main)] rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="font-medium text-lg text-[var(--color-accent-blue)]">Dữ liệu Live (Bills)</h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">
                Xóa toàn bộ các session, các bàn đang mở và các hóa đơn đã chốt trong mục Live Entry. Menu vẫn được giữ nguyên.
              </p>
            </div>
            <button 
              onClick={handleClearSessions}
              className="px-4 py-2 bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-lg hover:border-[var(--color-accent-blue)] hover:text-[var(--color-accent-blue)] transition-colors text-left w-max text-sm"
            >
              Xóa Lịch Sử Live Entry
            </button>
          </div>
        </div>

        <div className="mt-8 p-6 border border-[var(--color-accent-red)]/30 bg-red-500/5 rounded-xl">
          <div className="flex gap-3 mb-4 text-[var(--color-accent-red)]">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div>
              <h3 className="font-semibold text-lg">Xóa Toàn Bộ Dữ Liệu (Hard Reset)</h3>
              <p className="text-sm opacity-80 mt-1">
                Lựa chọn này sẽ xóa toàn bộ nội dung trong database (bao gồm POS, Live Sessions, và cả cấu trúc Menu). Bấm nút này nếu bạn muốn khởi tạo ứng dụng như trạng thái ban đầu của hệ thống.
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleClearAllData}
            className="px-6 py-2.5 bg-[var(--color-accent-red)]/10 border border-[var(--color-accent-red)] text-[var(--color-accent-red)] font-semibold rounded-lg hover:bg-[var(--color-accent-red)] hover:text-white transition-colors"
          >
            Làm Mới Hoàn Toàn Ứng Dụng
          </button>
        </div>

      </div>
    </div>
  );
}
