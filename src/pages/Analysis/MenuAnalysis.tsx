import React, { useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, BarChart, Bar, Legend, PieChart, Pie } from 'recharts';
import { Star, DollarSign, TrendingUp, AlertTriangle, ArrowRight, Search, Layers, Database } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { useApp } from '../../store/AppContext';
import { DateRangePicker, getDateRangeStrings } from '../../components/DateRangePicker';
import { useNavigate } from 'react-router-dom';
import { AnalysisSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

function DataSourceCard({ label, count, total, suffix, dateRange, isReady, actionLabel, onAction }: any) {
  return (
    <div className={cn("bg-[var(--color-bg-surface)] border rounded-2xl p-4 flex flex-col justify-between", isReady ? "border-[var(--color-border-main)]" : "border-amber-500/30 bg-amber-500/5")}>
      <div>
        <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider mb-1">{label}</p>
        {isReady ? (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{count}</span>
            {total && <span className="text-lg text-[var(--color-text-muted)]">/ {total}</span>}
            <span className="text-xs text-[var(--color-text-muted)]">{suffix}</span>
          </div>
        ) : (
          <span className="text-sm font-medium text-amber-500">Chưa có dữ liệu</span>
        )}
        {dateRange && <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{dateRange}</p>}
      </div>
      <button onClick={onAction} className="mt-4 flex items-center justify-between text-xs font-bold text-[var(--color-accent-blue)] hover:text-white transition-colors">
        {actionLabel} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function Toggle({ checked, onChange, label }: any) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={cn("block w-10 h-6 rounded-full transition-colors", checked ? "bg-[var(--color-accent-green)]" : "bg-[var(--color-bg-main)] border border-[var(--color-border-main)]")}></div>
        <div className={cn("absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform", checked ? "translate-x-4" : "")}></div>
      </div>
      <span className="text-sm font-medium text-white group-hover:text-[var(--color-accent-gold)] transition-colors">{label}</span>
    </label>
  );
}

export function MenuAnalysis() {
  const { menu, sessions, posBatches, isReady } = useApp();
  const navigate = useNavigate();

  const [dateFilter, setDateFilter] = useState<string>('thisMonth');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [onlyActiveMenu, setOnlyActiveMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'MATRIX' | 'TABLE' | 'SECTION'>('MATRIX');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTop50, setShowTop50] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [hoveredQuadrant, setHoveredQuadrant] = useState<string | null>(null);

  const activeRange = useMemo(() => getDateRangeStrings(dateFilter, startDate, endDate), [dateFilter, startDate, endDate]);

  const posDateRange = useMemo(() => {
    if (!posBatches.length) return null;
    let min = Infinity;
    let max = 0;
    posBatches.forEach(b => {
      min = Math.min(min, new Date(b.dateFrom).getTime());
      max = Math.max(max, new Date(b.dateTo).getTime());
    });
    return `${new Date(min).toLocaleDateString('vi-VN')} → ${new Date(max).toLocaleDateString('vi-VN')}`;
  }, [posBatches]);

  const menuMatrix = useMemo(() => {
    const startMs = new Date(activeRange.start).setHours(0,0,0,0);
    const endMs = new Date(activeRange.end).setHours(23,59,59,999);

    // 1. Volume từ POS
    const posVolMap = new Map<string, { qty: number; revenue: number; name: string }>();
    for (const batch of posBatches) {
      for (const d of batch.details) {
        if (d.timeOrder < startMs || d.timeOrder > endMs) continue;
        const code = String(d.productId).replace(/^S\d+P/, '').trim();
        const cur = posVolMap.get(code) || { qty: 0, revenue: 0, name: d.productName };
        cur.qty += Number(d.quantity) || 0;
        cur.revenue += Number(d.finalAmount) || 0;
        posVolMap.set(code, cur);
      }
    }

    // 2. Volume từ Live Entry
    const liveVolMap = new Map<string, { qty: number; revenue: number }>();
    sessions.filter(s => s.status === 'COMPLETED' 
                      && s.openedAt >= startMs 
                      && s.openedAt <= endMs).forEach(s => {
      s.items.filter(i => i.status !== 'CANCELED').forEach(i => {
        const code = i.menuItem.posCode;
        const cur = liveVolMap.get(code) || { qty: 0, revenue: 0 };
        cur.qty += i.quantity;
        cur.revenue += i.menuItem.price * i.quantity;
        liveVolMap.set(code, cur);
      });
    });

    // 3. Build dataset
    const menuPosCodes = new Set(menu.map(m => m.posCode));
    let baseMenu: any[] = onlyActiveMenu ? menu.filter(m => m.isActive) : [...menu];

    // Thêm ghost items từ POS nếu không filter
    if (!onlyActiveMenu) {
      for (const [code, posData] of posVolMap.entries()) {
        if (!menuPosCodes.has(code)) {
          baseMenu.push({
            posCode: code,
            displayNameEN: posData.name,
            displayName: posData.name,
            price: posData.qty > 0 ? Math.round(posData.revenue / posData.qty) : 0,
            section: 'LEGACY',
            isActive: false,
            isGhost: true
          });
        }
      }
    }

    let dataset = baseMenu.map(m => {
      const pos = posVolMap.get(m.posCode) || { qty: 0, revenue: 0 };
      const live = liveVolMap.get(m.posCode) || { qty: 0, revenue: 0 };
      const totalQty = pos.qty + live.qty;
      const totalRev = pos.revenue + live.revenue;
      
      const hasRecipeCost = !!m.cost;
      const cost = m.cost ?? Math.round(m.price * 0.30);  // fallback 30%
      const margin = m.price - cost;
      const marginPct = m.price > 0 ? (margin / m.price) * 100 : 0;
      const grossProfit = margin * totalQty;

      return { 
        ...m, 
        cost, hasRecipeCost,
        margin, marginPct, grossProfit,
        qty: totalQty, revenue: totalRev,
        qtyFromPOS: pos.qty, qtyFromLive: live.qty
      };
    });

    // 4. Phân loại theo MEDIAN
    const withVol = dataset.filter((d: any) => d.qty > 0);
    if (withVol.length === 0) {
      return dataset.map((d: any) => ({...d, category: 'NoData' as const, categoryLabel: 'NoData', recommendation: 'Cần thêm dữ liệu bán hàng', medQty: 0, medMargin: 0}));
    }
    const sortedQty = [...withVol].map(d => d.qty).sort((a,b) => a-b);
    const sortedMargin = [...withVol].map(d => d.marginPct).sort((a,b) => a-b);
    const medQty = sortedQty[Math.floor(sortedQty.length/2)];
    const medMargin = sortedMargin[Math.floor(sortedMargin.length/2)];

    return dataset.map((d: any) => {
      let category = 'Dog';
      let categoryLabel = 'Dog';
      let recommendation = '';
      if (d.qty === 0) { category = 'NoData'; categoryLabel = 'NoData'; recommendation = 'Cần thêm dữ liệu bán hàng'; }
      else if (d.qty >= medQty && d.marginPct >= medMargin) { category = 'Star'; categoryLabel = 'Star'; recommendation = '✅ Đẩy mạnh upsell, giữ chất lượng'; }
      else if (d.qty >= medQty && d.marginPct < medMargin) { category = 'PlowHorse'; categoryLabel = 'Plow Horse'; recommendation = '⚠️ Tối ưu cost hoặc tăng giá nhẹ'; }
      else if (d.qty < medQty && d.marginPct >= medMargin) { category = 'Puzzle'; categoryLabel = 'Puzzle'; recommendation = '📣 Cải thiện marketing/đặt vị trí menu'; }
      else { category = 'Dog'; categoryLabel = 'Dog'; recommendation = '🗑️ Xem xét loại bỏ hoặc làm lại công thức'; }
      return { ...d, category, categoryLabel, recommendation, medQty, medMargin };
    });
  }, [menu, sessions, posBatches, onlyActiveMenu, activeRange]);

  const globalMedQty = menuMatrix.length && menuMatrix[0].medQty ? menuMatrix[0].medQty : 0;
  const globalMedMargin = menuMatrix.length && menuMatrix[0].medMargin ? menuMatrix[0].medMargin : 0;

  const totalVol = menuMatrix.reduce((acc: number, d: any) => acc + d.qty, 0);
  const totalRev = menuMatrix.reduce((acc: number, d: any) => acc + d.revenue, 0);
  const totalGP = menuMatrix.reduce((acc: number, d: any) => acc + d.grossProfit, 0);
  const avgMargin = totalRev > 0 ? (totalGP / totalRev) * 100 : 0;

  const withVolData = menuMatrix.filter((m: any) => m.qty > 0);
  const starsCount = withVolData.filter((m: any) => m.category === 'Star').length;
  const dogsCount = withVolData.filter((m: any) => m.category === 'Dog').length;

  if (!isReady) {
    return <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6"><AnalysisSkeleton /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Menu Engineering</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Lãi cao/thấp (Margin) × Bán chạy/chậm (Volume)</p>
        </div>
        
        <DateRangePicker 
          dateFilter={dateFilter} setDateFilter={setDateFilter}
          startDate={startDate} setStartDate={setStartDate}
          endDate={endDate} setEndDate={setEndDate}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <DataSourceCard 
          label="Menu Mapping" 
          count={menu.filter(m => m.isActive).length}
          suffix="món hiện đang bán"
          isReady={menu.length > 0}
          actionLabel="Quản lý Menu"
          onAction={() => navigate('/menu-management')}
        />
        <DataSourceCard 
          label="Recipe / Cost"
          count={menu.filter(m => m.cost).length}
          total={menu.length}
          suffix="món có cost"
          isReady={menu.some(m => m.cost)}
          actionLabel="Tải Định Lượng"
          onAction={() => navigate('/menu-management?tab=recipe')}
        />
        <DataSourceCard 
          label="POS Data"
          count={posBatches.length}
          suffix="batch đã import"
          dateRange={posDateRange || '—'}
          isReady={posBatches.length > 0}
          actionLabel="Tải POS Data"
          onAction={() => navigate('/pos-upload')}
        />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--color-bg-surface)] p-4 rounded-2xl border border-[var(--color-border-main)]">
        <div className="flex flex-wrap items-center gap-4">
          <Toggle 
            checked={onlyActiveMenu} 
            onChange={setOnlyActiveMenu}
            label="Chỉ phân tích menu hiện đang bán"
          />
          {!onlyActiveMenu && (
            <span className="text-amber-500 text-xs font-bold bg-amber-500/10 px-3 py-1 rounded-full animate-in fade-in slide-in-from-left-2">
              ⚠️ Bao gồm món Legacy đã ngưng
            </span>
          )}
        </div>
        
        <div className="flex bg-[var(--color-bg-main)] p-1 rounded-xl">
          <button onClick={() => setActiveTab('MATRIX')} className={cn("px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors", activeTab === 'MATRIX' ? "bg-[var(--color-accent-gold)] text-black" : "text-[var(--color-text-muted)] hover:text-white")}>Ma Trận</button>
          <button onClick={() => setActiveTab('TABLE')} className={cn("px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors", activeTab === 'TABLE' ? "bg-[var(--color-accent-blue)] text-black" : "text-[var(--color-text-muted)] hover:text-white")}>Bảng Chi Tiết</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Tổng Món Phát Sinh" value={withVolData.length} icon={Layers} color="white" />
        <StatCard title="Nguồn Doanh Thu" value={formatCurrency(totalRev)} icon={Database} color="var(--color-accent-green)" />
        <StatCard title="Số Món Lãi + Bán Chạy" value={starsCount} icon={Star} color="var(--color-accent-gold)" />
        <StatCard title="Cần Review (Dog)" value={dogsCount} icon={AlertTriangle} color="var(--color-accent-red)" />
      </div>

      {activeTab === 'MATRIX' && (() => {
        const uniqueSections = Array.from(new Set(menuMatrix.map((m: any) => m.section))).filter(Boolean);
        let filteredMatrix = menuMatrix;
        if (selectedSection !== 'ALL') {
          filteredMatrix = filteredMatrix.filter((m: any) => m.section === selectedSection);
        }
        if (showTop50) {
          filteredMatrix = [...filteredMatrix].sort((a,b) => b.revenue - a.revenue).slice(0, Math.ceil(filteredMatrix.length / 2));
        }

        return (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in-95 duration-500">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-white uppercase tracking-wider text-sm">Biểu Đồ Ma Trận Lượt Bán vs Lợi Nhuận</h3>
             <div className="flex flex-col md:flex-row items-center gap-4">
                 <select 
                   value={selectedSection}
                   onChange={e => setSelectedSection(e.target.value)}
                   className="bg-[var(--color-bg-main)] text-white text-xs font-bold px-3 py-1.5 rounded border border-[var(--color-border-main)] outline-none cursor-pointer uppercase tracking-widest min-w-[150px]"
                 >
                   <option value="ALL">TẤT CẢ NHÓM MÓN</option>
                   {uniqueSections.map(s => <option key={String(s)} value={String(s)}>{String(s)}</option>)}
                 </select>
                 <Toggle 
                   checked={showTop50}
                   onChange={setShowTop50}
                   label="Top 50% Doanh Thu"
                 />
             </div>
          </div>
          
          {totalVol === 0 ? (
             <div className="h-[400px] flex items-center justify-center text-[var(--color-text-muted)] italic">Không có dữ liệu lượt bán trong thời gian này</div>
          ) : (
            <div className="h-[500px] w-full relative">
              <span className={cn("absolute top-4 left-4 text-[9px] font-bold tracking-widest uppercase z-0 transition-opacity", hoveredQuadrant === 'Puzzle' ? "opacity-100 text-[var(--color-text-muted)]" : "opacity-30 text-[var(--color-text-muted)]")}>PUZZLE (Khó Bán, Lãi Cao)</span>
              <span className={cn("absolute top-4 right-4 text-[9px] font-bold tracking-widest uppercase z-0 transition-opacity", hoveredQuadrant === 'Star' ? "opacity-100 text-[var(--color-accent-gold)]" : "opacity-30 text-[var(--color-accent-gold)]")}>STAR (Dễ Bán, Lãi Cao)</span>
              <span className={cn("absolute bottom-12 left-4 text-[9px] font-bold tracking-widest uppercase z-0 transition-opacity", hoveredQuadrant === 'Dog' ? "opacity-100 text-[var(--color-accent-red)]" : "opacity-30 text-[var(--color-accent-red)]")}>DOG (Khó Bán, Lãi Thấp)</span>
              <span className={cn("absolute bottom-12 right-4 text-[9px] font-bold tracking-widest uppercase z-0 transition-opacity", hoveredQuadrant === 'PlowHorse' ? "opacity-100 text-[var(--color-accent-blue)]" : "opacity-30 text-[var(--color-accent-blue)]")}>PLOW HORSE (Dễ Bán, Lãi Thấp)</span>

              <ResponsiveContainer>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-main)" />
                  <XAxis type="number" dataKey="qty" name="Lượt bán" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} />
                  <YAxis type="number" dataKey="marginPct" name="Lợi nhuận (%)" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} domain={[(dataMin: number) => Math.min(0, Math.floor(dataMin - 10)), (dataMax: number) => Math.max(100, Math.ceil(dataMax + 10))]} />
                  <ZAxis type="number" dataKey="revenue" range={[40, 400]} />
                  
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }} 
                    contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[var(--color-bg-main)] border border-[var(--color-border-main)] p-4 rounded-xl shadow-2xl min-w-[250px]">
                            <p className="font-bold text-white mb-1 leading-tight">{data.displayNameEN}</p>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-[var(--color-text-muted)] font-mono">{data.posCode}</span>
                              <span style={{color: getCategoryColor(data.category), fontWeight: '900', fontSize: '10px', textTransform: 'uppercase'}}>{data.categoryLabel}</span>
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Tổng bán:</span> <span className="font-bold text-white">{data.qty}</span></div>
                              <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">  (POS):</span> <span className="text-[var(--color-text-muted)]">{data.qtyFromPOS}</span></div>
                              <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">  (Live):</span> <span className="text-[var(--color-text-muted)]">{data.qtyFromLive}</span></div>
                              <div className="flex justify-between pt-1 border-t border-white/5"><span className="text-[var(--color-text-muted)]">Doanh thu:</span> <span className="font-bold text-[var(--color-accent-green)]">{formatCurrency(data.revenue)}</span></div>
                              <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Margin:</span> <span className="font-bold text-[var(--color-accent-gold)]">{data.marginPct.toFixed(1)}% ({formatCurrency(data.margin)})</span></div>
                              {!data.hasRecipeCost && <div className="text-[10px] text-amber-500 mt-2 bg-amber-500/10 p-1 rounded inline-block">⚠️ Cost tự tính (30%)</div>}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={globalMedQty} stroke="var(--color-text-muted)" strokeDasharray="3 3" />
                  <ReferenceLine y={globalMedMargin} stroke="var(--color-text-muted)" strokeDasharray="3 3" />
                  <Scatter 
                    data={filteredMatrix}
                    onMouseEnter={(data) => setHoveredQuadrant(data.category)}
                    onMouseLeave={() => setHoveredQuadrant(null)}
                  >
                    {filteredMatrix.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getCategoryColor(entry.category)}
                        fillOpacity={hoveredQuadrant && hoveredQuadrant !== entry.category ? 0.1 : 0.75}
                        stroke="var(--color-bg-surface)"
                        strokeWidth={1}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      );
      })()}

      {activeTab === 'TABLE' && (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-500">
          <div className="p-4 border-b border-[var(--color-border-main)] flex items-center bg-[var(--color-bg-main)]">
            <div className="relative w-full max-w-sm">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input 
                type="text" placeholder="Tìm tên món, mã POS..."
                className="w-full bg-[var(--color-bg-surface)] text-white pl-10 pr-4 py-2 rounded-xl border border-[var(--color-border-main)] focus:border-[var(--color-accent-gold)] outline-none text-sm"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="sticky top-0 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-main)] text-[10px] uppercase text-[var(--color-text-muted)] tracking-wider">
                <tr>
                  <th className="p-4 font-bold">Món</th>
                  <th className="p-4 font-bold text-right">Giá</th>
                  <th className="p-4 font-bold text-right">Cost</th>
                  <th className="p-4 font-bold text-right">Margin %</th>
                  <th className="p-4 font-bold text-right">Lượt Bán</th>
                  <th className="p-4 font-bold text-right">Doanh Thu</th>
                  <th className="p-4 font-bold text-center">Phân Loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-main)]">
                {menuMatrix.filter((m: any) => m.displayNameEN.toLowerCase().includes(searchTerm.toLowerCase()) || m.posCode.toLowerCase().includes(searchTerm.toLowerCase())).sort((a: any, b: any) => b.revenue - a.revenue).map((row: any) => (
                  <tr key={row.posCode} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white max-w-[250px] truncate" title={row.displayNameEN}>{row.displayNameEN}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)] font-mono">{row.posCode} {row.isGhost && <span className="text-amber-500 ml-2">(Legacy)</span>}</div>
                    </td>
                    <td className="p-4 text-right text-[var(--color-text-muted)]">{row.price.toLocaleString()}</td>
                    <td className="p-4 text-right tabular-nums">
                      <span className={cn(row.hasRecipeCost ? "text-white" : "text-amber-500 font-bold")}>{row.cost.toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-right tabular-nums font-bold text-[var(--color-accent-gold)]">{row.marginPct.toFixed(1)}%</td>
                    <td className="p-4 text-right text-white font-bold">{row.qty}</td>
                    <td className="p-4 text-right font-mono text-[var(--color-accent-green)]">{row.revenue.toLocaleString()}</td>
                    <td className="p-4 text-center">
                       {row.category !== 'NoData' ? (
                         <span className="text-[10px] font-black uppercase px-2 py-1 rounded border" style={{color: getCategoryColor(row.category), borderColor: getCategoryColor(row.category)}}>
                           {row.categoryLabel}
                         </span>
                       ) : (
                         <span className="text-[10px] text-[var(--color-text-muted)]">-</span>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function getCategoryColor(cat: string) {
  switch(cat) {
    case 'Star': return 'var(--color-accent-gold)';
    case 'PlowHorse': return 'var(--color-accent-blue)';
    case 'Puzzle': return 'var(--color-accent-purple)';
    case 'Dog': return 'var(--color-accent-red)';
    default: return 'var(--color-text-muted)';
  }
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] p-6 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }}></div>
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-widest leading-relaxed">
          {title}
        </p>
        <div className="p-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-main)] shrink-0" style={{ color: color }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h4 className="text-2xl lg:text-3xl font-black text-white tracking-tight">{value}</h4>
    </div>
  );
}
