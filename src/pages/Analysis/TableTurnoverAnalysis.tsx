import React, { useState, useMemo, useEffect } from 'react';
import { DateRangePicker, getDateRangeStrings } from '../../components/DateRangePicker';
import { useApp } from '../../store/AppContext';
import { dataStore } from '../../services/dataStore';
import { POSBatch } from '../../types/store';
import { cn, formatCurrency } from '../../lib/utils';
import {
  getValidBills,
  computeIdleGaps,
  computePerTableMetrics,
  calculateIdleReductionROI,
  buildOccupancyHeatmap
} from '../../services/operationsAnalytics';
import { Database, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Cell, BarChart, Bar } from 'recharts';

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
            source === 'POS' && "bg-blue-500/20 text-blue-400"
          )}>{source}</span>
        )}
      </div>
      <h4 className="text-3xl font-black text-white tracking-tighter truncate">{value}</h4>
      {subtitle && <p className="text-xs text-[var(--color-text-muted)] mt-2">{subtitle}</p>}
    </div>
  );
}

export function TableTurnoverAnalysis() {
  const { isReady, tables } = useApp();
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState<string>('thisMonth');
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [batches, setBatches] = useState<POSBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [targetGap, setTargetGap] = useState<number>(15);

  const activeRange = useMemo(
    () => getDateRangeStrings(dateFilter, startDate, endDate),
    [dateFilter, startDate, endDate]
  );
  
  const startMs = new Date(activeRange.start).getTime();
  const endMs = new Date(activeRange.end).getTime() + 86399999;
  const numDays = Math.max(1, Math.ceil((endMs - startMs) / 86400000));

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

  // Real physical tables sum 1-30 typically
  const NUM_PHYSICAL_TABLES = tables.length || 30;

  const validBills = useMemo(() => getValidBills(batches, startMs, endMs), [batches, startMs, endMs]);

  const capacityMetrics = useMemo(() => {
     let physicalCount = 0;
     let virtualCount = 0;
     let occupiedTableMinsPeak = 0;
     let peakBills = 0;
     const tablesSeen = new Set<number>();

     for (const bill of validBills) {
        const tObj = Number(bill.summary.table);
        tablesSeen.add(tObj);
        
        const billStart = bill.summary.timeStart;
        const billEnd = bill.summary.timeEnd;
        const billDate = new Date(billStart);
        
        const peakStart = new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate(), 11, 0, 0).getTime();
        const peakEnd = new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate(), 14, 0, 0).getTime();
        
        // Count as peak bill if it overlaps with peak at all
        const overlapStart = Math.max(billStart, peakStart);
        const overlapEnd = Math.min(billEnd, peakEnd);
        
        if (overlapEnd > overlapStart) {
           peakBills++;
           const overlapMin = Math.min((overlapEnd - overlapStart) / 60000, 180);
           occupiedTableMinsPeak += overlapMin;
        }
     }

     for (const t of tablesSeen) {
       if (t <= 1000) physicalCount++;
       else virtualCount++;
     }
     
     // turns = peakBills / (days * physical tables)
     const turnsPeak = (numDays > 0 && NUM_PHYSICAL_TABLES > 0) ? peakBills / (numDays * NUM_PHYSICAL_TABLES) : 0;
     
     // peak capacity = (14-11)*60 = 180 mins per table per day
     const availableMins = numDays * NUM_PHYSICAL_TABLES * 180;
     const capacityPct = availableMins > 0 ? (occupiedTableMinsPeak / availableMins) * 100 : 0;

     return { physicalCount, virtualCount, turnsPeak, capacityPct };
  }, [validBills, NUM_PHYSICAL_TABLES, numDays]);

  const idleMetrics = useMemo(() => computeIdleGaps(batches, startMs, endMs), [batches, startMs, endMs]);
  
  const perTableData = useMemo(() => computePerTableMetrics(batches, startMs, endMs, numDays), [batches, startMs, endMs, numDays]);

  const avgDurOverall = useMemo(() => {
     const durs = validBills.map(b => (b.summary.timeEnd - b.summary.timeStart)/60000);
     return durs.length > 0 ? durs.reduce((a,b)=>a+b,0)/durs.length : 0;
  }, [validBills]);
  
  const avgTicketOverall = useMemo(() => {
     return validBills.length > 0 ? validBills.reduce((a,b)=>a+b.summary.finalTotal,0) / validBills.length : 0;
  }, [validBills]);

  const roi = useMemo(() => calculateIdleReductionROI(
      idleMetrics.median, targetGap, avgDurOverall, avgTicketOverall, NUM_PHYSICAL_TABLES, 4
  ), [idleMetrics.median, targetGap, avgDurOverall, avgTicketOverall, NUM_PHYSICAL_TABLES]);

  const scatterData = useMemo(() => {
     return validBills.map(b => {
        const dur = (b.summary.timeEnd - b.summary.timeStart)/60000;
        let bucket = '1';
        if (b.summary.customer === 2) bucket = '2';
        else if (b.summary.customer >= 3 && b.summary.customer <= 4) bucket = '3-4';
        else if (b.summary.customer >= 5 && b.summary.customer <= 6) bucket = '5-6';
        else if (b.summary.customer >= 7) bucket = '7+';

        return {
           table: b.summary.table,
           guests: b.summary.customer,
           duration: dur,
           revenue: b.summary.finalTotal,
           bucket
        };
     });
  }, [validBills]);

  const heatmap = useMemo(() => buildOccupancyHeatmap(batches, startMs, endMs, NUM_PHYSICAL_TABLES), [batches, startMs, endMs, NUM_PHYSICAL_TABLES]);

  if (batches.length === 0 && isLoading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)]">
        <span className="text-[var(--color-accent-gold)] tracking-widest uppercase font-bold animate-pulse">
          Đang tổng hợp dữ liệu...
        </span>
      </div>
    );
  }

  if (batches.length === 0 && !isLoading) {
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

  return (
    <div className={cn("p-4 md:p-8 space-y-8 h-screen overflow-y-auto pb-32 transition-opacity duration-300", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Vòng Quay Bàn</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Phân tích capacity, vòng quay, và khoảng trống giữa các bills cùng bàn</p>
        </div>
        <DateRangePicker 
          dateFilter={dateFilter} 
          setDateFilter={setDateFilter} 
          startDate={startDate} 
          setStartDate={setStartDate} 
          endDate={endDate} 
          setEndDate={setEndDate} 
        />
      </div>

      {/* C1: Capacity KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Tổng Bàn Vật Lý" 
          value={`${NUM_PHYSICAL_TABLES} bàn`}
          subtitle={`Bàn ảo: ${capacityMetrics.virtualCount} (đã lọc)`}
          color="var(--color-text-main)" 
          source="POS" 
        />
        <KPICard 
          title="Turns/Bàn/Ngày (Peak 11-14h)" 
          value={`${capacityMetrics.turnsPeak.toFixed(2)} lượt`}
          subtitle="Target: 3.0 lượt"
          color="var(--color-accent-gold)" 
          source="POS" 
        />
        <KPICard 
          title="Capacity Sử Dụng (Peak)" 
          value={`${capacityMetrics.capacityPct.toFixed(1)}%`}
          color="var(--color-accent-blue)" 
          source="POS" 
        />
        <KPICard 
          title="Idle Gap (Median)" 
          value={`${idleMetrics.median.toFixed(1)}p`}
          subtitle={`${idleMetrics.pctOver30.toFixed(1)}% case > 30p`}
          color="var(--color-accent-orange)" 
          source="POS" 
        />
      </div>

      {/* C4: Idle Gap Analysis (ROI) */}
      <div className="grid lg:grid-cols-2 gap-8">
         <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border-main)] flex flex-col justify-center">
            <h3 className="text-lg font-bold text-white mb-2">Idle Gap ROI Calculator <span className="ml-2 text-[8px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-widest inline-block align-middle">POS</span></h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">Mô phỏng doanh thu tăng cường nếu giảm thiểu thời gian bàn trống.</p>
            
            <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
               <div className="flex justify-between text-sm mb-2">
                 <span className="text-[var(--color-text-muted)]">Gap hiện tại (Median):</span>
                 <span className="font-bold text-[var(--color-accent-orange)]">{idleMetrics.median.toFixed(1)} phút / bàn</span>
               </div>
               <div className="flex justify-between items-center mb-2 mt-4">
                 <span className="text-sm text-white font-bold">Target giảm Idle Gap còn: <span className="text-[var(--color-accent-green)]">{targetGap} phút</span></span>
               </div>
               <input 
                  type="range" min="10" max="25" step="1" 
                  value={targetGap} onChange={(e) => setTargetGap(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent-green)]"
               />
            </div>

            {roi.extraBillsPerDay > 0 ? (
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[var(--color-accent-green)]/10 border border-[var(--color-accent-green)]/30 rounded-xl text-center">
                    <p className="text-[10px] uppercase text-[var(--color-accent-green)] font-bold mb-1">Thêm Bills / Ngày</p>
                    <p className="text-xl font-black text-white">+{Math.round(roi.extraBillsPerDay)}</p>
                  </div>
                  <div className="p-3 bg-[var(--color-accent-gold)]/10 border border-[var(--color-accent-gold)]/30 rounded-xl text-center">
                    <p className="text-[10px] uppercase text-[var(--color-accent-gold)] font-bold mb-1">Doanh Thu Tăng / Tháng</p>
                    <p className="text-xl font-black text-white">+{formatCurrency(roi.extraRevenuePerMonth)}</p>
                  </div>
               </div>
            ) : (
               <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center text-sm text-[var(--color-text-muted)]">
                 Target gap cao hơn hoặc bằng thực tế, không tạo thêm doanh thu mô phỏng.
               </div>
            )}
         </div>

         {/* C4a: Idle Gap Histogram */}
         <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border-main)]">
            <h3 className="text-lg font-bold text-white mb-2">Phân bố Idle Gap <span className="ml-2 text-[8px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-widest inline-block align-middle">POS</span></h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">Khoảng thời gian nằm chờ giữa 2 bills liên tiếp trên cùng 1 bàn</p>
            <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={idleMetrics.histogram}>
                    <CartesianGrid stroke="var(--color-border-main)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="bucket" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                       contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '12px', fontSize: '12px' }}
                       formatter={(val: number) => [val, 'Khoảng trống']}
                    />
                    <Bar dataKey="count" fill="var(--color-accent-orange)" radius={[4,4,0,0]} maxBarSize={40} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Grid below */}
      <div className="grid lg:grid-cols-2 gap-8">
         {/* C2: Concurrent Heatmap */}
         <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border-main)]">
            <h3 className="text-lg font-bold text-white mb-2">Concurrent Occupancy (Tần suất chiếm bàn)</h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">Lưới 15 phút. Màu hiện thị tỷ lệ bàn đang có khách.</p>
            
            <div className="overflow-x-auto custom-scrollbar">
              <div className="min-w-[500px]">
                <div className="flex mb-1">
                  <div className="w-10 shrink-0"></div>
                  {/* Hours 9 to 21 (36 to 84 quarters) */}
                  {[9,10,11,12,13,14,15,16,17,18,19,20,21].map(h => (
                     <div key={h} className="flex-[4] text-[10px] text-[var(--color-text-muted)] border-l border-[var(--color-border-main)] pl-1">{h}h</div>
                  ))}
                </div>
                
                {['CN','T2','T3','T4','T5','T6','T7'].map((dayStr, dIdx) => (
                  <div key={dIdx} className="flex items-center mb-1">
                    <div className="w-10 shrink-0 text-[10px] text-[var(--color-text-muted)] font-bold">{dayStr}</div>
                    
                    {Array(13 * 4).fill(0).map((_, i) => {
                       const q = i + (9 * 4); // start from 9am
                       const cell = heatmap.cells.find(c => c.weekday === dIdx && c.quarterHour === q);
                       const val = cell ? cell.medianOccupied : 0;
                       const pct = val / NUM_PHYSICAL_TABLES;
                       
                       let bg = "bg-white/5";
                       if (val > 0) {
                          if (pct < 0.3) bg = "bg-blue-500/30";
                          else if (pct < 0.6) bg = "bg-amber-500/60";
                          else if (pct < 0.9) bg = "bg-orange-500/80";
                          else bg = "bg-red-500";
                       }
                       const hStr = Math.floor(q/4).toString().padStart(2,'0') + ':' + ((q%4)*15).toString().padStart(2,'0');
                       return (
                         <div key={i} className={cn("flex-1 h-6 m-px rounded border border-white/5 hover:border-white transition-colors", bg)} title={`${dayStr} ${hStr} - ${val}/${NUM_PHYSICAL_TABLES} bàn (${Math.round(pct*100)}%)`}></div>
                       )
                    })}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-[var(--color-border-main)] flex items-start gap-2">
               <AlertTriangle className="w-4 h-4 text-[var(--color-accent-gold)] mt-0.5" />
               <div className="text-xs text-[var(--color-text-muted)]">
                 Khung quá tải: <b>Thứ {heatmap.peakCell.weekday === 0 ? 'CN' : heatmap.peakCell.weekday + 1} lúc {Math.floor(heatmap.peakCell.quarterHour/4)}:{((heatmap.peakCell.quarterHour%4)*15).toString().padStart(2,'0')}</b> thường đạt <b>{heatmap.peakCell.occupied}/{NUM_PHYSICAL_TABLES} bàn</b>. Cân nhắc từ chối khách hoặc dồn bàn.<br/>
                 Khung trống nhất (sáng-chiều): <b>Thứ {heatmap.idleCell.weekday === 0 ? 'CN' : heatmap.idleCell.weekday + 1} lúc {Math.floor(heatmap.idleCell.quarterHour/4)}:{((heatmap.idleCell.quarterHour%4)*15).toString().padStart(2,'0')}</b> chỉ <b>{heatmap.idleCell.occupied}/{NUM_PHYSICAL_TABLES} bàn</b>. Gợi ý làm chương trình MKT.
               </div>
            </div>
         </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
         {/* C5: Scatter Duration vs Revenue */}
         <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border-main)] h-[450px] flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4">Duration vs Revenue</h3>
            <div className="flex-1 min-h-[0px] relative">
               <ResponsiveContainer width="100%" height="100%">
                 <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-main)" />
                   <XAxis type="number" dataKey="duration" name="Thời gian" unit="p" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} label={{ value: 'Duration (phút)', position: 'insideBottom', offset: -10, fill: 'var(--color-text-muted)', fontSize: 12 }} />
                   <YAxis type="number" dataKey="revenue" name="Doanh Thu" stroke="var(--color-text-muted)" tickFormatter={(v)=> `${v/1000}k`} tickLine={false} axisLine={false} label={{ value: 'Doanh thu (VND)', angle: -90, position: 'insideLeft', offset: -20, fill: 'var(--color-text-muted)', fontSize: 12 }} />
                   <RechartsTooltip 
                     cursor={{ strokeDasharray: '3 3' }}
                     contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '12px', fontSize: '12px' }}
                     formatter={(value, name, props) => {
                        if (name === 'Thời gian') return [value + 'p', 'Duration'];
                        if (name === 'Doanh Thu') return [formatCurrency(value as number), 'Revenue'];
                        return [value, name];
                     }}
                     labelFormatter={(label, props) => {
                       const obj = props?.[0]?.payload;
                       if (!obj) return '';
                       return `Bàn T${obj.table.toString().padStart(2,'0')} - ${obj.guests} khách`;
                     }}
                   />
                   <ReferenceLine x={avgDurOverall} stroke="var(--color-accent-orange)" strokeDasharray="3 3" label={{ position: 'top', value: 'Avg Dur', fill: 'var(--color-accent-orange)', fontSize: 10 }} />
                   <ReferenceLine y={avgTicketOverall} stroke="var(--color-accent-green)" strokeDasharray="3 3" label={{ position: 'right', value: 'Avg Ticket', fill: 'var(--color-accent-green)', fontSize: 10 }} />
                   
                   <Scatter name="Bills" data={scatterData}>
                     {scatterData.map((entry, index) => {
                        let fill = "var(--color-text-muted)";
                        if (entry.bucket === '1') fill = "#5B9DF0";
                        if (entry.bucket === '2') fill = "#2DD4A0";
                        if (entry.bucket === '3-4') fill = "#D4A24E";
                        if (entry.bucket === '5-6') fill = "#F0943C";
                        if (entry.bucket === '7+') fill = "#F06060";
                        return <Cell key={`cell-${index}`} fill={fill} fillOpacity={0.6} />
                     })}
                   </Scatter>
                 </ScatterChart>
               </ResponsiveContainer>

               {/* Quadrant labels overlaid absolutely */}
               <div className="absolute top-[10%] right-[10%] text-[10px] font-bold text-white/30 uppercase pointer-events-none">Khách VIP, OK</div>
               <div className="absolute top-[10%] left-[20%] text-[10px] font-bold text-[var(--color-accent-green)]/30 uppercase pointer-events-none">Nên nhân rộng</div>
               <div className="absolute bottom-[10%] right-[10%] text-[10px] font-bold text-red-500/30 uppercase pointer-events-none">Nán bàn lâu</div>
            </div>
         </div>

         {/* C3: Per-Table Matrix */}
         <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border-main)] flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4">Chi Tiết Từng Bàn <span className="ml-2 text-[8px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-widest inline-block align-middle">POS</span></h3>
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar max-h-[400px]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="sticky top-0 bg-[var(--color-bg-surface)] z-10">
                  <tr className="border-b border-[var(--color-border-main)] text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                    <th className="pb-2 pr-2">Bàn</th>
                    <th className="pb-2 px-2">Bills</th>
                    <th className="pb-2 px-2">Turns/Peak</th>
                    <th className="pb-2 px-2">Idle Gap</th>
                    <th className="pb-2 pl-2 text-right">Tổng DOANH THU</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {[...perTableData].sort((a,b)=> b.totalRevenue - a.totalRevenue).map((t, idx) => {
                     const isTop = idx < 3;
                     const isBadGap = t.medianIdleGapMin > 40;
                     return (
                        <tr key={t.table} className={cn("border-b border-[var(--color-border-main)]/50", isTop && "bg-[var(--color-accent-gold)]/5", isBadGap && "bg-red-500/5")}>
                          <td className="py-2 pr-2 font-black">
                            <span className={cn("inline-block w-full border-l-2 pl-2", isTop ? "border-[var(--color-accent-gold)]" : isBadGap ? "border-red-500" : "border-transparent")}>T{String(t.table).padStart(2,'0')}</span>
                          </td>
                          <td className="py-2 px-2">{t.bills}</td>
                          <td className="py-2 px-2">{t.turnsPerDayPeak.toFixed(1)}</td>
                          <td className={cn("py-2 px-2 font-mono", isBadGap ? "text-red-400 font-bold" : "")}>{t.medianIdleGapMin.toFixed(0)}p</td>
                          <td className="py-2 pl-2 text-right text-[var(--color-accent-gold)] font-bold">{formatCurrency(t.totalRevenue)}</td>
                        </tr>
                     )
                  })}
                </tbody>
              </table>
            </div>
         </div>
      </div>
    </div>
  );
}
