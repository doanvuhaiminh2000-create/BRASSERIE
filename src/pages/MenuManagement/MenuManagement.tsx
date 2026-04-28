import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { Upload, Search, CheckCircle2, AlertCircle, FileText, X, Layers, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from '../../components/ui/Toast';
import { confirmModal } from '../../components/ui/ConfirmModal';
import { parseMenuMapping, parseMenuRecipe } from '../../services/menuMatcher';
import { auditLogger } from '../../services/auditLogger';
import { MenuItemFull } from '../../types/store';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';

export function MenuManagement() {
  const { menu, setMenu, clearMenu, toggleMenuItemActive } = useApp();
  const [activeRootTab, setActiveRootTab] = useState<'MAPPING' | 'RECIPE'>('MAPPING');

  // Mapping Tab State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState<'ALL' | string>('ALL');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Recipe Tab State
  const [recipeUploadStatus, setRecipeUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [recipeErrorMsg, setRecipeErrorMsg] = useState<string | null>(null);
  const [unmatchedRecipes, setUnmatchedRecipes] = useState<Array<{ recipeName: string; cost: number; price: number; suggestions: string[]; selectedMatch?: string }>>([]);

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
      auditLogger.log('Tải danh sách Menu (Mapping)', { file: file.name, itemsCount: items.length });
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
      auditLogger.log('Tải định lượng Cost (Recipe)', { file: file.name, matched });
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
    try {
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
        auditLogger.log('Ghép thủ công Định lượng Cost', { recipeName: u.recipeName, menuName: menuDisplayNameEN, cost: u.cost });
        toast.success(`Đã cập nhật cost: ${menuDisplayNameEN}`);
      } else {
        toast.error(`Lỗi: Không tìm thấy món '${menuDisplayNameEN}' trong Menu.`);
        return;
      }
      
      // Remove from unmatched
      setUnmatchedRecipes(prev => prev.filter((_, i) => i !== unmatchedIdx));
    } catch (err: any) {
      console.error('Error in manual match:', err);
      toast.error(`Lỗi xử lý: ${err.message || 'Lỗi không xác định'}`);
    }
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
            
            <div className="flex gap-4 items-center">
              {menu.length > 0 && (
                <button
                   onClick={async () => {
                     const ok = await confirmModal({
                       title: 'Xóa toàn bộ menu',
                       message: 'Bạn có chắc chắn muốn xóa toàn bộ menu hiện tại? Hành động này không thể hoàn tác.',
                       confirmText: 'XÓA NGAY',
                       danger: true
                     });
                     if (ok) {
                       clearMenu();
                       auditLogger.log('Xóa toàn bộ Menu');
                     }
                   }}
                   className="flex items-center gap-2 px-6 py-3 bg-[var(--color-bg-surface)] border border-[var(--color-accent-red)] text-[var(--color-accent-red)] font-bold rounded-xl hover:bg-[var(--color-accent-red)] hover:text-white transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  <Trash2 className="w-5 h-5" />
                  XÓA MENU HIỆN TẠI
                </button>
              )}
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

            <div className="mt-4">
              <ResponsiveTable<MenuItemFull>
                data={filteredMenu}
                columns={[
                  { key: 'idx', label: 'STT', render: (item) => <span className="text-[var(--color-text-muted)]">{filteredMenu.indexOf(item) + 1}</span>, align: 'center', hideOnMobile: true },
                  { key: 'section', label: 'Section / Category', render: (item) => (
                    <div>
                      <div>{item.section}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{item.category}</div>
                    </div>
                  ) },
                  { key: 'name', label: 'Tên Món (EN/VN)', render: (item) => (
                    <div>
                      <div className="text-[var(--color-accent-gold)] font-bold">{item.displayNameEN}</div>
                      <div className="text-xs text-white font-normal">{item.displayName}</div>
                    </div>
                  ), primary: true },
                  { key: 'price', label: 'Giá VAT (VND)', render: (item) => <span className="tabular-nums text-white">{(item.price).toLocaleString('vi-VN')}</span>, align: 'right' },
                  { key: 'pos', label: 'Mã POS', render: (item) => <span className="font-mono text-[var(--color-text-muted)]">{item.posCode}</span>, hideOnMobile: true },
                  { key: 'status', label: 'Trạng Thái', render: (item) => (
                    <button 
                      onClick={() => toggleMenuItemActive(item.posCode)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider whitespace-nowrap",
                        item.isActive ? "bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)]" : "bg-[var(--color-border-main)] text-[var(--color-text-muted)]"
                      )}
                    >
                      {item.isActive ? 'Bật' : 'Tắt'}
                    </button>
                  ), align: 'center' }
                ]}
                keyExtractor={(item) => item.posCode}
                emptyText="Không tìm thấy món nào phù hợp."
              />
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
            
            <div className="flex gap-4 items-center">
              {menu.some(m => m.cost !== undefined && m.cost > 0) && (
                <button
                   onClick={async () => {
                     const ok = await confirmModal({
                       title: 'Xóa cost định lượng',
                       message: 'Bạn có chắc chắn muốn xóa toàn bộ dữ liệu định lượng (Cost) đã liên kết? (Danh sách món vẫn được giữ nguyên)',
                       confirmText: 'XÓA COST',
                       danger: true
                     });
                     if (ok) {
                       const clearedMenu = menu.map(m => ({
                         ...m,
                         cost: undefined,
                         priceFromRecipe: undefined,
                         costSource: undefined,
                         recipeMatchMethod: undefined,
                         costUpdatedAt: undefined
                       }));
                       await setMenu(clearedMenu);
                       auditLogger.log('Xóa dữ liệu Định lượng (Cost)');
                       toast.success("Đã xóa toàn bộ dữ liệu định lượng (Cost)");
                     }
                   }}
                   className="flex items-center gap-2 px-6 py-3 bg-[var(--color-bg-surface)] border border-[var(--color-accent-red)] text-[var(--color-accent-red)] font-bold rounded-xl hover:bg-[var(--color-accent-red)] hover:text-white transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  <Trash2 className="w-5 h-5" />
                  XÓA ĐỊNH LƯỢNG (COST)
                </button>
              )}
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
              
              <div className="mt-4">
                <ResponsiveTable<any>
                  data={unmatchedRecipes}
                  columns={[
                    { key: 'name', label: 'Tên trong Định lượng', render: (u) => <span className="text-white font-medium">{u.recipeName}</span>, primary: true },
                    { key: 'cost', label: 'Mức Cost (VND)', render: (u) => <span className="text-[var(--color-accent-blue)] font-bold tabular-nums">{u.cost.toLocaleString('vi-VN')}</span>, align: 'right' },
                    { key: 'select', label: 'Gợi ý & Chọn món', render: (u) => {
                      const i = unmatchedRecipes.indexOf(u);
                      return (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <select 
                              className="bg-[var(--color-bg-surface)] text-white text-xs px-3 py-2 rounded-lg border border-[var(--color-border-main)] focus:border-amber-500 outline-none flex-1 max-w-full sm:max-w-[200px]"
                              onChange={(e) => {
                                const newUnmatched = [...unmatchedRecipes];
                                newUnmatched[i].selectedMatch = e.target.value;
                                setUnmatchedRecipes(newUnmatched);
                              }}
                              value={u.selectedMatch || ""}
                            >
                              <option value="" disabled>-- Chọn món --</option>
                              <optgroup label="✨ Gợi ý">
                                {u.suggestions.map(s => (
                                  <option value={s} key={s}>★ {s}</option>
                                ))}
                              </optgroup>
                              <optgroup label="Menu Online">
                                {menu.map(m => (
                                  <option key={m.posCode} value={m.displayNameEN}>{m.displayNameEN}</option>
                                ))}
                              </optgroup>
                            </select>
                            {u.selectedMatch && (
                              <button 
                                onClick={() => handleManualMatch(i, u.selectedMatch!)}
                                className="px-3 py-1.5 bg-amber-500 text-black font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors whitespace-nowrap"
                              >
                                Xác nhận
                              </button>
                            )}
                          </div>
                      );
                    } },
                    { key: 'action', label: 'Hành động', render: (u) => {
                      const i = unmatchedRecipes.indexOf(u);
                      return (
                          <button 
                            onClick={() => skipUnmatched(i)}
                            className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                          >
                            Bỏ qua
                          </button>
                      );
                    }, align: 'center' }
                  ]}
                  keyExtractor={(u) => `${u.recipeName}-${unmatchedRecipes.indexOf(u)}`}
                  emptyText="Không có dữ liệu"
                />
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
            <div className="mt-4">
              <ResponsiveTable<MenuItemFull>
                data={menu}
                columns={[
                  { key: 'name', label: 'Tên Món (EN)', render: (item) => <span className="text-white font-medium">{item.displayNameEN}</span>, primary: true },
                  { key: 'price', label: 'Giá Bán', render: (item) => <span className="tabular-nums text-white">{(item.price).toLocaleString('vi-VN')}</span>, align: 'right' },
                  { key: 'cost', label: 'Mức Cost (VND)', render: (item) => {
                     const isCostLoaded = item.cost !== undefined && item.cost > 0;
                     return <span className={cn("tabular-nums font-bold", isCostLoaded ? "text-[var(--color-accent-blue)]" : "text-[var(--color-text-muted)]")}>{isCostLoaded ? item.cost!.toLocaleString('vi-VN') : 'N/A'}</span>;
                  }, align: 'right' },
                  { key: 'source', label: 'Nguồn Cost', render: (item) => <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest font-mono">{item.costSource || 'N/A'}</span>, align: 'right', hideOnMobile: true },
                  { key: 'margin', label: 'Margin (%)', render: (item) => {
                     const isCostLoaded = item.cost !== undefined && item.cost > 0;
                     const margin = isCostLoaded ? ((item.price - item.cost!) / item.price) * 100 : 0;
                     return <span className={cn("tabular-nums font-bold", isCostLoaded ? (margin > 60 ? "text-[var(--color-accent-green)]" : "text-[var(--color-accent-gold)]") : "text-[var(--color-text-muted)]")}>{isCostLoaded ? `${margin.toFixed(1)}%` : '-'}</span>;
                  }, align: 'center' }
                ]}
                keyExtractor={(item) => item.posCode}
                emptyText="Chưa có thông tin menu. Vui lòng tải tab Mapping trước."
              />
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
