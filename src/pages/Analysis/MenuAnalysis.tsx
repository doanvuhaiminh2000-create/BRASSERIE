import React, { useState, useMemo } from 'react';
import { Star, AlertTriangle, Search, Layers, Database, ArrowRight } from 'lucide-react';
import { formatCurrency, cn, normalizePosCode } from '../../lib/utils';
import { useApp } from '../../store/AppContext';
import { DateRangePicker } from '../../components/DateRangePicker';
import { useNavigate } from 'react-router-dom';
import { AnalysisSkeleton } from '../../components/ui/Skeleton';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';

// --- Shared Types & Helpers ---
interface ProcessedItem {
  posCode: string;
  displayNameEN: string;
  section: string;
  price: number;
  hasRecipeCost: boolean;
  cost: number | null;
  margin: number | null;
  marginPct: number | null;
  qty: number;
  qtyPerDay: number;
  revenue: number;
  isActive: boolean;
  isGhost?: boolean;
}

type QuadLabel = 'Star' | 'PlowHorse' | 'Puzzle' | 'Dog' | 'NoData' | 'NoCost';

interface ClassifiedItem extends ProcessedItem {
  quad: QuadLabel;
  medQty: number;
  medMargin: number;
}

function classifyItems(items: ProcessedItem[]): ClassifiedItem[] {
  const withVol = items.filter(d => d.qtyPerDay > 0 && d.hasRecipeCost && d.marginPct !== null);
  if (withVol.length === 0) {
    return items.map(d => ({
      ...d,
      quad: d.hasRecipeCost ? 'NoData' : 'NoCost',
      medQty: 0,
      medMargin: 0,
    } as ClassifiedItem));
  }
  
  const sortedQty = [...withVol].map(d => d.qtyPerDay).sort((a, b) => a - b);
  const sortedMargin = [...withVol].map(d => d.marginPct!).sort((a, b) => a - b);
  const medQty = sortedQty[Math.floor(sortedQty.length / 2)];
  const medMargin = sortedMargin[Math.floor(sortedMargin.length / 2)];
  
  return items.map(d => {
    if (!d.hasRecipeCost) return { ...d, quad: 'NoCost' as QuadLabel, medQty, medMargin };
    if (d.qtyPerDay === 0) return { ...d, quad: 'NoData' as QuadLabel, medQty, medMargin };
    const hiQty = d.qtyPerDay >= medQty;
    const hiMg = (d.marginPct ?? 0) >= medMargin;
    const quad: QuadLabel = hiQty && hiMg ? 'Star' : hiQty ? 'PlowHorse' : hiMg ? 'Puzzle' : 'Dog';
    return { ...d, quad, medQty, medMargin };
  });
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

// --- Sub-components ---
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

const QUAD_CONFIG = {
  PlowHorse: {
    label: '🐎 Plow Horse',
    sub: 'Lãi thấp · Bán chạy',
    color: 'var(--color-accent-blue)',
    badgeClass: 'bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)] border border-[var(--color-accent-blue)]/30',
  },
  Star: {
    label: '⭐ Star',
    sub: 'Lãi cao · Bán chạy',
    color: 'var(--color-accent-gold)',
    badgeClass: 'bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)] border border-[var(--color-accent-gold)]/30',
  },
  Dog: {
    label: '🐕 Dog',
    sub: 'Lãi thấp · Bán chậm',
    color: 'var(--color-accent-red)',
    badgeClass: 'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/30',
  },
  Puzzle: {
    label: '🧩 Puzzle',
    sub: 'Lãi cao · Bán chậm',
    color: 'var(--color-accent-purple)',
    badgeClass: 'bg-[var(--color-accent-purple)]/10 text-[var(--color-accent-purple)] border border-[var(--color-accent-purple)]/30',
  },
} as const;

function QuadrantMatrix({ 
  data, 
  sortKey 
}: { 
  data: ClassifiedItem[]; 
  sortKey: 'revenue' | 'qty' | 'margin';
}) {
  const maxRevOverall = Math.max(...data.map(d => d.revenue), 1);
  
  const quadOrder: QuadLabel[] = ['PlowHorse', 'Star', 'Dog', 'Puzzle'];
  
  return (
    <div className="relative">
      {/* Axis labels */}
      <div className="flex items-center gap-3 mb-2 px-8">
        <span className="text-[10px] text-[var(--color-text-muted)] flex-1 text-center">← Margin thấp</span>
        <span className="text-[10px] text-[var(--color-text-muted)] flex-1 text-center">Margin cao →</span>
      </div>
      
      <div className="flex gap-2">
        {/* Y-axis label */}
        <div className="flex flex-col justify-around py-4 w-6 shrink-0">
          <span className="text-[10px] text-[var(--color-text-muted)] [writing-mode:vertical-rl] rotate-180 text-center">Bán chạy ↑</span>
          <span className="text-[10px] text-[var(--color-text-muted)] [writing-mode:vertical-rl] rotate-180 text-center">↓ Bán chậm</span>
        </div>
        
        {/* 2x2 Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
          {quadOrder.map(quadKey => {
            const cfg = QUAD_CONFIG[quadKey as keyof typeof QUAD_CONFIG];
            const items = data
              .filter(d => d.quad === quadKey)
              .sort((a, b) => {
                if (sortKey === 'revenue') return b.revenue - a.revenue;
                if (sortKey === 'qty') return b.qty - a.qty;
                return (b.marginPct ?? 0) - (a.marginPct ?? 0);
              });
            const show = items.slice(0, 6);
            const more = items.length - show.length;
            const maxRevInQuad = Math.max(...items.map(d => d.revenue), 1);
            
            return (
              <div
                key={quadKey}
                className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-4 flex flex-col gap-2 min-h-[200px]"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className={cn("text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wider", cfg.badgeClass)}>
                      {cfg.label}
                    </span>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1 ml-0.5">{cfg.sub}</p>
                  </div>
                  <span className="text-xl font-black text-white">{items.length}</span>
                </div>
                
                {/* Items */}
                {show.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
                    Không có món
                  </div>
                ) : (
                  <div className="space-y-1.5 flex-1">
                    {show.map(item => (
                      <div
                        key={item.posCode}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--color-border-main)] hover:border-white/20 transition-colors cursor-default group"
                      >
                        {/* Tên món — truncate nếu dài */}
                        <span className="text-xs font-bold text-white truncate flex-1 mr-3" title={item.displayNameEN}>{item.displayNameEN}</span>
                        
                        {/* Meta info */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] text-[var(--color-text-muted)]">{item.qtyPerDay.toFixed(1)}/ngày</span>
                          {item.hasRecipeCost && item.marginPct !== null && (
                            <span className="text-[10px] font-bold" style={{ color: cfg.color }}>{item.marginPct.toFixed(1)}%</span>
                          )}
                          {/* Mini bar thể hiện doanh thu tương đối */}
                          <div className="w-10 h-1.5 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${Math.round((item.revenue / maxRevInQuad) * 100)}%`,
                                backgroundColor: cfg.color 
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-[var(--color-text-muted)] hidden lg:inline">{formatCurrency(item.revenue)}</span>
                        </div>
                      </div>
                    ))}
                    {more > 0 && (
                      <p className="text-[10px] text-[var(--color-text-muted)] pl-1 pt-1">
                        +{more} món nữa (xem tab Bảng Chi Tiết)
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Main Interface ---
export function MenuAnalysis() {
  const { menu, posBatches, isReady } = useApp();
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [onlyActiveMenu, setOnlyActiveMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'MATRIX' | 'TABLE'>('MATRIX');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTop50, setShowTop50] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<'revenue' | 'qty' | 'margin'>('revenue');

  const activeRange = useMemo(() => ({ start: startDate, end: endDate }), [startDate, endDate]);

  const realPosRevenue = useMemo(() => {
    const startMs = new Date(activeRange.start).setHours(0,0,0,0);
    const endMs = new Date(activeRange.end).setHours(23,59,59,999);
    
    let total = 0;
    const uniqueTx = new Set<number>();
    for (const batch of posBatches) {
      for (const sum of batch.summary) {
        if (sum.timeStart >= startMs && sum.timeStart <= endMs && !uniqueTx.has(sum.transaction)) {
          uniqueTx.add(sum.transaction);
          total += sum.finalTotal;
        }
      }
    }
    return total;
  }, [posBatches, activeRange]);

  const posDateRange = useMemo(() => {
    if (!posBatches.length) return null;
    let min = Infinity;
    let max = 0;
    posBatches.forEach(b => {
      const from = new Date(b.dateFrom).getTime();
      const to = new Date(b.dateTo).getTime();
      if (!isNaN(from)) min = Math.min(min, from);
      if (!isNaN(to)) max = Math.max(max, to);
    });
    if (min === Infinity || max === 0) return 'Dữ liệu ngày không hợp lệ';
    return `${new Date(min).toLocaleDateString('vi-VN')} → ${new Date(max).toLocaleDateString('vi-VN')}`;
  }, [posBatches]);

  // 1. Build raw processed data (không classify ở đây)
  const menuMatrix = useMemo(() => {
    const startMs = new Date(activeRange.start).setHours(0,0,0,0);
    const endMs = new Date(activeRange.end).setHours(23,59,59,999);

    // 1. Lọc giao dịch hợp lệ
    const validTxs = new Set<number>();
    for (const batch of posBatches) {
      for (const sum of batch.summary) {
        if (sum.timeStart >= startMs && sum.timeStart <= endMs) {
          validTxs.add(sum.transaction);
        }
      }
    }

    // 2. Volume từ POS
    const posVolMap = new Map<string, { qty: number; revenue: number; name: string }>();
    for (const batch of posBatches) {
      for (const d of batch.details) {
        if (d.timeOrder < startMs || d.timeOrder > endMs) continue;
        if (!validTxs.has(d.transaction)) continue;

        const code = normalizePosCode(d.productId);
        const cur = posVolMap.get(code) || { qty: 0, revenue: 0, name: d.productName };
        cur.qty += Number(d.quantity) || 0;
        cur.revenue += Number(d.finalAmount) || 0;
        posVolMap.set(code, cur);
      }
    }

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

    const numDays = Math.max(1, Math.ceil((endMs - startMs) / 86400000));

    let dataset = baseMenu.map(m => {
      const pos = posVolMap.get(m.posCode) || { qty: 0, revenue: 0 };
      const totalQty = pos.qty;
      const totalRev = pos.revenue;
      const qtyPerDay = Number((totalQty / numDays).toFixed(2));
      
      const hasRecipeCost = m.cost !== undefined && m.cost > 0;
      const cost = hasRecipeCost ? m.cost! : null;
      const margin = hasRecipeCost ? m.price - cost! : null;
      const marginPct = hasRecipeCost && m.price > 0 ? (margin! / m.price) * 100 : null;

      return { 
        ...m, 
        cost, hasRecipeCost,
        margin, marginPct,
        qty: totalQty, qtyPerDay, revenue: totalRev
      } as ProcessedItem;
    });

    return dataset;
  }, [menu, posBatches, onlyActiveMenu, activeRange]);

  // 2. Classify sau khi đã filter
  const displayData = useMemo(() => {
    let base = menuMatrix;
    if (selectedSection !== 'ALL') base = base.filter(m => m.section === selectedSection);
    if (showTop50) base = [...base].sort((a,b) => b.revenue - a.revenue).slice(0, Math.ceil(base.length / 2));
    return classifyItems(base);
  }, [menuMatrix, selectedSection, showTop50]);

  // 3. Summary metrics tính từ displayData
  const summaryMetrics = useMemo(() => {
    const totalVol = displayData.reduce((s,d) => s + d.qty, 0);
    const totalRev = displayData.reduce((s,d) => s + d.revenue, 0);
    const starsCount = displayData.filter(d => d.quad === 'Star').length;
    const dogsCount = displayData.filter(d => d.quad === 'Dog').length;
    const noCostCount = displayData.filter(d => d.quad === 'NoCost' && d.qty > 0).length;
    return { totalVol, totalRev, starsCount, dogsCount, noCostCount };
  }, [displayData]);

  if (!isReady) {
    return <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6"><AnalysisSkeleton /></div>;
  }

  const uniqueSections = Array.from(new Set(menuMatrix.map(m => m.section))).filter(Boolean);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in pb-20">
      
      {/* Header + DatePicker */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Menu Engineering</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            Lãi cao/thấp (Margin) × Bán chạy/chậm (Volume)
          </p>
        </div>
        <DateRangePicker startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />
      </div>

      {/* Data source info banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-blue-400 text-sm flex items-center gap-2">
        <Database className="w-4 h-4" />
        Phân tích Menu Engineering chỉ sử dụng dữ liệu POS để đảm bảo tính chính xác. Dữ liệu Live Entry không được tính vào.
      </div>

      {/* DataSourceCards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Controls row */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--color-bg-surface)] p-4 rounded-2xl border border-[var(--color-border-main)]">
        <div className="flex flex-wrap items-center gap-4">
          <Toggle checked={onlyActiveMenu} onChange={setOnlyActiveMenu} label="Chỉ phân tích menu hiện đang bán" />
          
          {/* Sort dropdown */}
          {activeTab === 'MATRIX' && (
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as any)}
              className="bg-[var(--color-bg-main)] text-white text-xs font-bold px-3 py-1.5 rounded border border-[var(--color-border-main)] outline-none"
            >
              <option value="revenue">Sắp xếp: doanh thu</option>
              <option value="qty">Sắp xếp: lượt bán</option>
              <option value="margin">Sắp xếp: margin %</option>
            </select>
          )}

          {/* Section dropdown */}
          <select
            value={selectedSection}
            onChange={e => setSelectedSection(e.target.value)}
            className="bg-[var(--color-bg-main)] text-white text-xs font-bold px-3 py-1.5 rounded border border-[var(--color-border-main)] outline-none uppercase tracking-widest min-w-[150px]"
          >
            <option value="ALL">TẤT CẢ NHÓM MÓN</option>
            {uniqueSections.map(s => <option key={String(s)} value={String(s)}>{String(s)}</option>)}
          </select>

          {/* Top50 toggle */}
          <Toggle
            checked={showTop50}
            onChange={setShowTop50}
            label={selectedSection === 'ALL' ? 'Top 50% doanh thu' : `Top 50% (${selectedSection})`}
          />
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[var(--color-bg-main)] p-1 rounded-xl">
          <button onClick={() => setActiveTab('MATRIX')} className={cn("px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors", activeTab === 'MATRIX' ? "bg-[var(--color-accent-gold)] text-black" : "text-[var(--color-text-muted)] hover:text-white")}>
            Ma Trận
          </button>
          <button onClick={() => setActiveTab('TABLE')} className={cn("px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors", activeTab === 'TABLE' ? "bg-[var(--color-accent-blue)] text-black" : "text-[var(--color-text-muted)] hover:text-white")}>
            Bảng Chi Tiết
          </button>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Tổng Món Phát Sinh" value={displayData.filter(d => d.qty > 0).length} icon={Layers} color="white" />
        <div className="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] py-4 px-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 text-[var(--color-accent-green)] transition-transform duration-500 group-hover:scale-110"><Database size={64}/></div>
           <h3 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1 relative z-10">Doanh Thu Tổng (POS)</h3>
           <p className="text-xl font-black text-white tracking-tight relative z-10 mb-2" title="Doanh thu thực tế sau chiết khấu hóa đơn">{formatCurrency(realPosRevenue)}</p>
           
           <h3 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1 relative z-10 border-t border-[var(--color-border-main)] pt-2">Giá Trị Món (Trước CK)</h3>
           <p className="text-lg font-black text-[var(--color-accent-gold)] tracking-tight relative z-10" title="Tổng giá trị các món (chưa trừ CK trên tổng menu)">{formatCurrency(summaryMetrics.totalRev)}</p>
        </div>
        <StatCard title="Món Chưa Có Cost" value={summaryMetrics.noCostCount} icon={AlertTriangle} color="var(--color-accent-orange)" />
        <StatCard title="Số Món Lãi + Bán Chạy" value={summaryMetrics.starsCount} icon={Star} color="var(--color-accent-gold)" />
        <StatCard title="Cần Review (Dog)" value={summaryMetrics.dogsCount} icon={AlertTriangle} color="var(--color-accent-red)" />
      </div>

      {/* MATRIX TAB */}
      {activeTab === 'MATRIX' && (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 shadow-xl w-full animate-in fade-in zoom-in-95 duration-500">
          <h3 className="font-bold text-white uppercase tracking-wider text-sm mb-6">
            Phân loại Menu Engineering
          </h3>
          
          {summaryMetrics.totalVol === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-[var(--color-text-muted)] italic">
              Không có dữ liệu lượt bán trong khoảng thời gian này
            </div>
          ) : (
            <QuadrantMatrix data={displayData} sortKey={sortKey} />
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center mt-6 pt-4 border-t border-[var(--color-border-main)]">
            {Object.entries(QUAD_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                <div>
                  <div className="text-xs font-bold text-white">{key}</div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">{cfg.sub}</div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-text-muted)]" />
              <div>
                <div className="text-xs font-bold text-white">NoCost</div>
                <div className="text-[10px] text-[var(--color-text-muted)]">Cần upload định lượng</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLE TAB */}
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
          <div className="mt-4">
            <ResponsiveTable<any>
              data={displayData.filter(m => m.displayNameEN.toLowerCase().includes(searchTerm.toLowerCase()) || m.posCode.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => b.revenue - a.revenue)}
              columns={[
                { key: 'item', label: 'Món', render: (row) => (
                    <div>
                      <div className="font-bold text-white max-w-[250px] truncate" title={row.displayNameEN}>{row.displayNameEN}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)] font-mono">{row.posCode} {row.isGhost && <span className="text-amber-500 ml-2">(Legacy)</span>}</div>
                    </div>
                ), primary: true },
                { key: 'price', label: 'Giá', render: (row) => <span className="text-[var(--color-text-muted)]">{row.price.toLocaleString()}</span>, align: 'right', hideOnMobile: true },
                { key: 'cost', label: 'Cost', render: (row) => (
                    <span className={cn(row.hasRecipeCost ? "text-white tabular-nums" : "text-amber-500 tabular-nums font-bold")}>{row.hasRecipeCost ? row.cost!.toLocaleString() : "—"}</span>
                ), align: 'right', hideOnMobile: true },
                { key: 'margin', label: 'Margin %', render: (row) => {
                    if (row.hasRecipeCost && row.marginPct !== null) {
                        return <span className="text-[var(--color-accent-gold)] tabular-nums font-bold">{row.marginPct.toFixed(1)}%</span>;
                    }
                    return <span className="text-[var(--color-text-muted)] tabular-nums font-bold text-xs">Chưa có cost</span>;
                }, align: 'right' },
                { key: 'qty', label: 'Lượt Bán / Ngày', render: (row) => <span className="text-white font-bold">{row.qtyPerDay} <span className="font-normal text-xs text-[var(--color-text-muted)]">({row.qty})</span></span>, align: 'right' },
                { key: 'revenue', label: 'Doanh Thu', render: (row) => <span className="font-mono text-[var(--color-accent-green)]">{row.revenue.toLocaleString()}</span>, align: 'right' },
                { key: 'category', label: 'Phân Loại', render: (row) => {
                    if (row.quad !== 'NoData') {
                        return (
                          <span className="text-[10px] font-black uppercase px-2 py-1 rounded border inline-block text-center whitespace-nowrap" style={{color: getCategoryColor(row.quad), borderColor: getCategoryColor(row.quad)}}>
                            {row.quad}
                          </span>
                        );
                    }
                    return <span className="text-[10px] text-[var(--color-text-muted)]">-</span>;
                }, align: 'center', hideOnMobile: true }
              ]}
              keyExtractor={(row) => row.posCode}
              emptyText="Không tìm thấy món nào"
            />
          </div>
        </div>
      )}

    </div>
  );
}
