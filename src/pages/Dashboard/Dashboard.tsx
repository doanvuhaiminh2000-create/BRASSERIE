import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { useApp } from '../../store/AppContext';
import { formatCurrency, getMilestone, isDateInRange, DateRange } from '../../lib/utils';
import { Database, TrendingUp, Clock, Users, ArrowUpRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#D4A24E', '#5B9DF0', '#25b589', '#d44848', '#8a5cf5'];

export function Dashboard() {
  const { dashboardMetrics, sessions, tables, users } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'FINANCIAL' | 'OPERATIONAL'>('FINANCIAL');
  const [dateFilter, setDateFilter] = useState<DateRange>('today');

  // Filter sessions based on date range
  const filteredSessions = useMemo(() => {
    return (sessions || []).filter(s => isDateInRange(s.openedAt, dateFilter));
  }, [sessions, dateFilter]);

  // --- OPERATIONAL METRICS CALCULATION ---
  const operationalMetrics = useMemo(() => {
    // Upsell
    let totalUpsellAttempts = 0;
    let successUpsellCount = 0;
    let upsellRevenue = 0;
    const rejectReasons: Record<string, number> = {};

    // Service Time
    let totalSeatTime = 0;
    let completedSessionsCount = 0;

    let totalKitchenWaitTime = 0;
    let kitchenWaitPairs = 0;

    let totalRounds = 0;
    let sessionsWithRounds = 0;

    // Financial
    let liveRevenue = 0;
    let liveCustomers = 0;
    let liveBills = 0;

    // Traffic by hour
    const trafficByHour: Record<string, number> = {};

    // Staff Leaderboard
    const staffStats: Record<string, { tables: number, upsellAttempts: number, upsellSuccess: number, name: string }> = {};

    filteredSessions.forEach(s => {
      // Seat Time & Financials
      if (s.status === 'COMPLETED' && s.closedAt) {
        totalSeatTime += (s.closedAt - s.openedAt);
        completedSessionsCount++;
        
        liveBills++;
        liveCustomers += s.guestCount || 0;
        liveRevenue += (s.items || []).reduce((acc, i) => acc + ((i.menuItem?.price || 0) * (i.quantity || 0)), 0);
      }

      // Upsell Revenue
      (s.items || []).forEach(i => {
        if (i.isUpsold && i.menuItem) {
          upsellRevenue += ((i.menuItem.price || 0) * (i.quantity || 0));
        }
      });

      // Upsell Attempts
      if (Array.isArray(s.upsellAttempts)) {
        s.upsellAttempts.forEach(u => {
          totalUpsellAttempts++;
          
          if (!staffStats[u.staffId]) {
            staffStats[u.staffId] = { tables: 0, upsellAttempts: 0, upsellSuccess: 0, name: users.find(usr => usr.id === u.staffId)?.name || u.staffId };
          }
          staffStats[u.staffId].upsellAttempts++;

          if (u.result === 'TC') {
            successUpsellCount++;
            staffStats[u.staffId].upsellSuccess++;
          } else {
            if (u.reason) {
              rejectReasons[u.reason] = (rejectReasons[u.reason] || 0) + 1;
            }
          }
        });
      }

      // Traffic
      const hour = new Date(s.openedAt).getHours() + 'h';
      trafficByHour[hour] = (trafficByHour[hour] || 0) + (s.guestCount || 0);

      // Staff Tables
      if (s.openedByStaffId) {
        if (!staffStats[s.openedByStaffId]) {
          staffStats[s.openedByStaffId] = { tables: 0, upsellAttempts: 0, upsellSuccess: 0, name: users.find(usr => usr.id === s.openedByStaffId)?.name || s.openedByStaffId };
        }
        staffStats[s.openedByStaffId].tables++;
      }

      const logs = s.eventLogs || [];
      
      const rounds = logs.filter(log => log.action === 'SEND_KITCHEN').length;
      if (rounds > 0) {
        totalRounds += rounds;
        sessionsWithRounds++;
      }

      // Kitchen Speed Approximation
      const t2_log = getMilestone(logs, 'SEND_KITCHEN', 'first');
      const t6_log = getMilestone(logs, 'SERVE_ITEM', 'first');
      if (t2_log && t6_log && t6_log.time >= t2_log.time) {
          totalKitchenWaitTime += (t6_log.time - t2_log.time);
          kitchenWaitPairs++;
      }
    });

    const currentOccupancy = tables.length ? (tables.filter(t => t.status !== 'TRONG').length / tables.length) * 100 : 0;
    
    return {
      liveRevenue,
      liveCustomers,
      liveBills,
      liveAOV: liveBills ? liveRevenue / liveBills : 0,
      upsellRate: totalUpsellAttempts ? (successUpsellCount / totalUpsellAttempts) * 100 : 0,
      upsellRevenue,
      rejectReasons: Object.entries(rejectReasons).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
      avgSeatTimeMinutes: completedSessionsCount ? (totalSeatTime / completedSessionsCount) / 60000 : 0,
      avgKitchenTimeMinutes: kitchenWaitPairs ? (totalKitchenWaitTime / kitchenWaitPairs) / 60000 : 0,
      avgRoundsPerTable: sessionsWithRounds ? (totalRounds / sessionsWithRounds) : 0,
      currentOccupancy,
      trafficData: Object.entries(trafficByHour).map(([hour, guests]) => ({ hour, guests })).sort((a,b) => parseInt(a.hour) - parseInt(b.hour)),
      staffLeaderboard: Object.values(staffStats).sort((a,b) => b.tables - a.tables)
    };
  }, [filteredSessions, tables, users]);

  return (
    <div className="p-6 md:p-8 space-y-6 pb-20 max-w-[1600px] mx-auto">
      {/* TABS & FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--color-border-main)] mb-6 gap-4">
        <div className="flex">
          <button 
            onClick={() => setActiveTab('FINANCIAL')}
            className={`px-8 py-4 font-black tracking-widest uppercase transition-all ${activeTab === 'FINANCIAL' ? 'text-[var(--color-accent-gold)] border-b-2 border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/5' : 'text-[var(--color-text-muted)] hover:text-white'}`}
          >
            Báo Cáo Tài Chính (POS)
          </button>
          <button 
            onClick={() => setActiveTab('OPERATIONAL')}
            className={`px-8 py-4 font-black tracking-widest uppercase transition-all flex items-center gap-2 ${activeTab === 'OPERATIONAL' ? 'text-[var(--color-accent-blue)] border-b-2 border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/5' : 'text-[var(--color-text-muted)] hover:text-white'}`}
          >
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent-blue)] animate-pulse"></div>
            Phân Tích Vận Hành (LIVE)
          </button>
        </div>
        
        <div className="flex items-center gap-2 bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-xl p-1.5 focus-within:border-[var(--color-accent-gold)] focus-within:ring-1 focus-within:ring-[var(--color-accent-gold)] transition-all mb-4 md:mb-0">
          <Calendar className="w-5 h-5 text-[var(--color-text-muted)] ml-2" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateRange)}
            className="bg-transparent border-none text-white text-sm font-bold focus:ring-0 outline-none pr-4 py-2 cursor-pointer"
          >
            <option value="today">Hôm nay</option>
            <option value="yesterday">Hôm qua</option>
            <option value="7days">7 ngày qua</option>
            <option value="all">Tất cả thời gian</option>
          </select>
        </div>
      </div>

      {/* DASHBOARD LIVE KPIS (ALWAYS VISIBLE AND LINKED TO DATE FILTER) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in">
         <KPICard title="Doanh Thu (Live)" value={formatCurrency(operationalMetrics.liveRevenue)} color="var(--color-accent-gold)" />
         <KPICard title="Lượt Khách (Live)" value={operationalMetrics.liveCustomers.toString()} color="var(--color-accent-blue)" />
         <KPICard title="Số Bills (Live)" value={operationalMetrics.liveBills.toString()} color="var(--color-accent-purple)" />
         <KPICard title="AOV (Khách/Bill)" value={formatCurrency(operationalMetrics.liveAOV)} color="var(--color-accent-green)" />
      </div>

      {/* --- TAB: FINANCIAL --- */}
      {activeTab === 'FINANCIAL' && (
        <>
          {!dashboardMetrics ? (
            <div className="w-full h-[500px] flex flex-col items-center justify-center animate-in fade-in duration-500 bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)]">
               <Database className="w-12 h-12 text-[var(--color-text-muted)] mb-4 opacity-50" />
               <h2 className="text-xl font-bold text-white mb-2">Chưa Có Dữ Liệu POS</h2>
               <p className="text-[var(--color-text-muted)] text-center text-sm max-w-sm mb-6">Vui lòng tải lên báo cáo doanh thu từ máy POS để xem được các chỉ số tài chính chính xác nhất.</p>
               <button onClick={() => navigate('/pos-upload')} className="px-6 py-2 bg-[var(--color-accent-gold)] text-black font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(212,162,78,0.2)] hover:scale-105 active:scale-95 uppercase tracking-widest text-sm">
                 Tải Lên Dữ Liệu POS
               </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-[var(--color-accent-green)]/10 border border-[var(--color-accent-green)]/30 rounded-xl p-4 text-sm font-medium text-[var(--color-accent-green)] flex items-center gap-2">
                ✓ BÁO CÁO POS ĐÃ ĐỒNG BỘ: {dashboardMetrics.totalTransactions} BILLS
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard title="Tổng Doanh Thu" value={formatCurrency(dashboardMetrics.totalRevenue)} color="var(--color-accent-gold)" />
                <KPICard title="Lượt Khách" value={dashboardMetrics.totalCustomers.toLocaleString()} color="var(--color-accent-blue)" />
                <KPICard title="Số Bills" value={dashboardMetrics.totalTransactions.toLocaleString()} color="var(--color-accent-purple)" />
                <KPICard title="Chi Tiêu Khách/Bill (AOV)" value={formatCurrency(dashboardMetrics.aov)} color="var(--color-accent-green)" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 lg:col-span-2 shadow-sm">
                  <h3 className="font-semibold text-white mb-6 uppercase tracking-wider text-sm">Lưu Lượng Theo Giờ (Dữ liệu POS)</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer>
                      <AreaChart data={dashboardMetrics.hourlyDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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

                <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 shadow-sm overflow-hidden">
                    <h3 className="font-semibold text-white mb-6 uppercase tracking-wider text-sm">Top Món Bán Chạy</h3>
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                       {dashboardMetrics.topProducts.map((p, i) => (
                          <div key={i} className="flex justify-between items-center group">
                             <div>
                                <div className="text-sm font-medium text-white max-w-[150px] truncate">{p.name}</div>
                                <div className="text-[10px] text-[var(--color-text-muted)]">{p.quantity} lượt bán</div>
                             </div>
                             <div className="text-sm font-bold text-[var(--color-accent-gold)]">{formatCurrency(p.revenue)}</div>
                          </div>
                       ))}
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 flex flex-col items-center">
                      <h3 className="font-semibold text-white mb-2 uppercase tracking-wider text-sm">Danh Mục (Food/Bev)</h3>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={dashboardMetrics.categoryStructure} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                              {dashboardMetrics.categoryStructure.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <RechartsTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '8px' }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6">
                      <h3 className="font-semibold text-white mb-6 uppercase tracking-wider text-sm">Phương Thức Thanh Toán</h3>
                      <div className="h-[250px] w-full">
                         <ResponsiveContainer>
                           <BarChart data={dashboardMetrics.paymentDistribution} layout="vertical" margin={{ left: 50, right: 30 }}>
                             <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-main)" horizontal={false} />
                             <XAxis type="number" hide />
                             <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" fontSize={10} width={80} />
                             <RechartsTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)' }} />
                             <Bar dataKey="value" fill="var(--color-accent-blue)" radius={[0, 4, 4, 0]} />
                           </BarChart>
                         </ResponsiveContainer>
                      </div>
                  </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* --- TAB: OPERATIONAL --- */}
      {activeTab === 'OPERATIONAL' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard title="Tỷ lệ lấp đầy bàn" value={`${operationalMetrics.currentOccupancy.toFixed(0)}%`} color="var(--color-accent-blue)" />
            <KPICard title="Doanh thu Upsell (Ước tính)" value={formatCurrency(operationalMetrics.upsellRevenue)} color="var(--color-accent-green)" />
            <KPICard title="Tg. Khách Ngồi (TB)" value={`${operationalMetrics.avgSeatTimeMinutes.toFixed(1)} phút`} color="var(--color-accent-purple)" />
            <KPICard title="Tg. Ra Món Đầu (TB)" value={`${operationalMetrics.avgKitchenTimeMinutes.toFixed(1)} phút`} color="var(--color-accent-orange)" />
            <KPICard title="Số Lượt Gọi/Bàn" value={operationalMetrics.avgRoundsPerTable.toFixed(1)} color="var(--color-accent-gold)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Operational Traffic */}
            <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 lg:col-span-2 shadow-sm">
              <h3 className="font-semibold text-white mb-6 uppercase tracking-wider text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--color-accent-blue)]" /> Lưu lượng khách thực tế (Live)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer>
                  <BarChart data={operationalMetrics.trafficData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-main)" vertical={false} />
                    <XAxis dataKey="hour" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)' }} />
                    <Bar dataKey="guests" name="Khách" fill="var(--color-accent-blue)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Upsell Reasons */}
            <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
                <h3 className="font-semibold text-white mb-2 uppercase tracking-wider text-sm flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-[var(--color-accent-green)]" /> Hiệu Quả Upsell: {operationalMetrics.upsellRate.toFixed(1)}%
                </h3>
                <p className="text-[10px] text-[var(--color-text-muted)] mb-6 uppercase tracking-widest">Phân tích lý do khách từ chối</p>
                <div className="h-[220px] w-full mb-4">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={operationalMetrics.rejectReasons} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                        {operationalMetrics.rejectReasons.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-bg-main)', borderColor: 'var(--color-border-main)', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                   {operationalMetrics.rejectReasons.map((r, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                         <span className="text-[var(--color-text-muted)]">{r.name}</span>
                         <span className="text-white font-bold">{r.value} lần</span>
                      </div>
                   ))}
                   {operationalMetrics.rejectReasons.length === 0 && <p className="text-[10px] italic text-center text-[var(--color-text-muted)]">Chưa có dữ liệu từ chối</p>}
                </div>
            </div>
          </div>

          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 shadow-sm overflow-hidden">
             <h3 className="font-semibold text-white mb-6 uppercase tracking-wider text-sm flex items-center gap-2">
               <Users className="w-4 h-4 text-[var(--color-accent-gold)]" /> Bảng Xếp Hạng Nhân Sự (Thực tế)
             </h3>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] uppercase text-[var(--color-text-muted)] bg-[var(--color-bg-main)]">
                    <tr>
                      <th className="px-6 py-3 font-black tracking-widest rounded-tl-lg">Nhân sự</th>
                      <th className="px-6 py-3 font-black tracking-widest text-center">Bàn đã phục vụ</th>
                      <th className="px-6 py-3 font-black tracking-widest text-center">Lượt mời Upsell</th>
                      <th className="px-6 py-3 font-black tracking-widest text-center rounded-tr-lg">Tỷ lệ chốt Upsell (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operationalMetrics.staffLeaderboard.map((s, i) => (
                      <tr key={i} className="border-b border-[var(--color-border-main)] last:border-0 hover:bg-[var(--color-bg-main)]/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{s.name}</td>
                        <td className="px-6 py-4 text-center font-mono">{s.tables}</td>
                        <td className="px-6 py-4 text-center font-mono text-[var(--color-accent-blue)]">{s.upsellAttempts}</td>
                        <td className="px-6 py-4 text-center font-mono text-[var(--color-accent-green)] font-bold">
                           {s.upsellAttempts > 0 ? ((s.upsellSuccess / s.upsellAttempts) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                    {operationalMetrics.staffLeaderboard.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-[var(--color-text-muted)] italic text-[10px] uppercase">Chưa có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ title, value, color }: { title: string, value: string | number, color: string }) {
  return (
    <div className="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] p-5 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: color }}></div>
      <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest break-words mt-1 mb-3">
        {title}
      </p>
      <div className="flex items-end gap-2">
        <h4 className="text-3xl font-black text-white tracking-tighter">{value}</h4>
      </div>
    </div>
  );
}
