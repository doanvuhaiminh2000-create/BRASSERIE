import React from 'react';
import { Award, Zap, DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useApp } from '../../store/AppContext';

export function StaffAnalysis() {
  const { users } = useApp();

  // Mocking performance metrics
  const staffPerformance = users.filter(u => u.role === 'staff').map(u => ({
    ...u,
    upsellRevenue: Math.floor(Math.random() * 5000000) + 1000000,
    upsellRate: Math.floor(Math.random() * 30) + 10,
    avgSpeed: parseFloat((Math.random() * 10 + 15).toFixed(1)), // mins
    bills: Math.floor(Math.random() * 200) + 50,
  })).sort((a, b) => b.upsellRevenue - a.upsellRevenue);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Hiệu Suất Nhân Viên (Staff Leaderboard)</h2>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Đánh giá nhân viên dựa trên doanh thu upsell và tốc độ vận hành.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Top Upsell" value={staffPerformance[0]?.name?.split(' ').pop()} subtitle={formatCurrency(staffPerformance[0]?.upsellRevenue)} icon={Award} color="var(--color-accent-gold)" />
        <StatCard title="Top Tốc Độ" value={[...staffPerformance].sort((a,b) => a.avgSpeed - b.avgSpeed)[0]?.name?.split(' ').pop()} subtitle={`${[...staffPerformance].sort((a,b) => a.avgSpeed - b.avgSpeed)[0]?.avgSpeed} phút`} icon={Zap} color="var(--color-accent-blue)" />
        <StatCard title="TB Upsell Rate" value={`${(staffPerformance.reduce((acc,s) => acc + s.upsellRate, 0) / (staffPerformance.length || 1)).toFixed(1)}%`} icon={TrendingUp} color="var(--color-accent-green)" />
        <StatCard title="Tổng Bills Xuất" value={staffPerformance.reduce((acc,s) => acc + s.bills, 0)} icon={DollarSign} color="var(--color-accent-purple)" />
      </div>

      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[var(--color-border-main)] flex justify-between items-center bg-[var(--color-bg-surface)]">
          <h3 className="font-semibold text-white uppercase tracking-wider text-sm">Bảng Xếp Hạng Nhân Viên</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[var(--color-bg-main)]/50">
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-sm w-16 text-center">Hạng</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-sm">Nhân Viên</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-sm text-center">Số Bills</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-sm text-center">Doanh Thu Upsell</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-sm text-right">Tỷ Lệ Upsell</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-sm text-right">Tốc Độ Phục Vụ</th>
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
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-main)] border border-[var(--color-border-main)] flex items-center justify-center font-bold text-[var(--color-text-muted)] text-sm group-hover:bg-[var(--color-border-main)] transition-colors">
                        {staff?.id?.substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{staff.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] font-mono">{staff.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-center font-mono text-[var(--color-text-main)]">
                    {staff.bills}
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-center font-bold text-[var(--color-accent-gold)]">
                    {formatCurrency(staff.upsellRevenue)}
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                      ${staff.upsellRate >= 25 ? 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)] border border-[var(--color-accent-green)]/20' : 
                        staff.upsellRate >= 15 ? 'bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)] border border-[var(--color-accent-gold)]/20' : 
                        'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/20'}
                    `}>
                      {staff.upsellRate}%
                    </span>
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-right font-mono text-[var(--color-text-muted)] group-hover:text-white transition-colors">
                    {staff.avgSpeed} phút
                  </td>
                </tr>
              ))}
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
        <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-widest leading-relaxed">
          {title}
        </p>
        <div className="p-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-main)] shrink-0" style={{ color: color }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
         <h4 className="text-3xl font-bold text-white tracking-tight">{value}</h4>
         {subtitle && (
          <div className="mt-2 text-sm font-medium text-[var(--color-text-muted)] border-t border-[var(--color-border-main)] pt-2">
             {subtitle}
          </div>
         )}
      </div>
    </div>
  );
}
