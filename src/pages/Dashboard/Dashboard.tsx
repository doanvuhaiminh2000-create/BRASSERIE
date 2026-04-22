import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';

// Synthetic data based on prompt context
const dailyRevenue = [
  { name: '01/04', Food: 15.2, Beverage: 3.1 },
  { name: '02/04', Food: 14.8, Beverage: 3.5 },
  { name: '03/04', Food: 16.5, Beverage: 4.0 },
  { name: '04/04', Food: 20.1, Beverage: 5.2 },
  { name: '05/04', Food: 22.5, Beverage: 6.0 },
  { name: '06/04', Food: 18.2, Beverage: 4.1 },
  { name: '07/04', Food: 16.0, Beverage: 3.8 },
];

const hourlyDistribution = [
  { hour: '08h', guests: 10 },
  { hour: '09h', guests: 25 },
  { hour: '10h', guests: 45 },
  { hour: '11h', guests: 120 },
  { hour: '12h', guests: 180 },
  { hour: '13h', guests: 150 },
  { hour: '14h', guests: 80 },
  { hour: '15h', guests: 40 },
  { hour: '16h', guests: 20 },
  { hour: '17h', guests: 10 },
];

const categoryData = [
  { name: 'Food', value: 81 },
  { name: 'Beverage', value: 19 },
];

const COLORS = ['#D4A24E', '#5B9DF0'];

export function Dashboard() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Banner */}
      <div className="bg-[var(--color-accent-green)]/10 border border-[var(--color-accent-green)]/30 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center text-sm font-medium">
        <span className="text-[var(--color-accent-green)]">HÔM NAY: 22/04 | Bills: 45 | DT: 12.5 triệu | Bàn đang có khách: 14/30 | TB chiếm bàn: 38p | Giờ cao điểm tiếp theo: 12:00</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['Hôm nay', 'Tuần này', 'Tháng này', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tùy chỉnh...'].map((f, i) => (
          <button 
            key={f}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${i === 2 ? 'bg-[var(--color-accent-gold)] text-black' : 'bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] text-[var(--color-text-muted)] hover:text-white'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Tổng Doanh Thu" value="184.5M" trend="+5.2%" color="var(--color-accent-gold)" />
        <KPICard title="Tổng Số Bills" value="2,410" trend="+2.1%" color="var(--color-accent-blue)" />
        <KPICard title="Giá Trị TB/Bill" value="717K" trend="-4.8%" color="var(--color-accent-purple)" isDown />
        <KPICard title="TB Khách/Bill" value="3.2" trend="+0.1" color="var(--color-accent-green)" />
        <KPICard title="TB Chiếm Bàn" value="36p" trend="-2p" color="var(--color-accent-orange)" />
        <KPICard title="Beverage/Tổng" value="19%" trend="-1.2%" color="var(--color-accent-red)" isDown />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Revenue */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-6 uppercase tracking-wider text-sm">Doanh Thu 7 Ngày Theo Hạng Mục</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer>
              <BarChart data={dailyRevenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-main)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)' }} />
                <Legend iconType="circle" />
                <Bar dataKey="Food" stackId="a" fill="var(--color-accent-gold)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Beverage" stackId="a" fill="var(--color-accent-blue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Hourly Distribution */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 relative">
          <h3 className="font-semibold text-white mb-6 uppercase tracking-wider text-sm">Phân Bố Khách Theo Khung Giờ</h3>
          <div className="absolute top-6 right-6 px-3 py-1 bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)] rounded-md text-xs font-bold border border-[var(--color-accent-gold)]/20">
            GIỜ VÀNG (11h-14h): 83% DT
          </div>
          <div className="h-[300px] w-full mt-2">
            <ResponsiveContainer>
              <AreaChart data={hourlyDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGuests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent-gold)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-accent-gold)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-main)" vertical={false} />
                <XAxis dataKey="hour" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)' }} />
                <Area type="monotone" dataKey="guests" stroke="var(--color-accent-gold)" fillOpacity={1} fill="url(#colorGuests)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

       {/* Charts Row 2 */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
           <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6">
               <h3 className="font-semibold text-white mb-2 uppercase tracking-wider text-sm text-center">Cơ Cấu Danh Mục</h3>
               <div className="h-[250px] w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={categoryData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
           </div>
           
           <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 flex items-center justify-center">
              <p className="text-[var(--color-text-muted)] italic">Biểu đồ doanh thu theo ngày trong tuần...</p>
           </div>
           
           <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 flex items-center justify-center">
              <p className="text-[var(--color-text-muted)] italic">So sánh xu hướng 3 tháng Q1...</p>
           </div>
       </div>
    </div>
  );
}

function KPICard({ title, value, trend, color, isDown = false }: { title: string, value: string, trend: string, color: string, isDown?: boolean }) {
  return (
    <div className="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] p-5 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: color }}></div>
      <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-widest break-words mt-1 mb-2">
        {title}
      </p>
      <div className="flex items-end gap-2">
        <h4 className="text-3xl font-bold text-white tracking-tight">{value}</h4>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs font-medium" style={{ color: isDown ? 'var(--color-accent-red)' : 'var(--color-accent-green)' }}>
         {isDown ? '↓' : '↑'} {trend}
      </div>
    </div>
  );
}
