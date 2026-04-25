import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Target, TrendingUp, DollarSign, Award } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

// --- Synthetic Data cho Báo cáo (Do dữ liệu thực tế live-entry có thể chưa đủ volume) ---
const weeklyUpsellData = [
  { name: 'Thứ 2', success: 42, fail: 65 },
  { name: 'Thứ 3', success: 38, fail: 55 },
  { name: 'Thứ 4', success: 55, fail: 60 },
  { name: 'Thứ 5', success: 48, fail: 70 },
  { name: 'Thứ 6', success: 85, fail: 90 },
  { name: 'Thứ 7', success: 110, fail: 80 },
  { name: 'Chủ Nhật', success: 95, fail: 75 },
];

const rejectReasonsData = [
  { name: 'Đã gọi quá nhiều', value: 45 },
  { name: 'Giá đắt', value: 25 },
  { name: 'Không hợp khẩu vị', value: 15 },
  { name: 'Đang vội', value: 10 },
  { name: 'Khác', value: 5 },
];

const topStaffData = [
  { id: 'HALTT', name: 'Lê Thị Thu Hà', bills: 450, totalUpsold: 180, revenue: 16500000, rate: 40.0 },
  { id: 'HUYENDTT', name: 'Đinh Thị Thanh Huyền', bills: 320, totalUpsold: 112, revenue: 9800000, rate: 35.0 },
  { id: 'THUONGVH', name: 'Võ Hà Thương', bills: 280, totalUpsold: 95, revenue: 7500000, rate: 33.9 },
  { id: 'PHUONGNL', name: 'Nguyễn Lê Phương', bills: 250, totalUpsold: 75, revenue: 6200000, rate: 30.0 },
  { id: 'DIEMNT', name: 'Nguyễn Thu Diễm', bills: 210, totalUpsold: 50, revenue: 5100000, rate: 23.8 },
];

const PIE_COLORS = [
  'var(--color-accent-blue)', 
  'var(--color-accent-red)', 
  'var(--color-accent-gold)', 
  'var(--color-accent-orange)', 
  'var(--color-border-main)'
];

export function UpsellAnalysis() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Hành Vi Order & Upsell</h2>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Phân tích hiệu quả tư vấn món và chuyển đổi doanh thu 30 ngày qua.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] text-[var(--color-text-muted)] hover:text-white rounded-lg text-sm font-medium transition-colors">
            Tháng này
          </button>
          <button className="px-4 py-2 bg-[var(--color-accent-gold)] text-black font-semibold rounded-lg text-sm transition-colors shadow-[0_0_15px_rgba(212,162,78,0.2)]">
            Xuất Báo Cáo
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Tổng Doanh Thu Upsell" 
          value="45.1M" 
          trend="+12.5%" 
          icon={DollarSign} 
          color="var(--color-accent-gold)" 
        />
        <KPICard 
          title="Tỉ Lệ Chuyển Đổi (Win Rate)" 
          value="38.5%" 
          trend="+2.1%" 
          icon={Target} 
          color="var(--color-accent-green)" 
        />
        <KPICard 
          title="Giá Trị Upsell TB / Bill" 
          value="45,200đ" 
          trend="-1.5%" 
          icon={TrendingUp} 
          color="var(--color-accent-blue)" 
          isDown 
        />
        <KPICard 
          title="Nhân Viên Xuất Sắc" 
          value="Thu Hà" 
          subtitle="40% Win Rate" 
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
              <BarChart data={weeklyUpsellData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-main)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
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
          <div className="text-center text-[var(--color-text-muted)] text-xs mb-4">Dựa trên 495 lượt từ chối ghi nhận</div>
          <div className="h-[280px] w-full flex-1">
            <ResponsiveContainer>
              <PieChart>
                <Pie 
                  data={rejectReasonsData} 
                  innerRadius={70} 
                  outerRadius={100} 
                  paddingAngle={5} 
                  dataKey="value" 
                  stroke="none"
                >
                  {rejectReasonsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '8px', color: '#fff' }} 
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => [`${value}%`, 'Tỷ lệ']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Custom Legend for Pie */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-4 px-2">
            {rejectReasonsData.slice(0, 4).map((reason, idx) => (
              <div key={reason.name} className="flex items-center gap-2 text-xs text-[var(--color-text-main)]">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[idx] }}></div>
                <span className="truncate" title={reason.name}>{reason.name} (<span className="font-semibold">{reason.value}%</span>)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table: Top Staff */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[var(--color-border-main)] flex justify-between items-center bg-[var(--color-bg-surface)]">
          <h3 className="font-semibold text-white uppercase tracking-wider text-sm">Bảng Xếp Hạng Upsell Nhân Viên</h3>
          <span className="px-3 py-1 bg-[var(--color-border-main)]/50 text-[var(--color-text-muted)] text-xs rounded-full">Top 5</span>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[var(--color-bg-main)]/50">
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-sm w-16 text-center">Hạng</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-sm">Nhân Viên</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-sm text-center">Lượt Bill</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-sm text-center">Upsell TC</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-sm text-right">Tỷ Lệ Win</th>
                <th className="p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-sm text-right">Doanh Thu Upsell</th>
              </tr>
            </thead>
            <tbody>
              {topStaffData.map((staff, idx) => (
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
                        {staff.id.substring(0, 2)}
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
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-center font-mono text-[var(--color-accent-green)]">
                    {staff.totalUpsold}
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                      ${staff.rate >= 35 ? 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)] border border-[var(--color-accent-green)]/20' : 
                        staff.rate >= 30 ? 'bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)] border border-[var(--color-accent-gold)]/20' : 
                        'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/20'}
                    `}>
                      {staff.rate}%
                    </span>
                  </td>
                  <td className="p-4 border-b border-[var(--color-border-main)]/50 text-right font-bold text-[var(--color-accent-gold)]">
                    {formatCurrency(staff.revenue)}
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

// Sub-component cho KPI Card
function KPICard({ 
  title, 
  value, 
  trend, 
  color, 
  icon: Icon, 
  isDown = false,
  subtitle
}: { 
  title: string, 
  value: string, 
  trend?: string, 
  color: string, 
  icon: any, 
  isDown?: boolean,
  subtitle?: string
}) {
  return (
    <div className="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] p-6 relative overflow-hidden group hover:border-slate-600 transition-colors">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }}></div>
      
      <div className="flex justify-between items-start mb-4">
        <p className="text-xs text-[var(--color-text-muted)] font-semibold uppercase tracking-widest break-words pr-4 leading-relaxed">
          {title}
        </p>
        <div className="p-2.5 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-main)] shrink-0 group-hover:scale-105 transition-transform" style={{ color: color }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div>
        <h4 className="text-3xl font-bold text-white tracking-tight">{value}</h4>
        
        {trend && (
          <div className="mt-3 flex items-center gap-1.5 text-sm font-medium" style={{ color: isDown ? 'var(--color-accent-red)' : 'var(--color-accent-green)' }}>
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-current/10">
              {isDown ? '↓' : '↑'}
            </span>
            {trend} <span className="text-[var(--color-text-muted)] font-normal text-xs ml-1">vs tháng trước</span>
          </div>
        )}
        
        {subtitle && (
          <div className="mt-3 text-sm font-medium text-[var(--color-text-muted)] border-t border-[var(--color-border-main)] pt-3">
             {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
