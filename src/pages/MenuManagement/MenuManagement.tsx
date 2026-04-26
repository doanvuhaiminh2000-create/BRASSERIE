import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { Upload, Search, CheckCircle2, AlertCircle, FileText, X, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseMenuMapping, parseMenuRecipe } from '../../services/menuMatcher';
import { MenuItemFull } from '../../types/store';

export function MenuManagement() {
  const { menu, setMenu, toggleMenuItemActive } = useApp();
  const [activeRootTab, setActiveRootTab] = useState<'MAPPING' | 'RECIPE'>('MAPPING');

  // Mapping Tab State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState<'ALL' | string>('ALL');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Recipe Tab State
  const [recipeUploadStatus, setRecipeUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [recipeErrorMsg, setRecipeErrorMsg] = useState<string | null>(null);
  const [unmatchedRecipes, setUnmatchedRecipes] = useState<Array<{ recipeName: string; cost: number; price: number; suggestions: string[] }>>([]);

  const sections = Array.from(new Set(menu.map(m => m.section))).filter(Boolean);

  const handleMappingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('uploading');
    setErrorMsg(null);

    try {
      const { items, errors } = await parseMenuMapping(file);
      
      if (items.length === 0) {
         throw new Error("Không tìm thấy dữ liệu hợp lệ trong file mapping.");
      }
      
      let warning = errors.length > 0 ? `Có ${errors.length} dòng bị bỏ qua do thiếu Tên/Mã POS.` : "";

      await setMenu(items);
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

  const handleRecipeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (menu.length === 0) {
      setRecipeUploadStatus('error');
      setRecipeErrorMsg("Vui lòng upload Menu Mapping trước khi tải file định lượng.");
      e.target.value = '';
      return;
    }

    setRecipeUploadStatus('uploading');
    setRecipeErrorMsg(null);
    setUnmatchedRecipes([]);

    try {
      const { updatedMenu, unmatched, matched } = await parseMenuRecipe(file, menu);
      
      let warning = "";
      if (unmatched.length > 0) {
        warning = `Có ${unmatched.length} món KHÔNG match tự động được. Vui lòng kiểm tra bảng bên dưới.`;
        setUnmatchedRecipes(unmatched);
      }

      await setMenu(updatedMenu);
      setRecipeUploadStatus('success');
      setRecipeErrorMsg(warning || `Đã liên kết giá cost thành công ${matched} món!`);

      setTimeout(() => {
        setRecipeUploadStatus('idle');
        if (!warning) setRecipeErrorMsg(null);
      }, 3000);

    } catch (error: any) {
      console.error(error);
      setRecipeErrorMsg(error.message || 'Có lỗi xảy ra khi xử lý file.');
      setRecipeUploadStatus('error');
    }
    e.target.value = '';
  };

  const handleManualMatch = async (unmatchedIdx: number, menuDisplayNameEN: string) => {
    if (!menuDisplayNameEN) return;
    const u = unmatchedRecipes[unmatchedIdx];
    
    // Find menu item and update
    const newMenu = [...menu];
    const matchIdx = newMenu.findIndex(m => m.displayNameEN === menuDisplayNameEN);
    if (matchIdx >= 0) {
      newMenu[matchIdx] = {
        ...newMenu[matchIdx],
        cost: u.cost,
        priceFromRecipe: u.price,
        costSource: 'manual',
        recipeMatchMethod: 'manual',
        costUpdatedAt: Date.now()
      };
      await setMenu(newMenu);
    }
    
    // Remove from unmatched
    setUnmatchedRecipes(prev => prev.filter((_, i) => i !== unmatchedIdx));
  };

  const skipUnmatched = (unmatchedIdx: number) => {
    setUnmatchedRecipes(prev => prev.filter((_, i) => i !== unmatchedIdx));
  };


  const filteredMenu = menu.filter(item => {
    const matchSearch = item.displayNameEN.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.posCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSection = filterSection === 'ALL' || item.section === filterSection;
    return matchSearch && matchSection;
  });

  const costCoverage = menu.filter(m => m.cost !== undefined && m.cost > 0).length;

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* TABS */}
      <div className="flex border-b border-[var(--color-border-main)] mb-8">
        <button 
          onClick={() => setActiveRootTab('MAPPING')}
          className={`px-8 py-4 font-black tracking-widest uppercase transition-all ${activeRootTab === 'MAPPING' ? 'text-[var(--color-accent-gold)] border-b-2 border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/5' : 'text-[var(--color-text-muted)] hover:text-white'}`}
        >
          MÓN ĐANG BÁN (Menu_online)
        </button>
        <button 
          onClick={() => setActiveRootTab('RECIPE')}
          className={`px-8 py-4 font-black tracking-widest uppercase transition-all ${activeRootTab === 'RECIPE' ? 'text-[var(--color-accent-blue)] border-b-2 border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/5' : 'text-[var(--color-text-muted)] hover:text-white'}`}
        >
          NHẬP LIỆU ĐỊNH LƯỢNG (Recipe)
        </button>
      </div>

      {activeRootTab === 'MAPPING' && (
        <div className="animate-in fade-in">
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
                type="file" id="menu-upload" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleMappingUpload}
              />
              <label htmlFor="menu-upload" className="flex items-center gap-2 px-6 py-3 bg-[var(--color-bg-surface)] border border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] font-bold rounded-xl hover:bg-[var(--color-accent-gold)] hover:text-black transition-all cursor-pointer shadow-lg">
                <Upload className="w-5 h-5" />
                TẢI FILE MENU (Mapping)
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6">
              <p className="text-[var(--color-text-muted)] text-sm font-bold uppercase tracking-wider mb-2">Tổng số món</p>
              <div className="text-3xl font-black text-white">{menu.length}</div>
            </div>
            <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 md:col-span-3">
              <p className="text-[var(--color-text-muted)] text-sm font-bold uppercase tracking-wider mb-2">Phân bổ nhóm (Section)</p>
              <div className="flex gap-4 text-sm text-[var(--color-text-muted)] overflow-x-auto truncate">
                {sections.map(s => (
                  <div key={s}><strong>{s}:</strong> {menu.filter(m => m.section === s).length}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border-main)] flex flex-wrap gap-4 items-center bg-[var(--color-bg-main)]">
              <div className="relative max-w-sm w-full">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input 
                  type="text" placeholder="Tìm tên EN, VN, mã POS..."
                  className="w-full bg-[var(--color-bg-surface)] text-white pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border-main)] focus:border-[var(--color-accent-gold)] outline-none"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="bg-[var(--color-bg-surface)] text-white px-4 py-2.5 rounded-xl border border-[var(--color-border-main)] focus:border-[var(--color-accent-gold)] outline-none"
                value={filterSection} onChange={(e) => setFilterSection(e.target.value)}
              >
                <option value="ALL">Tất cả Nhóm (Section)</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-[var(--color-bg-main)] text-[var(--color-text-muted)] text-xs uppercase tracking-wider border-b border-[var(--color-border-main)]">
                    <th className="p-4">STT</th>
                    <th className="p-4">Section / Category</th>
                    <th className="p-4">Tên Món (EN/VN)</th>
                    <th className="p-4 text-right">Giá VAT (VND)</th>
                    <th className="p-4">Mã POS</th>
                    <th className="p-4 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredMenu.map((item, idx) => (
                    <tr key={item.posCode} className="border-b border-[var(--color-border-main)] hover:bg-white/5 transition-colors">
                      <td className="p-4 text-[var(--color-text-muted)]">{idx + 1}</td>
                      <td className="p-4 text-white font-medium">
                        <div>{item.section}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{item.category}</div>
                      </td>
                      <td className="p-4 text-[var(--color-accent-gold)] font-bold">
                        <div>{item.displayNameEN}</div>
                        <div className="text-xs text-white font-normal">{item.displayName}</div>
                      </td>
                      <td className="p-4 text-right tabular-nums text-white">{(item.price).toLocaleString('vi-VN')}</td>
                      <td className="p-4 font-mono text-[var(--color-text-muted)]">{item.posCode}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => toggleMenuItemActive(item.posCode)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider",
                            item.isActive ? "bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)]" : "bg-[var(--color-border-main)] text-[var(--color-text-muted)]"
                          )}
                        >
                          {item.isActive ? 'Bật' : 'Tắt'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMenu.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[var(--color-text-muted)]">Không tìm thấy món nào phù hợp.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeRootTab === 'RECIPE' && (
        <div className="animate-in fade-in">
          <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[var(--color-accent-blue)]/10 rounded-lg text-[var(--color-accent-blue)]">
                  <Layers className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Định lượng & Giá Cost</h1>
              </div>
              <p className="text-[var(--color-text-muted)] text-lg">Phân phối giá cost từ file định lượng (menu_định_lượng.xlsx) vào danh sách món ăn hiện hành dựa trên Tên Tiếng Anh.</p>
            </div>
            
            <div className="flex gap-4">
              <input 
                type="file" id="recipe-upload" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleRecipeUpload}
              />
              <label htmlFor="recipe-upload" className="flex items-center gap-2 px-6 py-3 bg-[var(--color-bg-surface)] border border-[var(--color-accent-blue)] text-[var(--color-accent-blue)] font-bold rounded-xl hover:bg-[var(--color-accent-blue)] hover:text-white transition-all cursor-pointer shadow-lg">
                <Upload className="w-5 h-5" />
                TẢI FILE ĐỊNH LƯỢNG (Recipe)
              </label>
            </div>
          </div>

          {recipeErrorMsg && (
            <div className={cn("mb-6 p-4 rounded-xl flex items-start gap-3", recipeUploadStatus === 'success' ? "bg-[var(--color-accent-blue)]/10 border border-[var(--color-accent-blue)]/30 text-[var(--color-accent-blue)]" : "bg-[var(--color-accent-red)]/10 border border-[var(--color-accent-red)]/20 text-[var(--color-accent-red)]")}>
               {recipeUploadStatus === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
               <p className="text-sm font-medium">{recipeErrorMsg}</p>
               {recipeUploadStatus !== 'uploading' && <button onClick={() => setRecipeErrorMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>}
            </div>
          )}

          {unmatchedRecipes.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-8 shadow-lg">
              <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2 text-lg">
                <AlertCircle className="w-5 h-5" />
                Cần Xử Lý {unmatchedRecipes.length} Món
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                Những món này trong file Định lượng không có tên chính xác hoặc không đủ độ tương đồng với Menu Online. Vui lòng chọn món tương ứng từ Menu hoặc bỏ qua nếu món này không còn bán.
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-amber-500/10 text-amber-500 text-xs uppercase tracking-wider border-b border-amber-500/30">
                      <th className="p-3">Tên trong Định lượng</th>
                      <th className="p-3 text-right">Mức Cost (VND)</th>
                      <th className="p-3">Gợi ý & Chọn món</th>
                      <th className="p-3 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {unmatchedRecipes.map((u, i) => (
                      <tr key={i} className="border-b border-amber-500/10 hover:bg-white/5 transition-colors">
                        <td className="p-3 text-white font-medium">{u.recipeName}</td>
                        <td className="p-3 text-right text-[var(--color-accent-blue)] font-bold">{u.cost.toLocaleString('vi-VN')}</td>
                        <td className="p-3">
                          <select 
                            className="bg-[var(--color-bg-surface)] text-white text-xs px-3 py-2 rounded-lg border border-[var(--color-border-main)] focus:border-amber-500 outline-none w-full max-w-sm"
                            onChange={(e) => handleManualMatch(i, e.target.value)}
                            defaultValue=""
                          >
                            <option value="" disabled>-- Chọn món tương ứng --</option>
                            <optgroup label="✨ Món có tên gần giống">
                              {u.suggestions.map(s => (
                                <option value={s} key={s}>★ {s}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Tất cả món trong Menu Online">
                              {menu.map(m => (
                                <option key={m.posCode} value={m.displayNameEN}>{m.displayNameEN}</option>
                              ))}
                            </optgroup>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => skipUnmatched(i)}
                            className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Bỏ qua
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6">
              <p className="text-[var(--color-text-muted)] text-sm font-bold uppercase tracking-wider mb-2">Đã liên kết giá cost</p>
              <div className="text-3xl font-black text-[var(--color-accent-blue)]">{costCoverage} / {menu.length} <span className="text-lg text-[var(--color-text-muted)] font-medium tracking-tight ml-2">món</span></div>
            </div>
          </div>

          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-[var(--color-bg-main)] text-[var(--color-text-muted)] text-xs uppercase tracking-wider border-b border-[var(--color-border-main)]">
                    <th className="p-4">Tên Món (EN)</th>
                    <th className="p-4 text-right">Giá Bán</th>
                    <th className="p-4 text-right">Mức Cost (VND)</th>
                    <th className="p-4 text-right">Nguồn Cost</th>
                    <th className="p-4 text-center">Margin (%)</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {menu.map(item => {
                     const isCostLoaded = item.cost !== undefined && item.cost > 0;
                     const margin = isCostLoaded ? ((item.price - item.cost!) / item.price) * 100 : 0;
                     
                     return (
                       <tr key={item.posCode} className="border-b border-[var(--color-border-main)] hover:bg-white/5 transition-colors">
                         <td className="p-4 text-white font-medium">{item.displayNameEN}</td>
                         <td className="p-4 text-right tabular-nums text-white">{(item.price).toLocaleString('vi-VN')}</td>
                         <td className={cn("p-4 text-right tabular-nums font-bold", isCostLoaded ? "text-[var(--color-accent-blue)]" : "text-[var(--color-text-muted)]")}>
                           {isCostLoaded ? item.cost!.toLocaleString('vi-VN') : 'N/A'}
                         </td>
                         <td className="p-4 text-right text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest font-mono">
                           {item.costSource || 'N/A'}
                         </td>
                         <td className={cn("p-4 text-center tabular-nums font-bold", isCostLoaded ? (margin > 60 ? "text-[var(--color-accent-green)]" : "text-[var(--color-accent-gold)]") : "text-[var(--color-text-muted)]")}>
                           {isCostLoaded ? `${margin.toFixed(1)}%` : '-'}
                         </td>
                       </tr>
                     );
                  })}
                  {menu.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[var(--color-text-muted)]">Chưa có thông tin menu. Vui lòng tải tab Mapping trước.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
