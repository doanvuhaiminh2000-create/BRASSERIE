import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { cn, getMilestone, isDateInRange, DateRange } from '../../lib/utils';
import { Download, FileSpreadsheet, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

export function SessionHistory() {
  const { sessions, tables, users, menu } = useApp();
  const [dateFilter, setDateFilter] = useState<DateRange>('today');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const completedSessions = sessions.filter(s => 
    s.status === 'COMPLETED' && 
    isDateInRange(s.openedAt, dateFilter, startDate, endDate)
  );

  const getTableName = (tableId: number) => {
    return tables.find(t => t.id === tableId)?.name || `Bàn ${tableId}`;
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;
  const getMenuItem = (id: string) => menu.find(m => m.id === id);

  const getUpsellRevenue = (items: any[]) => {
    if (!Array.isArray(items)) return 0;
    return items.filter(i => i?.isUpsold && i?.menuItem).reduce((acc, i) => acc + ((i.menuItem.price || 0) * (i.quantity || 0)), 0);
  };

  const getSessionTotal = (items: any[]) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((acc, i) => acc + ((i.menuItem?.price || 0) * (i.quantity || 0)), 0);
  };

  const handleExportExcel = () => {
    // Helper formats
    const formatDateExcel = (time: number | undefined | null) => {
      if (!time) return "";
      const d = new Date(time);
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      const ss = d.getSeconds().toString().padStart(2, '0');
      const DD = d.getDate().toString().padStart(2, '0');
      const MM = (d.getMonth() + 1).toString().padStart(2, '0');
      return `${hh}:${mm}:${ss} ${DD}/${MM}`;
    };

    const findEvent = (logs: any[], action: string, searchStr?: string, pos: 'first' | 'last' = 'first') => {
      const filtered = logs.filter(l => l.action === action && (!searchStr || l.details?.includes(searchStr)));
      if (!filtered.length) return undefined;
      return pos === 'first' ? filtered[0] : filtered[filtered.length - 1];
    };

    const mapStatus = (status: string) => {
      switch (status) {
        case 'SERVED': return 'Đã phục vụ';
        case 'CANCELED': return 'Đã hủy';
        case 'SENT': return 'Đang chế biến';
        default: return 'Chờ gửi bếp';
      }
    };

    const auditData: any[] = [];
    const itemData: any[] = [];
    const upsellData: any[] = [];
    
    // Session Summary Data
    const summaryData = (completedSessions || []).map(session => {
      const items = session.items || [];
      const logs = session.eventLogs || [];
      const tableName = getTableName(session.tableId);

      // Sheet 4: Audit Trail build
      logs.forEach(log => {
        auditData.push({
          "Mã Phiên": session.id,
          "Bàn": tableName,
          "Thời Gian": formatDateExcel(log.time),
          "Mã Nhân Viên": log.staffId,
          "Tên Nhân Viên": log.staffName,
          "Hành Động": log.action,
          "Chi Tiết": log.details || ""
        });
      });

      // Sheet 3: Upsell data build
      if (Array.isArray(session.upsellAttempts)) {
        session.upsellAttempts.forEach(upsell => {
          const menuItem = getMenuItem(upsell.menuItemId);
          upsellData.push({
            "Mã Phiên": session.id,
            "Bàn": tableName,
            "Nhân Viên": getUserName(upsell.staffId),
            "Món Gợi Ý": menuItem?.displayName || upsell.menuItemId,
            "Kết Quả": upsell.result === 'TC' ? 'Thành công' : 'Từ chối',
            "Lý Do Khách Từ Chối": upsell.reason || "",
            "Số Tiền Tăng Thêm": upsell.result === 'TC' ? (menuItem?.price || 0) : 0
          });
        });
      }

      // Sheet 2: Items Data build
      items.forEach(item => {
        const addItemLog = findEvent(logs, 'ADD_ITEM', item.menuItem.displayName);
        const sendKitchenLog = findEvent(logs, 'SEND_KITCHEN', `lần ${item.round}`);
        const serveLog = findEvent(logs, 'SERVE_ITEM', item.menuItem.displayName);

        const tCall = addItemLog?.time;
        const tSend = sendKitchenLog?.time;
        const tServe = serveLog?.time;

        itemData.push({
          "Mã Phiên": session.id,
          "Số Bàn": tableName,
          "Tên Món Ăn": item.menuItem.displayName,
          "Lượt gọi": `Round ${item.round}`,
          "Giá Tiền": item.menuItem.price || 0,
          "Loại": item.isUpsold ? "Upsell" : "Thường",
          "TG Gọi Món": formatDateExcel(tCall),
          "NV Gọi Món": addItemLog?.staffName || "",
          "TG Gửi Bếp": formatDateExcel(tSend),
          "NV Gửi Bếp": sendKitchenLog?.staffName || "",
          "TG Ra Món": formatDateExcel(tServe),
          "NV Ra Món": serveLog?.staffName || "",
          "Trạng thái": mapStatus(item.status),
          "Lý do Hủy": item.cancelReason || ""
        });
      });

      // Sheet 1 logic
      const t1_log = findEvent(logs, 'OPEN_TABLE');
      const t2_log = findEvent(logs, 'SEND_KITCHEN', undefined, 'first');
      const t5_log = findEvent(logs, 'SEND_KITCHEN', undefined, 'last');
      const t7_log = findEvent(logs, 'CHECKOUT', undefined, 'last');

      const rounds = logs.filter(log => log.action === 'SEND_KITCHEN').length;
      
      const t1_time = t1_log ? t1_log.time : session.openedAt;
      const t7_time = t7_log ? t7_log.time : session.closedAt;
      const seatedTime = (t7_time && t1_time) ? Math.round((t7_time - t1_time) / 60000) : 0;

      return {
        "Mã Phiên": session.id,
        "Bàn": tableName,
        "Số Lượt Gọi (Rounds)": rounds,
        "T1 (Đón khách)": `${formatDateExcel(t1_time)} | ${t1_log?.staffName || session.openedByStaffId}`,
        "T2 (Order Lần 1)": t2_log ? `${formatDateExcel(t2_log.time)} | ${t2_log.staffName}` : "",
        "T5 (Gửi Bếp Cuối)": t5_log ? `${formatDateExcel(t5_log.time)} | ${t5_log.staffName}` : "",
        "T7 (Thanh Toán)": t7_log ? `${formatDateExcel(t7_log.time)} | ${t7_log.staffName}` : "",
        "Tổng Thời Gian Ngồi (phút)": seatedTime
      };
    });

    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: Báo Cáo Hiệu Suất Tổng Hợp
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, wsSummary, "Hiệu Suất Tổng Hợp");

    // Sheet 2: Báo Cáo Chi Tiết Món Ăn
    const wsItems = XLSX.utils.json_to_sheet(itemData);
    wsItems['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(workbook, wsItems, "Chi Tiết Món Ăn");

    // Sheet 3: Phân Tích Upsell
    const wsUpsell = XLSX.utils.json_to_sheet(upsellData);
    wsUpsell['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, wsUpsell, "Phân Tích Upsell");

    // Sheet 4: Nhật Ký Thao Tác (Audit Trail)
    const wsAudit = XLSX.utils.json_to_sheet(auditData);
    wsAudit['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, wsAudit, "Audit Trail");

    let filename = `Bao_Cao_Van_Hanh_Live_${formatDateExcel(Date.now()).replace(/[\/:]/g, '_')}`;
    if (dateFilter === 'custom') {
      filename = `Bao_Cao_Van_Hanh_Live_${startDate}_to_${endDate}`;
    }

    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[var(--color-accent-green)]/10 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-[var(--color-accent-green)]" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight uppercase">LỊCH SỬ PHIÊN LIVE</h1>
          </div>
          <p className="text-[var(--color-text-muted)] text-lg">Truy xuất lịch sử phục vụ và danh sách Audit Trail các hoạt động.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-3 bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-xl p-1.5 focus-within:border-[var(--color-accent-gold)] focus-within:ring-1 focus-within:ring-[var(--color-accent-gold)] transition-all">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--color-text-muted)] ml-2" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateRange)}
                className="bg-transparent border-none text-white text-sm font-bold focus:ring-0 outline-none pr-4 py-2 cursor-pointer [color-scheme:dark]"
              >
                <option value="today" className="bg-[var(--color-bg-surface)] text-white">Hôm nay</option>
                <option value="yesterday" className="bg-[var(--color-bg-surface)] text-white">Hôm qua</option>
                <option value="7days" className="bg-[var(--color-bg-surface)] text-white">7 ngày qua</option>
                <option value="custom" className="bg-[var(--color-bg-surface)] text-white">Tùy chỉnh</option>
                <option value="all" className="bg-[var(--color-bg-surface)] text-white">Tất cả thời gian</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 border-l border-[var(--color-border-main)] pl-3 animate-in fade-in slide-in-from-left-2 duration-300">
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-medium rounded-lg px-2 py-1 focus:border-[var(--color-accent-gold)] outline-none cursor-pointer [color-scheme:dark] transition-colors"
                />
                <span className="text-[var(--color-text-muted)] text-xs">→</span>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-medium rounded-lg px-2 py-1 focus:border-[var(--color-accent-gold)] outline-none cursor-pointer [color-scheme:dark] transition-colors"
                />
              </div>
            )}
          </div>
          <button 
            onClick={handleExportExcel}
            disabled={completedSessions.length === 0}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg text-sm sm:text-base w-full sm:w-auto justify-center",
              completedSessions.length > 0 
                ? "bg-[var(--color-accent-gold)] text-black hover:scale-105 active:scale-95" 
                : "bg-[var(--color-border-main)] text-[var(--color-text-muted)] cursor-not-allowed"
            )}
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            XUẤT EXCEL ({completedSessions.length} PHIÊN)
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-border-main)]/30 border-b border-[var(--color-border-main)]">
                <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Mã Phiên</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Bàn</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Khách</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Giờ Vào</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Giờ Ra</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Tổng Hoá Đơn</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Số Sự Kiện (Audit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-main)]">
              {completedSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-[var(--color-text-muted)] italic">
                    Chưa có thông tin lịch sử phiên phục vụ nào.
                  </td>
                </tr>
              ) : (
                completedSessions.sort((a,b) => (b.closedAt || 0) - (a.closedAt || 0)).map((session) => {
                  const total = getSessionTotal(session.items);
                  const upsell = getUpsellRevenue(session.items);
                  return (
                    <tr key={session.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-blue)] transition-colors">#{session.id.split('_')[1]}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-white text-lg">
                        {getTableName(session.tableId)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-[var(--color-bg-main)] px-2 py-1 rounded text-sm text-[var(--color-text-muted)] border border-[var(--color-border-main)]">{session.guestCount}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                        {new Date(session.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                        {session.closedAt ? new Date(session.closedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "---"}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-[var(--color-accent-gold)] tracking-tight">{new Intl.NumberFormat('vi-VN').format(total)}đ</p>
                          {upsell > 0 && <p className="text-[10px] text-[var(--color-accent-green)] font-bold uppercase">+ {new Intl.NumberFormat('vi-VN').format(upsell)} upsell</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className="px-3 py-1 bg-[var(--color-border-main)]/50 rounded-full text-xs font-bold text-white border border-[var(--color-border-main)]">{session.eventLogs?.length || 0} event logs</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
