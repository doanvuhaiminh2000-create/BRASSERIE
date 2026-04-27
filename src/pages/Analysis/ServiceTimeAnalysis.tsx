import React, { useState, useMemo, useEffect } from 'react';
import { DateRangePicker } from '../../components/DateRangePicker';
import { useApp } from '../../store/AppContext';
import { dataStore } from '../../services/dataStore';
import { POSBatch } from '../../types/store';
import { cn, formatCurrency } from '../../lib/utils';
import {
  getValidBills,
  computePOSFunnel,
  computeLiveFunnel,
  buildDurationHistogram
} from '../../services/operationsAnalytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Database, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function KPICard({ title, value, subtitle, color, source }: { title: string; value: string | number; subtitle?: string; color: string; source?: 'POS' | 'LIVE' | 'POS+LIVE' }) {
  return (
    <div className="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] p-5 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: color }}></div>
      <div className="flex justify-between items-start mb-3">
        <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest break-words mt-1">
          {title}
        </p>
        {source && (
          <span className={cn(
            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest",
            source === 'POS' && "bg-blue-500/20 text-blue-400",
            source === 'LIVE' && "bg-orange-500/20 text-orange-400",
            source === 'POS+LIVE' && "bg-green-500/20 text-green-400"
          )}>{source}</span>
        )}
      </div>
      <h4 className="text-3xl font-black text-white tracking-tighter truncate">{value}</h4>
      {subtitle && <p className="text-xs text-[var(--color-text-muted)] mt-2">{subtitle}</p>}
    </div>
  );
}

