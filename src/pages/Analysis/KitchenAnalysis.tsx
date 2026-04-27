import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChefHat, Flame, Timer, CheckCircle, AlertTriangle } from 'lucide-react';

const stationData = [
  { station: 'Bếp Pizza (P)', avgTime: 12.5, target: 12, max: 18 },
  { station: 'Bếp Nóng (N)', avgTime: 16.2, target: 15, max: 22 },
  { station: 'Bếp Salad (L)', avgTime: 5.4, target: 5, max: 8 },
  { station: 'Pha Chế (B)', avgTime: 3.1, target: 3, max: 5 },
];

export function KitchenAnalysis() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Hiệu Quả Bếp (Kitchen Performance)</h2>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Phân tích tốc độ ra món theo từng Station.</p>
      </div>

      <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-black text-amber-400 uppercase tracking-wider text-sm mb-1">⚠️ Trang đang hiển thị DỮ LIỆU MẪU</h3>
          <p className="text-amber-200/80 text-sm leading-relaxed">
            Trang này hiện đang sử dụng dữ liệu demo để minh họa giao diện. 
            Logic phân tích thực tế từ POS / Live Entry sẽ được kết nối trong bản cập nhật tiếp theo. 
            Các con số dưới đây <strong>không phản ánh dữ liệu thật</strong> của nhà hàng.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="TB Ra Món (Overall)" value="8.5p" icon={Timer} color="var(--color-accent-blue)" />
        <StatCard title="Station Nhanh Nhất" value="Pha Chế" icon={CheckCircle} color="var(--color-accent-green)" />
        <StatCard title="Station Chậm Nhất" value="Bếp Nóng" icon={Flame} color="var(--color-accent-red)" />
        <StatCard title="Khối Lượng Món" value="1,245" icon={ChefHat} color="var(--color-accent-gold)" />
      </div>

      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-6 uppercase tracking-wider text-sm">Thời gian hoàn thành món trung bình (phút)</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer>
            <BarChart data={stationData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-main)" horizontal={true} vertical={false}/>
              <XAxis type="number" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="station" type="category" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} width={100} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '8px' }} 
                cursor={{ fill: 'var(--color-border-main)', opacity: 0.2 }}
              />
              <Bar dataKey="avgTime" name="Thời Gian TB (phút)" radius={[0, 4, 4, 0]} maxBarSize={40}>
                {stationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.avgTime > entry.target ? 'var(--color-accent-red)' : 'var(--color-accent-blue)'} />
                ))}
              </Bar>
            </BarChart>
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
