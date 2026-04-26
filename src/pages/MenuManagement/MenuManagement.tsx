import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { Upload, Search, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseFile } from '../../lib/posDataParser';
import { MenuSection, MenuPOSCategory, MenuItem } from '../../types';

export function MenuManagement() {
  const { menu, setMenu, toggleMenuItemActive } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState<MenuSection | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<MenuPOSCategory | 'ALL'>('ALL');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sections: MenuSection[] = ['APPETIZER', 'BURGER, PASTA, PIZZA', 'MAIN DISHES', 'PREMIUM', 'DESSERTS'];
  const categories: MenuPOSCategory[] = ['F04 - BREAD', 'F17 - SOUP', 'F14 - SALAD', 'F23 - PIZZA', 'F22 - NOODLES', 'F25 - MAIN COURSE', 'F05 - BURGER', 'F10 - GRILLED', 'F01 - A LA CARTE'];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('uploading');
    setErrorMsg(null);

    try {
      const rawData = await parseFile<any>(file);
      const parsed: MenuItem[] = [];

      for (const row of rawData) {
        const sttRaw = String(row['STT'] ?? '').trim();
        // Skip section header rows
        if (sttRaw.includes('▶') || !sttRaw || isNaN(Number(sttRaw))) continue;

        const section = String(row['PHẦN\nMENU'] ?? row['PHẦN MENU'] ?? '').trim() as MenuSection;
        const nameEN = String(row['TÊN MÓN (TIẾNG ANH)\n[Menu nhà hàng]'] ?? '').trim();
        const nameVI = String(row['TÊN MÓN (TIẾNG VIỆT)\n[Việt hoá]'] ?? '').trim();
        const price = Number(row['GIÁ BÁN\n(Có VAT)']);
        const posCodeRaw = row['MÃ SẢN PHẨM\nPOS (PRODNUM)'] ?? row['MÃ SẢN PHẨM POS (PRODNUM)'];
        const posCode = String(posCodeRaw).split('.')[0].trim();
        const posName = String(row['TÊN TRÊN POS'] ?? '').trim();
        const category = String(row['DANH MỤC POS\n(CATEGORY)'] ?? row['DANH MỤC POS (CATEGORY)'] ?? '').trim() as MenuPOSCategory;

        if (!nameEN || !posCode || isNaN(price)) continue;

        // Mapping category → station
        const station: 'P' | 'N' | 'L' | 'B' =
          category.includes('PIZZA') ? 'P' :
          (category.includes('NOODLES') || category.includes('MAIN COURSE') || category.includes('GRILLED') || category.includes('BURGER')) ? 'N' :
          (category.includes('SALAD') || category.includes('SOUP') || category.includes('BREAD')) ? 'L' :
          'B';

        parsed.push({
          id: posCode,
          posCode,
          posName,
          displayNameEN: nameEN,
          displayName: nameVI || nameEN,
          section,
          category,
          price,
          isActive: true,
          station,
          cookTime: 10,
          complexity: 2
        });
      }

      if (parsed.length === 0) {
         throw new Error("Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra lại cấu trúc file Menu_online.xlsx.");
      }
      
      let warning = "";
      if (parsed.length !== 69) {
        warning = `Cảnh báo: parse được ${parsed.length} món, kỳ vọng đúng 69 món. `;
      }

      setMenu(parsed);
      setUploadStatus('success');
      setErrorMsg(warning || "Tải lên thành công!");

      setTimeout(() => {
        setUploadStatus('idle');
        if (!warning) setErrorMsg(null);
      }, 3000);

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Có lỗi xảy ra khi xử lý file.');
      setUploadStatus('error');
    }
    
    e.target.value = '';
  };

  const filteredMenu = menu.filter(item => {
    const matchSearch = item.displayNameEN.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.posCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSection = filterSection === 'ALL' || item.section === filterSection;
    const matchCategory = filterCategory === 'ALL' || item.category === filterCategory;
    return matchSearch && matchSection && matchCategory;
  });

  const activeCount = menu.filter(m => m.isActive).length;

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[var(--color-accent-gold)]/10 rounded-lg text-[var(--color-accent-gold)]">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Quản Lý Menu</h1>
          </div>
          <p className="text-[var(--color-text-muted)] text-lg">Đồng bộ danh sách sản phẩm từ file Excel (Menu_online) để kết nối với hệ thống POS.</p>
        </div>
        
        <div className="flex gap-4">
          <input 
            type="file" 
            id="menu-upload" 
            className="hidden" 
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
          />
          <label 
            htmlFor="menu-upload"
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-bg-surface)] border border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] font-bold rounded-xl hover:bg-[var(--color-accent-gold)] hover:text-black transition-all cursor-pointer shadow-lg"
          >
            <Upload className="w-5 h-5" />
            TẢI FILE MENU EXCEL
          </label>
        </div>
      </div>

      {errorMsg && (
        <div className={cn("mb-6 p-4 rounded-xl flex items-start gap-3", uploadStatus === 'success' ? "bg-[var(--color-accent-gold)]/10 border border-[var(--color-accent-gold)]/30 text-[var(--color-accent-gold)]" : "bg-[var(--color-accent-red)]/10 border border-[var(--color-accent-red)]/20 text-[var(--color-accent-red)]")}>
           {uploadStatus === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
           <p className="text-sm font-medium">{errorMsg}</p>
           {uploadStatus !== 'uploading' && <button onClick={() => setErrorMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6">
          <p className="text-[var(--color-text-muted)] text-sm font-bold uppercase tracking-wider mb-2">Tổng số món</p>
          <div className="text-3xl font-black text-white">{menu.length}</div>
        </div>
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6">
          <p className="text-[var(--color-text-muted)] text-sm font-bold uppercase tracking-wider mb-2">Đang Active</p>
          <div className="text-3xl font-black text-[var(--color-accent-green)]">{activeCount}</div>
        </div>
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 md:col-span-2">
          <p className="text-[var(--color-text-muted)] text-sm font-bold uppercase tracking-wider mb-2">Phân bổ theo nhóm</p>
          <div className="flex gap-4 text-sm text-[var(--color-text-muted)]">
            <div><strong>Appetizer:</strong> {menu.filter(m => m.section === 'APPETIZER').length}</div>
            <div><strong>Main/Pasta/Pizza:</strong> {menu.filter(m => m.section === 'BURGER, PASTA, PIZZA' || m.section === 'MAIN DISHES').length}</div>
            <div><strong>Premium:</strong> {menu.filter(m => m.section === 'PREMIUM').length}</div>
            <div><strong>Desserts:</strong> {menu.filter(m => m.section === 'DESSERTS').length}</div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl shadow-xl overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-[var(--color-border-main)] flex flex-wrap gap-4 items-center bg-[var(--color-bg-main)]">
          <div className="relative max-w-sm w-full">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input 
              type="text"
              placeholder="Tìm tên EN, VN, mã POS..."
              className="w-full bg-[var(--color-bg-surface)] text-white pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border-main)] focus:border-[var(--color-accent-gold)] outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="bg-[var(--color-bg-surface)] text-white px-4 py-2.5 rounded-xl border border-[var(--color-border-main)] focus:border-[var(--color-accent-gold)] outline-none"
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value as any)}
          >
            <option value="ALL">Tất cả Nhóm (Section)</option>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            className="bg-[var(--color-bg-surface)] text-white px-4 py-2.5 rounded-xl border border-[var(--color-border-main)] focus:border-[var(--color-accent-gold)] outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
          >
            <option value="ALL">Tất cả Category (POS)</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[var(--color-bg-main)] text-[var(--color-text-muted)] text-xs uppercase tracking-wider border-b border-[var(--color-border-main)]">
                <th className="p-4">STT</th>
                <th className="p-4">Section</th>
                <th className="p-4">Tên Món (EN)</th>
                <th className="p-4">Tên Món (VN)</th>
                <th className="p-4 text-right">Giá VAT (VND)</th>
                <th className="p-4">Mã POS</th>
                <th className="p-4">Danh Mục POS</th>
                <th className="p-4 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredMenu.map((item, idx) => (
                <tr key={item.id} className="border-b border-[var(--color-border-main)] hover:bg-white/5 transition-colors">
                  <td className="p-4 text-[var(--color-text-muted)]">{idx + 1}</td>
                  <td className="p-4 text-white font-medium">{item.section}</td>
                  <td className="p-4 text-[var(--color-accent-gold)] font-bold">{item.displayNameEN}</td>
                  <td className="p-4 text-white">{item.displayName}</td>
                  <td className="p-4 text-right tabular-nums text-white">{(item.price).toLocaleString('vi-VN')}</td>
                  <td className="p-4 font-mono text-[var(--color-text-muted)]">{item.posCode}</td>
                  <td className="p-4 text-white">{item.category}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleMenuItemActive(item.id)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold transition-all",
                        item.isActive ? "bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)]" : "bg-[var(--color-border-main)] text-[var(--color-text-muted)]"
                      )}
                    >
                      {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMenu.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[var(--color-text-muted)]">Không tìm thấy món nào phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
