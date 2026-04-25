import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Star, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useApp } from '../../store/AppContext';

export function MenuAnalysis() {
  const { menu } = useApp();

  // Mocking recent sales volume per menu item
  const analyzeMenu = () => {
    return menu.map(m => {
      const margin = m.price - (m.cost || (m.price * 0.3));
      const marginPct = (margin / m.price) * 100;
      // Mock volume based on complexity/price
      const volume = Math.floor(Math.random() * 200) + 20; 
      
      let category = 'Dog';
      if (volume > 100 && marginPct >= 70) category = 'Star';
      else if (volume > 100 && marginPct < 70) category = 'Plow Horse';
      else if (volume <= 100 && marginPct >= 70) category = 'Puzzle';

      return {
        ...m,
        margin,
        marginPct: marginPct.toFixed(1),
        volume,
        category
      };
    });
  };

  const menuMatrix = analyzeMenu();

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Menu Engineering (Star/Dog)</h2>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Phân tích hiệu suất món ăn theo Lợi nhuận (Margin) và Lượt Bán (Volume).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="STARS (Lãi Cao, Bán Chạy)" value={menuMatrix.filter(m => m.category === 'Star').length} icon={Star} color="var(--color-accent-gold)" />
        <StatCard title="PLOW HORSES (Lãi Thấp, Bán Chạy)" value={menuMatrix.filter(m => m.category === 'Plow Horse').length} icon={TrendingUp} color="var(--color-accent-blue)" />
        <StatCard title="PUZZLES (Lãi Cao, Bán Chậm)" value={menuMatrix.filter(m => m.category === 'Puzzle').length} icon={DollarSign} color="var(--color-accent-purple)" />
        <StatCard title="DOGS (Lãi Thấp, Bán Chậm)" value={menuMatrix.filter(m => m.category === 'Dog').length} icon={AlertTriangle} color="var(--color-accent-red)" />
      </div>

      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-6 uppercase tracking-wider text-sm">Ma Trận Menu (Menu Matrix)</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-main)" />
              <XAxis type="number" dataKey="volume" name="Lượt bán" stroke="var(--color-text-muted)" tickLine={false} axisLine={false}>
                
              </XAxis>
              <YAxis type="number" dataKey="marginPct" name="Lợi nhuận (%)" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} domain={[0, 100]}>
                
              </YAxis>
              
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '8px', color: '#fff' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[var(--color-bg-main)] border border-[var(--color-border-main)] p-3 rounded-lg shadow-xl">
                        <p className="font-bold text-white mb-1">{data.displayName}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">Category: <span style={{color: getCategoryColor(data.category)}}>{data.category}</span></p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-2">Lớt bán: <span className="font-bold text-white">{data.volume}</span></p>
                        <p className="text-xs text-[var(--color-text-muted)]">Margin: <span className="font-bold text-[var(--color-accent-green)]">{data.marginPct}%</span> ({formatCurrency(data.margin)})</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine x={100} stroke="var(--color-text-muted)" strokeDasharray="3 3" />
              <ReferenceLine y={70} stroke="var(--color-text-muted)" strokeDasharray="3 3" />
              <Scatter data={menuMatrix}>
                {menuMatrix.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center flex justify-center gap-6 text-xs text-[var(--color-text-muted)]">
           <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[var(--color-accent-gold)]"></div> Star</span>
           <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[var(--color-accent-blue)]"></div> Plow Horse</span>
           <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[var(--color-accent-purple)]"></div> Puzzle</span>
           <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[var(--color-accent-red)]"></div> Dog</span>
        </div>
      </div>
    </div>
  );
}

function getCategoryColor(cat: string) {
  switch(cat) {
    case 'Star': return 'var(--color-accent-gold)';
    case 'Plow Horse': return 'var(--color-accent-blue)';
    case 'Puzzle': return 'var(--color-accent-purple)';
    case 'Dog': return 'var(--color-accent-red)';
    default: return 'white';
  }
}

function StatCard({ title, value, icon: Icon, color }: any) {
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
      <h4 className="text-3xl font-bold text-white tracking-tight">{value}</h4>
    </div>
  );
}
