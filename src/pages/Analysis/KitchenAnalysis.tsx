import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChefHat, Flame, Timer, CheckCircle, Database } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { DateRangePicker } from '../../components/DateRangePicker';
import { sessionAnalytics, KitchenMetrics } from '../../services/sessionAnalytics';

export function KitchenAnalysis() {
  const { sessions, isReady } = useApp();
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const activeRange = useMemo(() => ({ start: startDate, end: endDate }), [startDate, endDate]);

  const filteredSessions = useMemo(() => {
    const startMs = new Date(activeRange.start).setHours(0,0,0,0);
    const endMs = new Date(activeRange.end).setHours(23,59,59,999);
    return (sessions || []).filter(s => s.openedAt >= startMs && s.openedAt <= endMs);
  }, [sessions, activeRange]);

  const metrics = useMemo<KitchenMetrics>(() => {
    return sessionAnalytics.getKitchenMetrics(filteredSessions);
  }, [filteredSessions]);

  const stationChartData = useMemo(() => {
    const stationNames: Record<string, string> = { 'P': 'Pha Chế', 'N': 'Bếp Nóng', 'L': 'Bếp Lạnh', 'B': 'Bánh/Pizza' };
    return (Object.entries(metrics.stationMetrics) as [string, number][]).map(([stationCode, avgTime]) => ({
      station: stationNames[stationCode] || stationCode,
      avgTime: Number((avgTime / 60000).toFixed(1)), // convert to minutes
      target: stationCode === 'B' ? 12 : stationCode === 'L' ? 5 : stationCode === 'P' ? 3 : 15
    })).sort((a, b) => b.avgTime - a.avgTime);
  }, [metrics.stationMetrics]);

  const overallAvg = useMemo(() => {
    const values = Object.values(metrics.stationMetrics) as number[];
    if (!values.length) return 0;
    return (values.reduce((a, b) => a + b, 0) / values.length) / 60000;
  }, [metrics.stationMetrics]);

  const fastestStation = useMemo(() => {
    const stationNames: Record<string, string> = { 'P': 'Pha Chế', 'N': 'Bếp Nóng', 'L': 'Bếp Lạnh', 'B': 'Bánh/Pizza' };
    const entries = Object.entries(metrics.stationMetrics) as [string, number][];
    if (!entries.length) return "—";
    const code = entries.sort((a, b) => a[1] - b[1])[0][0];
    return stationNames[code] || code;
  }, [metrics.stationMetrics]);

  const slowestStation = useMemo(() => {
    const stationNames: Record<string, string> = { 'P': 'Pha Chế', 'N': 'Bếp Nóng', 'L': 'Bếp Lạnh', 'B': 'Bánh/Pizza' };
    const entries = Object.entries(metrics.stationMetrics) as [string, number][];
    if (!entries.length) return "—";
    const code = entries.sort((a, b) => b[1] - a[1])[0][0];
    return stationNames[code] || code;
  }, [metrics.stationMetrics]);

  if (!isReady) return null;

  return (
    <div className="p-6 md:p-8 space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight uppercase">Hiệu Quả Bếp (Kitchen Performance)</h2>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Phân tích tốc độ ra món dựa trên thời điểm SEND KITCHEN và SERVE ITEM.</p>
        </div>
        <DateRangePicker startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-blue-400 text-sm flex items-center gap-2">
        <Database className="w-4 h-4" />
        Dữ liệu được tổng hợp từ các lần phục vụ món thực tế tại từng quầy (Station).
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="TB Ra Món (Overall)" value={`${overallAvg.toFixed(1)}p`} icon={Timer} color="var(--color-accent-blue)" />
        <StatCard title="Station Nhanh Nhất" value={fastestStation} icon={CheckCircle} color="var(--color-accent-green)" />
        <StatCard title="Station Chậm Nhất" value={slowestStation} icon={Flame} color="var(--color-accent-red)" />
        <StatCard title="Món Phân Tích" value={metrics.slowestItems.length.toLocaleString()} icon={ChefHat} color="var(--color-accent-gold)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-semibold text-white mb-6 uppercase tracking-wider text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent-blue)]"></span>
            Thời gian hoàn thành món trung bình (phút)
          </h3>
          <div className="h-[350px] w-full">
            {stationChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] italic text-xs uppercase tracking-widest">Chưa có dữ liệu</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={stationChartData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-main)" horizontal={true} vertical={false}/>
                  <XAxis type="number" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis dataKey="station" type="category" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '8px' }} 
                    cursor={{ fill: 'var(--color-border-main)', opacity: 0.1 }}
                  />
                  <Bar dataKey="avgTime" name="Thời Gian TB (phút)" radius={[0, 4, 4, 0]} maxBarSize={30}>
                    {stationChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avgTime > entry.target ? 'var(--color-accent-red)' : 'var(--color-accent-blue)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 flex items-center gap-6 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--color-accent-blue)]" />
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold">Trong mục tiêu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--color-accent-red)]" />
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold">Vượt mục tiêu (Cần tối ưu)</span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 flex flex-col">
          <h3 className="font-semibold text-white mb-6 uppercase tracking-wider text-sm">
            Top Món "Đợi Lâu"
          </h3>
          <div className="flex-1 space-y-4">
            {metrics.slowestItems.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] italic text-xs uppercase tracking-widest">Chưa có dữ liệu</div>
            ) : (
              metrics.slowestItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center group">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-bold text-white truncate" title={item.name}>{item.name}</p>
                    <div className="w-full bg-white/5 h-1 rounded-full mt-1 overflow-hidden">
                       <div className="h-full bg-[var(--color-accent-red)] rounded-full" style={{ width: `${Math.min(100, (item.avgTime / 30) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-sm font-black text-[var(--color-accent-red)] tabular-nums">{item.avgTime}p</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] p-6 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }}></div>
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest leading-relaxed">
          {title}
        </p>
        <div className="p-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-main)]" style={{ color: color }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h4 className="text-3xl font-black text-white tracking-tight">{value}</h4>
    </div>
  );
}
