import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Clock, Users, Timer } from 'lucide-react';

const hourlyData = [
  { time: '08:00', load: 10, wait: 2 },
  { time: '09:00', load: 25, wait: 5 },
  { time: '10:00', load: 45, wait: 8 },
  { time: '11:00', load: 120, wait: 15 },
  { time: '12:00', load: 180, wait: 22 },
  { time: '13:00', load: 150, wait: 18 },
  { time: '14:00', load: 80, wait: 10 },
  { time: '15:00', load: 40, wait: 5 },
  { time: '16:00', load: 20, wait: 3 },
  { time: '17:00', load: 15, wait: 2 },
  { time: '18:00', load: 110, wait: 12 },
  { time: '19:00', load: 160, wait: 20 },
  { time: '20:00', load: 140, wait: 15 },
];

export function OperationAnalysis() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Khai Thác & Vận Hành</h2>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Lưu lượng khách và thời gian trung bình từng giai đoạn phục vụ.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="TB Chờ Món" value="18p" icon={Clock} color="var(--color-accent-blue)" />
        <StatCard title="TB Thanh Toán" value="4.5p" icon={Timer} color="var(--color-accent-green)" />
        <StatCard title="Vòng Quay Bàn" value="3.2" icon={Activity} color="var(--color-accent-gold)" />
        <StatCard title="Cao Điểm Trong Ngày" value="12:00 - 13:00" icon={Users} color="var(--color-accent-purple)" />
      </div>

      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-6 uppercase tracking-wider text-sm">Lưu Lượng Khách Khung Giờ (Heatmap/Area)</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer>
            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent-gold)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--color-accent-gold)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-main)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="load" name="Lượt Khách" stroke="var(--color-accent-gold)" fillOpacity={1} fill="url(#colorLoad)" />
            </AreaChart>
          </ResponsiveContainer>
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
        <p className="text-xs text-[var(--color-text-muted)] font-semibold uppercase tracking-widest leading-relaxed">
          {title}
        </p>
        <div className="p-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-main)]" style={{ color: color }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h4 className="text-3xl font-bold text-white tracking-tight">{value}</h4>
    </div>
  );
}
