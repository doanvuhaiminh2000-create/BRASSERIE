import React, { useState, useMemo } from 'react';
import { Award, Zap, DollarSign, TrendingUp, Database } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useApp } from '../../store/AppContext';
import { DateRangePicker } from '../../components/DateRangePicker';
import { sessionAnalytics } from '../../services/sessionAnalytics';

export function StaffAnalysis() {
  const { users, sessions, isReady } = useApp();

  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const activeRange = useMemo(() => ({ start: startDate, end: endDate }), [startDate, endDate]);

  const filteredSessions = useMemo(() => {
    const startMs = new Date(activeRange.start).setHours(0,0,0,0);
    const endMs = new Date(activeRange.end).setHours(23,59,59,999);
    return (sessions || []).filter(s => s.openedAt >= startMs && s.openedAt <= endMs);
  }, [sessions, activeRange]);

  const metrics = useMemo(() => {
    return sessionAnalytics.getStaffMetrics(filteredSessions);
  }, [filteredSessions]);

  const staffPerformance = useMemo(() => {
    return Object.entries(metrics).map(([staffId, data]) => {
      const user = users.find(u => u.id === staffId);
      return {
        id: staffId,
        name: user?.name || staffId,
        upsellRevenue: data.upsellRevenue,
        upsellRate: data.upsellAttempts > 0 ? (data.upsellSuccess / data.upsellAttempts) * 100 : 0,
        bills: data.openedTables, // using opened tables as Bill proxy or closedBills
        revenue: data.revenue
      };
    }).sort((a, b) => b.upsellRevenue - a.upsellRevenue);
  }, [metrics, users]);

  if (!isReady) return null;

  const topUpsell = staffPerformance[0];
  const topRevenue = [...staffPerformance].sort((a, b) => b.revenue - a.revenue)[0];
  const avgUpsellRate = staffPerformance.length ? staffPerformance.reduce((acc,s) => acc + s.upsellRate, 0) / staffPerformance.length : 0;
  const totalBills = staffPerformance.reduce((acc,s) => acc + s.bills, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight uppercase">Hiệu Suất Nhân Viên (Staff Leaderboard)</h2>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Đánh giá nhân viên dựa trên doanh thu mở bàn và doanh thu upsell.</p>
        </div>
        <DateRangePicker startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-blue-400 text-sm flex items-center gap-2">
        <Database className="w-4 h-4" />
        Dữ liệu được lấy trực tiếp từ các phiên làm việc đã đóng trong khoảng thời gian trên.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Top Upsell" value={topUpsell?.name?.split(' ').pop() || '—'} subtitle={formatCurrency(topUpsell?.upsellRevenue || 0)} icon={Award} color="var(--color-accent-gold)" />
        <StatCard title="Top Doanh Thu" value={topRevenue?.name?.split(' ').pop() || '—'} subtitle={formatCurrency(topRevenue?.revenue || 0)} icon={Zap} color="var(--color-accent-blue)" />
        <StatCard title="TB Upsell Rate" value={`${avgUpsellRate.toFixed(1)}%`} icon={TrendingUp} color="var(--color-accent-green)" />
        <StatCard title="Tổng Lượt Bàn" value={totalBills} icon={DollarSign} color="var(--color-accent-purple)" />
      </div>

      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[var(--color-border-main)] py-4">
          <h3 className="font-semibold text-white uppercase tracking-wider text-sm">Bảng Xếp Hạng Nhân Viên</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[var(--color-bg-main)]/50">
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-widest text-center">Hạng</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-widest">Nhân Viên</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-widest text-center">Số Lượt Bàn</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-widest text-right">Doanh Thu Tổng</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-widest text-right">Tỷ Lệ Upsell</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-widest text-right">Doanh Thu Upsell</th>
              </tr>
            </thead>
            <tbody>
              {staffPerformance.map((staff, idx) => (
                <tr key={staff.id} className="hover:bg-[var(--color-border-main)]/20 transition-colors group">
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-center">
                    <div className="flex justify-center items-center">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs
                        ${idx === 0 ? 'bg-[var(--color-accent-gold)] text-black' : 
                          idx === 1 ? 'bg-slate-300 text-black' : 
                          idx === 2 ? 'bg-[#cd7f32] text-white' : 'bg-[var(--color-bg-main)] border border-[var(--color-border-main)] text-[var(--color-text-muted)]'}
                      `}>
                        {idx + 1}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-main)] border border-[var(--color-border-main)] flex items-center justify-center font-bold text-[var(--color-text-muted)] text-sm group-hover:bg-[var(--color-accent-gold)] group-hover:text-black transition-colors">
                        {staff?.id?.substring(0, 2).toUpperCase()}
                      </div>
                      <p className="font-medium text-white">{staff.name}</p>
                    </div>
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-center font-mono text-[var(--color-text-main)]">
                    {staff.bills}
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-right font-mono text-[var(--color-text-main)]">
                    {formatCurrency(staff.revenue)}
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                      ${staff.upsellRate >= 25 ? 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)] border border-[var(--color-accent-green)]/20' : 
                        staff.upsellRate >= 15 ? 'bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)] border border-[var(--color-accent-gold)]/20' : 
                        'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/20'}
                    `}>
                      {staff.upsellRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-right font-bold text-[var(--color-accent-gold)]">
                    {formatCurrency(staff.upsellRevenue)}
                  </td>
                </tr>
              ))}
              {staffPerformance.length === 0 && (
                <tr>
                   <td colSpan={6} className="p-10 text-center text-[var(--color-text-muted)] italic uppercase tracking-widest text-xs">Chưa có dữ liệu nhân viên</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <div className="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] p-6 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }}></div>
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest leading-relaxed">
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