export function ServiceTimeAnalysis() {
  const { sessions, isReady } = useApp();
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [batches, setBatches] = useState<POSBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const activeRange = useMemo(
    () => ({ start: startDate, end: endDate }),
    [startDate, endDate]
  );
  
  const startMs = new Date(activeRange.start).getTime();
  const endMs = new Date(activeRange.end).getTime() + 86399999;

  useEffect(() => {
    if (!isReady) return;
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const b = await dataStore.getPOSBatchesInRange(activeRange.start, activeRange.end);
        if (mounted) setBatches(b);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [activeRange, startMs, endMs, isReady]);

  // Calculations
  const posMetrics = useMemo(() => computePOSFunnel(batches, startMs, endMs), [batches, startMs, endMs]);
  const liveMetrics = useMemo(() => computeLiveFunnel(sessions, startMs, endMs), [sessions, startMs, endMs]);
  
  const durationHist = useMemo(() => {
    return buildDurationHistogram(posMetrics.rawBills.map(b => (b.summary.timeEnd - b.summary.timeStart)/60000));
  }, [posMetrics.rawBills]);
  
  const heatmapData = useMemo(() => {
     const data = Array(7).fill(0).map(() => Array(9).fill({ avg: 0, count: 0 }));
     // Map bills to weekday (0-6) and hour (9-17)
     // 9h maps to idx 0, 17h maps to idx 8
     const hourlyData: Record<string, number[]> = {};
     posMetrics.rawBills.forEach(b => {
        const d = new Date(b.summary.timeStart);
        const w = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon=0, Sun=6
        const h = d.getHours();
        if (w >= 0 && w <= 6 && h >= 9 && h <= 17) {
            const idxH = h - 9;
             const key = `${w}-${idxH}`;
             if (!hourlyData[key]) hourlyData[key] = [];
             hourlyData[key].push((b.summary.timeEnd - b.summary.timeStart)/60000);
        }
     });
     
     for (let w = 0; w < 7; w++) {
         for (let h = 0; h < 9; h++) {
             const items = hourlyData[`${w}-${h}`] || [];
             if (items.length > 0) {
                 const sum = items.reduce((a,b)=>a+b,0);
                 data[w][h] = { avg: sum/items.length, count: items.length };
             }
         }
     }
     return data;
  }, [posMetrics.rawBills]);

  const staffData = useMemo(() => {
      const stats: Record<string, { count: number, totalDur: number, totalLToC: number, itemsCount: number }> = {};
      posMetrics.rawBills.forEach(({summary, details}) => {
          const staff = summary.whoStart || 'N/A';
          if (!stats[staff]) {
              stats[staff] = { count: 0, totalDur: 0, totalLToC: 0, itemsCount: 0 };
          }
          stats[staff].count++;
          const dur = (summary.timeEnd - summary.timeStart)/60000;
          stats[staff].totalDur += dur;
          
          if (details.length > 0) {
             const lastOrder = Math.max(...details.map(d=>d.timeOrder).filter(t=>t>0));
             if (lastOrder > 0) {
                 const ltoc = (summary.timeEnd - lastOrder)/60000;
                 if (ltoc >= 0 && ltoc <= 180) stats[staff].totalLToC += ltoc;
             }
             stats[staff].itemsCount += details.reduce((acc, d) => acc + (d.quantity || 1), 0);
          }
      });
      return Object.entries(stats).map(([name, data]) => ({
          name,
          bills: data.count,
          avgDur: data.totalDur / data.count,
          avgLToC: data.totalLToC / data.count,
          avgItems: data.itemsCount / data.count
      })).sort((a,b) => b.bills - a.bills);
  }, [posMetrics.rawBills]);

  const topSlowBills = useMemo(() => posMetrics.rawBills
    .sort((a, b) => (b.summary.timeEnd - b.summary.timeStart) - (a.summary.timeEnd - a.summary.timeStart))
    .slice(0, 10), [posMetrics.rawBills]);

  if (isLoading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)]">
        <span className="text-[var(--color-accent-gold)] tracking-widest uppercase font-bold animate-pulse">
          Đang tổng hợp dữ liệu...
        </span>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="p-8 h-screen overflow-y-auto w-full">
         <div className="w-full h-[400px] flex flex-col items-center justify-center bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] mt-10">
          <Database className="w-12 h-12 text-[var(--color-text-muted)] mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-white mb-2">Chưa có dữ liệu POS trong khoảng này</h2>
          <p className="text-[var(--color-text-muted)] text-sm max-w-sm text-center mb-6">
            Vui lòng tải lên báo cáo POS để bắt đầu phân tích.
          </p>
          <button onClick={() => navigate('/pos-upload')} className="px-6 py-2 bg-[var(--color-accent-gold)] text-black font-bold rounded-lg uppercase tracking-widest text-sm">
            Đi đến trang Upload
          </button>
        </div>
      </div>
    );
  }

  // Pre-compute percentages for the Service Funnel bar
  const tTot = posMetrics.totalDurationMin.median;
  const p1 = tTot > 0 ? (posMetrics.t1ToFirstOrderMin.median / tTot) * 100 : 0;
  const p2 = tTot > 0 ? (posMetrics.firstToLastOrderMin.median / tTot) * 100 : 0;
  const p3 = tTot > 0 ? (posMetrics.lastOrderToCheckoutMin.median / tTot) * 100 : 0;

  const isLToCBottleneck = p3 > 60;
  const isKitchenSlow = liveMetrics.totalSessions > 0 && liveMetrics.t2ToT6Min.median > 15;

  return (
    <div className="p-4 md:p-8 space-y-8 h-screen overflow-y-auto pb-32">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Thời Gian Phục Vụ</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Phân tích phễu thời gian từng giai đoạn của bill: mở bàn → order → ra món → thanh toán</p>
        </div>
        <DateRangePicker 
          startDate={startDate} 
          setStartDate={setStartDate} 
          endDate={endDate} 
          setEndDate={setEndDate} 
        />
      </div>

      {/* B1: KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Avg Duration" 
          value={`${posMetrics.totalDurationMin.median.toFixed(1)}p`}
          subtitle={`Q75: ${posMetrics.totalDurationMin.p75.toFixed(1)}p`}
          color="var(--color-accent-gold)" 
          source="POS" 
        />
        <KPICard 
          title="P75 Duration" 
          value={`${posMetrics.totalDurationMin.p75.toFixed(1)}p`}
          color="var(--color-accent-blue)" 
          source="POS" 
        />
        <KPICard 
          title="Order Cuối → Checkout" 
          value={`${posMetrics.lastOrderToCheckoutMin.median.toFixed(1)}p`}
          color="var(--color-accent-orange)" 
          source="POS" 
        />
        <KPICard 
          title="Số bills phân tích" 
          value={posMetrics.totalDurationMin.n}
          subtitle={`Từ ${activeRange.start} đến ${activeRange.end}`}
          color="var(--color-accent-green)" 
          source="POS" 
        />
      </div>

      {/* B2: Service Funnel */}
      <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border-main)]">
         <h3 className="text-lg font-bold text-white mb-4">Phân bổ Thời Gian Trung Bình / Bill</h3>
         
         <div className="relative h-12 w-full rounded-full overflow-hidden flex bg-white/5 border border-white/10 mb-4">
            <div className="h-full bg-blue-500/80 group relative transition-all" style={{ width: `${p1}%`}}>
               {p1 > 10 && <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white shadow-sm">Mở bàn→Order</span>}
            </div>
            <div className="h-full bg-orange-500/80 group relative transition-all border-l border-white/20" style={{ width: `${p2}%`}}>
               {p2 > 10 && <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white shadow-sm">Order trải dài ({p2.toFixed(0)}%)</span>}
            </div>
            <div className="h-full bg-red-500/80 group relative transition-all border-l border-white/20" style={{ width: `${p3}%`}}>
               {p3 > 10 && <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white shadow-sm">Thanh toán ({p3.toFixed(0)}%)</span>}
            </div>
         </div>

         <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-blue-500/80"></div>
               <span className="text-xs text-[var(--color-text-muted)]">T1→First Order: <b>{posMetrics.t1ToFirstOrderMin.median.toFixed(1)}p</b> <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 text-[8px] rounded">POS</span></span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-orange-500/80"></div>
               <span className="text-xs text-[var(--color-text-muted)]">Time Spacing: <b>{posMetrics.firstToLastOrderMin.median.toFixed(1)}p</b> <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 text-[8px] rounded">POS</span></span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
               <span className="text-xs text-[var(--color-text-muted)]">Last Order→T7: <b>{posMetrics.lastOrderToCheckoutMin.median.toFixed(1)}p</b> <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 text-[8px] rounded">POS</span></span>
            </div>
         </div>

         {/* Overlay block for Live Entry Kitchen */}
         {liveMetrics.totalSessions > 0 && (
            <div className="mt-6 border-t border-[var(--color-border-main)] pt-4">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                 <Clock className="w-4 h-4 text-[var(--color-accent-green)]" />
                 <span>Gửi bếp → Món đầu ra (T2→T6 median):</span>
                 <b className="text-white">{liveMetrics.t2ToT6Min.median.toFixed(1)} phút</b>
                 <span className="px-1 py-0.5 bg-orange-500/20 text-orange-400 text-[8px] rounded">LIVE</span>
              </div>
            </div>
         )}
         
         {(isLToCBottleneck || isKitchenSlow) && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
               <h4 className="text-sm font-bold text-red-400 mb-1">Cảnh Báo Vận Hành:</h4>
               <ul className="list-disc pl-5 text-sm text-red-300 space-y-1">
                 {isLToCBottleneck && <li>Nút thắt: thời gian sau lệnh order cuối rất dài ({posMetrics.lastOrderToCheckoutMin.median.toFixed(1)}p). Cân nhắc đưa hóa đơn sớm.</li>}
                 {isKitchenSlow && <li>Bếp chậm: Mất trung bình {liveMetrics.t2ToT6Min.median.toFixed(1)} phút mới ra món đầu tiên, cao hơn mức mục tiêu (15 phút).</li>}
               </ul>
            </div>
         )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* B3: Duration Histogram */}
        <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border-main)]">
           <h3 className="text-lg font-bold text-white mb-2">Phân bổ Duration <span className="ml-2 text-[8px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-widest inline-block align-middle">POS</span></h3>
           <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={durationHist}>
                    <CartesianGrid stroke="var(--color-border-main)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="bucket" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                       contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '12px', fontSize: '12px' }}
                       formatter={(val: number) => [val, 'Bills']}
                    />
                    <Bar dataKey="count" fill="var(--color-accent-blue)" radius={[4,4,0,0]} maxBarSize={40} />
                  </BarChart>
               </ResponsiveContainer>
           </div>
        </div>

        {/* B4: Heatmap */}
        <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border-main)]">
           <h3 className="text-lg font-bold text-white mb-2">Avg Duration Theo Khung Giờ <span className="ml-2 text-[8px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-widest inline-block align-middle">POS</span></h3>
           <div className="overflow-x-auto custom-scrollbar">
             <div className="min-w-[400px]">
               <div className="flex mb-1">
                 <div className="w-12 shrink-0"></div>
                 {['9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h'].map(h => (
                    <div key={h} className="flex-1 text-center text-[10px] text-[var(--color-text-muted)]">{h}</div>
                 ))}
               </div>
               {['T2','T3','T4','T5','T6','T7','CN'].map((day, dIdx) => (
                 <div key={day} className="flex items-center mb-1">
                   <div className="w-12 shrink-0 text-xs text-[var(--color-text-muted)] font-bold">{day}</div>
                   {heatmapData[dIdx].map((cell, hIdx) => {
                      const maxAvg = 120; // assumed max scale
                      const pct = Math.min(cell.avg / maxAvg, 1);
                      // scale from blue to red
                      // low: bg-blue-500/20
                      // mid: bg-amber-500/50
                      // high: bg-red-500/80
                      let bgClass = "bg-white/5";
                      if (cell.count > 0) {
                         if (pct < 0.3) bgClass = "bg-blue-500/30 text-blue-100";
                         else if (pct < 0.6) bgClass = "bg-amber-500/50 text-white";
                         else bgClass = "bg-red-500/80 text-white";
                      }
                      return (
                       <div key={hIdx} className={cn("flex-1 h-8 m-0.5 rounded flex items-center justify-center text-[9px]", bgClass)} title={`${cell.avg.toFixed(1)}p (${cell.count} bills)`}>
                          {cell.count > 0 ? Math.round(cell.avg) : ''}
                       </div>
                      )
                   })}
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>

      {/* Top 10 Longest Bills & Staff */}
      <div className="grid lg:grid-cols-2 gap-8">
         <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border-main)]">
            <h3 className="text-lg font-bold text-white mb-4">Top 10 Bills Nán Lâu Nhất</h3>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[var(--color-border-main)] text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                    <th className="pb-2 pr-2">Bàn</th>
                    <th className="pb-2 px-2">Ngày Giờ</th>
                    <th className="pb-2 px-2">Duration</th>
                    <th className="pb-2 px-2">Total</th>
                    <th className="pb-2 pl-2">Thu Ngân</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {topSlowBills.map(b => (
                    <tr key={b.summary.transaction} className="border-b border-[var(--color-border-main)]/50">
                      <td className="py-2 pr-2">T{String(b.summary.table).padStart(2, '0')}</td>
                      <td className="py-2 px-2">{new Date(b.summary.timeStart).toLocaleString('vi-VN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-2 px-2 font-mono text-[var(--color-accent-orange)] text-xs">{((b.summary.timeEnd - b.summary.timeStart)/60000).toFixed(0)}p</td>
                      <td className="py-2 px-2 text-xs">{formatCurrency(b.summary.finalTotal)}</td>
                      <td className="py-2 pl-2 text-xs max-w-[100px] truncate">{b.summary.whoClose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
         </div>

         <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border-main)]">
            <h3 className="text-lg font-bold text-white mb-4">Phân Tích Theo Nhân Viên <span className="ml-2 text-[8px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-widest inline-block align-middle">POS</span></h3>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[var(--color-border-main)] text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                    <th className="pb-2 pr-2">Nhân viên Mở</th>
                    <th className="pb-2 px-2">Bills</th>
                    <th className="pb-2 px-2">Avg Dur</th>
                    <th className="pb-2 pl-2">Avg LToC</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {staffData.map((s, i) => {
                     const isFast = s.avgLToC < posMetrics.lastOrderToCheckoutMin.median - 5;
                     const isSlow = s.avgLToC > posMetrics.lastOrderToCheckoutMin.median + 10;
                     return (
                        <tr key={i} className="border-b border-[var(--color-border-main)]/50">
                          <td className="py-2 pr-2 truncate max-w-[120px] font-bold">{s.name}</td>
                          <td className="py-2 px-2">{s.bills}</td>
                          <td className="py-2 px-2 font-mono">{s.avgDur.toFixed(0)}p</td>
                          <td className="py-2 pl-2 font-mono flex items-center gap-2">
                             {s.avgLToC.toFixed(0)}p
                             {isFast && <span className="px-1.5 bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)] text-[8px] rounded">NHANH</span>}
                             {isSlow && <span className="px-1.5 bg-red-500/20 text-red-400 text-[8px] rounded">CHẬM</span>}
                          </td>
                        </tr>
                     )
                  })}
                </tbody>
              </table>
            </div>
         </div>
      </div>

      {/* B6: Live Entry Section */}
      <h2 className="text-xl font-bold text-white mt-12 border-b border-[var(--color-border-main)] pb-2 flex items-center gap-2">
         <Clock className="w-5 h-5 text-[var(--color-accent-orange)]" /> 
         Dữ Liệu Thực Tế Từ Máy Tính Bảng 
         <span className="text-[10px] font-black bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded uppercase tracking-widest mb-1">LIVE</span>
      </h2>
      
      {liveMetrics.totalSessions === 0 ? (
         <div className="p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-xl text-center text-sm text-[var(--color-text-muted)]">
            Chưa có dữ liệu Live Entry trong khoảng thời gian này. Hãy nhập liệu trên tablet để bổ sung phễu T2→T6 chính xác.
         </div>
      ) : (
         <>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard title="Bếp Chờ (T2→T6)" value={`${liveMetrics.t2ToT6Min.median.toFixed(1)}p`} source="LIVE" color="var(--color-accent-orange)"/>
                <KPICard title="Avg Rounds / Bill" value={liveMetrics.avgRoundsPerBill.toFixed(1)} source="LIVE" color="var(--color-text-main)"/>
                <KPICard title="Gap Giữa Các Round" value={`${liveMetrics.interRoundGapMin.median.toFixed(1)}p`} source="LIVE" color="var(--color-text-main)"/>
             </div>
             {liveMetrics.totalSessions < 10 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-400 text-sm">
                  ⚠️ Mẫu Live Entry quá nhỏ ({liveMetrics.totalSessions} bills). Đợi tích lũy thêm dữ liệu thực để có insight đáng tin cậy.
                </div>
             )}
         </>
      )}

    </div>
  );
}
