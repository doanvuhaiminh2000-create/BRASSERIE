import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Star, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useApp } from '../../store/AppContext';

export function MenuAnalysis() {
  const { menu, posRawData } = useApp();

  const menuMatrix = React.useMemo(() => {
    if (!menu.length) return [];

    // Build volume map từ POS detail
    const volumeMap: Record<string, { qty: number; revenue: number }> = {};
    if (posRawData?.detailRows) {
      posRawData.detailRows.forEach(d => {
        // Match qua posCode (Product ID trong POS dạng "S3P2146446156" → match "2146446156")
        const pid = String(d.productId).replace(/^S\d+P/, '').trim();
        if (!volumeMap[pid]) volumeMap[pid] = { qty: 0, revenue: 0 };
        volumeMap[pid].qty += Number(d.quantity) || 0;
        volumeMap[pid].revenue += Number(d.finalAmount) || 0;
      });
    }

    // Build matrix
    const items = menu.filter(m => m.isActive).map(m => {
      const vol = volumeMap[m.posCode] || { qty: 0, revenue: 0 };
      const cost = m.cost ?? (m.price * 0.30); // fallback 30% nếu chưa có cost từ định lượng
      const margin = m.price - cost;
      const marginPct = (margin / m.price) * 100;
      return { ...m, margin, marginPct, volume: vol.qty, revenue: vol.revenue };
    });

    // Median-based classification
    const volumes = items.map(i => i.volume).sort((a, b) => a - b);
    const margins = items.map(i => i.marginPct).sort((a, b) => a - b);
    const medVol = volumes[Math.floor(volumes.length / 2)] || 0;
    const medMargin = margins[Math.floor(margins.length / 2)] || 0;

    return items.map(i => {
      let category = 'Dog';
      if (i.volume >= medVol && i.marginPct >= medMargin) category = 'Star';
      else if (i.volume >= medVol && i.marginPct < medMargin) category = 'Plow Horse';
      else if (i.volume < medVol && i.marginPct >= medMargin) category = 'Puzzle';
      return { ...i, category, marginPctFmt: i.marginPct.toFixed(1) };
    });
  }, [menu, posRawData]);

  // Derived max/median refs for chart lines
  const medVol = menuMatrix.length ? menuMatrix.map(i => i.volume).sort((a,b)=>a-b)[Math.floor(menuMatrix.length / 2)] : 100;
  const medMargin = menuMatrix.length ? menuMatrix.map(i => i.marginPct).sort((a,b)=>a-b)[Math.floor(menuMatrix.length / 2)] : 70;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {!posRawData && (
        <div className="bg-[var(--color-accent-orange)]/10 border border-[var(--color-accent-orange)]/30 rounded-xl p-4 text-sm text-[var(--color-accent-orange)]">
          ⚠️ Chưa có dữ liệu POS. Volume và doanh thu hiện đang là 0. Vui lòng upload file POS để xem phân tích đầy đủ.
        </div>
      )}

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
              <XAxis type="number" dataKey="volume" name="Lượt bán" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} />
              <YAxis type="number" dataKey="marginPct" name="Lợi nhuận (%)" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} domain={[0, 100]} />
              
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '8px', color: '#fff' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[var(--color-bg-main)] border border-[var(--color-border-main)] p-3 rounded-lg shadow-xl min-w-[200px]">
                        <p className="font-bold text-white mb-1">{data.displayName}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mb-2">Mã POS: <span className="font-mono text-[var(--color-accent-gold)]">{data.posCode}</span></p>
                        <p className="text-xs text-[var(--color-text-muted)]">Category: <span style={{color: getCategoryColor(data.category), fontWeight: 'bold'}}>{data.category}</span></p>
                        <hr className="my-2 border-[var(--color-border-main)]" />
                        <p className="text-xs text-[var(--color-text-muted)] mt-2">Lượt bán (Volume): <span className="font-bold text-white">{data.volume}</span></p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">Doanh thu (thực tế POS): <span className="font-bold text-white">{formatCurrency(data.revenue)}</span></p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">Margin Pct: <span className="font-bold text-[var(--color-accent-green)]">{data.marginPctFmt}%</span> ({formatCurrency(data.margin)})</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine x={medVol} stroke="var(--color-text-muted)" strokeDasharray="3 3" />
              <ReferenceLine y={medMargin} stroke="var(--color-text-muted)" strokeDasharray="3 3" />
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
