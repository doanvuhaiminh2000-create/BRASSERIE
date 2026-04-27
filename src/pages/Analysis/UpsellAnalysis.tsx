import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Target, TrendingUp, DollarSign, Award, Database } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { useApp } from '../../store/AppContext';
import { DateRangePicker } from '../../components/DateRangePicker';
import { sessionAnalytics, UpsellMetrics } from '../../services/sessionAnalytics';

const PIE_COLORS = [
  'var(--color-accent-blue)', 
  'var(--color-accent-red)', 
  'var(--color-accent-gold)', 
  'var(--color-accent-orange)', 
  'var(--color-border-main)'
];

export function UpsellAnalysis() {
  const { sessions, isReady } = useApp();
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const activeRange = useMemo(() => ({ start: startDate, end: endDate }), [startDate, endDate]);

  const filteredSessions = useMemo(() => {
    const startMs = new Date(activeRange.start).setHours(0,0,0,0);
    const endMs = new Date(activeRange.end).setHours(23,59,59,999);
    return (sessions || []).filter(s => s.openedAt >= startMs && s.openedAt <= endMs);
  }, [sessions, activeRange]);

  const metrics = useMemo<UpsellMetrics>(() => {
    return sessionAnalytics.getUpsellMetrics(filteredSessions);
  }, [filteredSessions]);

  const dailyData = useMemo(() => {
    return (Object.entries(metrics.successByDay) as [string, { success: number, rejected: number }][]).map(([date, data]) => ({
      name: date.split('-').slice(1).reverse().join('/'), // mm/dd or dd/mm
      success: data.success,
      fail: data.rejected
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [metrics.successByDay]);

  const pieData = useMemo(() => {
    return (Object.entries(metrics.reasonMap) as [string, number][]).map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);
  }, [metrics.reasonMap]);

  if (!isReady) return null;

  return (
    <div className="p-6 md:p-8 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight uppercase">Hành Vi Order & Upsell</h2>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Phân tích hiệu quả tư vấn món và chuyển đổi doanh thu từ Live Entry.</p>
        </div>
        <DateRangePicker startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-blue-400 text-sm flex items-center gap-2">
        <Database className="w-4 h-4" />
        Dữ liệu được trích xuất trực tiếp từ các phiên phục vụ (Live Entry) trong khoảng thời gian đã chọn.
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Doanh Thu Upsell" 
          value={formatCurrency(metrics.totalUpsellRevenue)} 
          icon={DollarSign} 
          color="var(--color-accent-gold)" 
        />
        <KPICard 
          title="Tỉ Lệ Win Rate" 
          value={`${metrics.winRate.toFixed(1)}%`} 
          icon={Target} 
          color="var(--color-accent-green)" 
        />
        <KPICard 
          title="Số Lượt Tư Vấn" 
          value={metrics.totalAttempts.toLocaleString()} 
          icon={TrendingUp} 
          color="var(--color-accent-blue)" 
        />
        <KPICard 
          title="Nhân Viên Top 1" 
          value={metrics.staffLeaderboard[0]?.staffName || "—"} 
          subtitle={metrics.staffLeaderboard[0] ? `${metrics.staffLeaderboard[0].rate.toFixed(1)}% Success Rate` : "Chưa có dữ liệu"} 
          icon={Award} 
          color="var(--color-accent-purple)" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Success vs Fail */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 lg:col-span-2 flex flex-col">
          <h3 className="font-semibold text-white mb-6 uppercase tracking-wider text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent-gold)]"></span>
            Tương quan Thành công / Thất bại theo ngày
          </h3>
          <div className="h-[320px] w-full flex-1">
            <ResponsiveContainer>
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-main)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '8px' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="success" name="Thành Công" fill="var(--color-accent-green)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="fail" name="Từ Chối" fill="var(--color-accent-red)" opacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Reject Reasons */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 flex flex-col">
          <h3 className="font-semibold text-white mb-2 uppercase tracking-wider text-sm text-center">
            Lý Do Từ Chối Phổ Biến
          </h3>
          <div className="text-center text-[var(--color-text-muted)] text-xs mb-4">Dựa trên {metrics.totalAttempts - metrics.successfulAttempts} lượt từ chối</div>
          <div className="h-[280px] w-full flex-1">
            <ResponsiveContainer>
              <PieChart>
                <Pie 
                  data={pieData} 
                  innerRadius={70} 
                  outerRadius={100} 
                  paddingAngle={5} 
                  dataKey="value" 
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '8px', color: '#fff' }} 
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-4 px-2">
            {pieData.slice(0, 4).map((reason, idx) => (
              <div key={reason.name} className="flex items-center gap-2 text-xs text-[var(--color-text-main)]">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[idx] }}></div>
                <span className="truncate" title={reason.name}>{reason.name} (<span className="font-semibold">{reason.value}</span>)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table: Staff Stats */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[var(--color-border-main)] py-4">
          <h3 className="font-semibold text-white uppercase tracking-wider text-sm">Bảng Xếp Hạng Hiệu Quả Tư Vấn</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[var(--color-bg-main)]/50">
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-widest">Nhân Viên</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-widest text-center">Lượt Tư Vấn</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-widest text-right">Tỷ Lệ Win</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-widest text-right">Doanh Thu Upsell</th>
              </tr>
            </thead>
            <tbody>
              {metrics.staffLeaderboard.map((staff, idx) => (
                <tr key={idx} className="hover:bg-[var(--color-border-main)]/20 transition-colors group">
                  <td className="p-4 border-b border-[var(--color-border-main)]/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-main)] border border-[var(--color-border-main)] flex items-center justify-center font-bold text-[var(--color-text-muted)] text-sm group-hover:bg-[var(--color-accent-gold)] group-hover:text-black transition-colors">
                        {staff.staffName.substring(0, 2).toUpperCase()}
                      </div>
                      <p className="font-medium text-white">{staff.staffName}</p>
                    </div>
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-center font-mono text-[var(--color-text-main)]">
                    {staff.attempts}
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                      ${staff.rate >= 35 ? 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)] border border-[var(--color-accent-green)]/20' : 
                        staff.rate >= 20 ? 'bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)] border border-[var(--color-accent-gold)]/20' : 
                        'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/20'}
                    `}>
                      {staff.rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-right font-bold text-[var(--color-accent-gold)]">
                    {formatCurrency(staff.revenue)}
                  </td>
                </tr>
              ))}
              {metrics.staffLeaderboard.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-[var(--color-text-muted)] italic uppercase tracking-widest text-xs">Chưa có dữ liệu tư vấn món</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Sub-component cho KPI Card
function KPICard({ 
  title, 
  value, 
  color, 
  icon: Icon, 
  subtitle
}: { 
  title: string, 
  value: string, 
  color: string, 
  icon: any, 
  subtitle?: string
}) {
  return (
    <div className="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] p-6 relative overflow-hidden group hover:border-slate-600 transition-colors">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }}></div>
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest break-words pr-4 leading-relaxed">
          {title}
        </p>
        <div className="p-2.5 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-main)] shrink-0 group-hover:scale-105 transition-transform" style={{ color: color }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <h4 className="text-3xl font-black text-white tracking-tight">{value}</h4>
        {subtitle && (
          <div className="mt-3 text-xs font-medium text-[var(--color-text-muted)] border-t border-[var(--color-border-main)] pt-3 italic">
             {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
