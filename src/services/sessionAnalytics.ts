import { OrderSession } from '../types';

export interface UpsellMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  winRate: number;
  totalUpsellRevenue: number;
  reasonMap: Record<string, number>;
  successByDay: Record<string, { success: number, rejected: number }>;
  staffLeaderboard: {
    staffName: string;
    rate: number;
    revenue: number;
    attempts: number;
  }[];
}

export interface KitchenMetrics {
  stationMetrics: Record<string, number>;
  slowestItems: {
    name: string;
    avgTime: number;
  }[];
}

export const sessionAnalytics = {
  getUpsellMetrics(sessions: OrderSession[]): UpsellMetrics {
    let totalAttempts = 0;
    let successfulAttempts = 0;
    let totalUpsellRevenue = 0;
    const staffAttemptsMap: Record<string, { attempts: number, success: number, revenue: number, staffName: string }> = {};
    const reasonMap: Record<string, number> = {};
    const successByDay: Record<string, { success: number, rejected: number }> = {};

    sessions.forEach(s => {
      // Find upsell attempts in this session
      (s.upsellAttempts || []).forEach(attempt => {
        totalAttempts++;
        if (attempt.result === 'TC') {
          successfulAttempts++;
        } else {
          const reason = attempt.reason || 'Khác';
          reasonMap[reason] = (reasonMap[reason] || 0) + 1;
        }

        const sid = attempt.staffId;
        if (!staffAttemptsMap[sid]) {
          staffAttemptsMap[sid] = { attempts: 0, success: 0, revenue: 0, staffName: attempt.staffName };
        }
        staffAttemptsMap[sid].attempts++;
        if (attempt.result === 'TC') {
          staffAttemptsMap[sid].success++;
        }

        const dateStr = new Date(attempt.timestamp).toISOString().split('T')[0];
        if (!successByDay[dateStr]) successByDay[dateStr] = { success: 0, rejected: 0 };
        if (attempt.result === 'TC') {
          successByDay[dateStr].success++;
        } else {
          successByDay[dateStr].rejected++;
        }
      });

      // Find revenue for successful upsells from items
      (s.items || []).forEach(item => {
        if (item.isUpsold && item.status !== 'CANCELED') {
          const itemRev = (item.menuItem.price || 0) * item.quantity;
          totalUpsellRevenue += itemRev;
          
          const attempt = s.upsellAttempts?.find(a => a.menuItemId === item.menuItem.posCode && a.result === 'TC');
          const sid = attempt ? attempt.staffId : s.openedByStaffId;
          
          if (!staffAttemptsMap[sid]) {
             staffAttemptsMap[sid] = { attempts: 0, success: 0, revenue: 0, staffName: attempt ? attempt.staffName : 'Unknown' };
          }
          staffAttemptsMap[sid].revenue += itemRev;
        }
      });
    });

    const staffLeaderboard = Object.values(staffAttemptsMap)
      .map(st => ({
        staffName: st.staffName,
        rate: st.attempts > 0 ? (st.success / st.attempts) * 100 : 0,
        revenue: st.revenue,
        attempts: st.attempts
      }))
      .sort((a, b) => b.rate - a.rate);

    return {
      totalAttempts,
      successfulAttempts,
      winRate: totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0,
      totalUpsellRevenue,
      reasonMap,
      successByDay,
      staffLeaderboard
    };
  },

  getServiceTimeMetrics(sessions: OrderSession[]) {
    // T1: OPEN_TABLE
    // T2: SEND_KITCHEN (first)
    // T6: SERVE_ITEM (first)
    // T7: CHECKOUT
    let t1ToT2Total = 0, t1ToT2Count = 0;
    let t2ToT6Total = 0, t2ToT6Count = 0;
    let t1ToT7Total = 0, t1ToT7Count = 0;
    const trafficByHour: Record<string, number> = {};

    sessions.forEach(s => {
      const logs = s.eventLogs || [];
      const t1Log = logs.find(l => l.action === 'OPEN_TABLE');
      const t2Log = logs.find(l => l.action === 'SEND_KITCHEN');
      const t6Log = logs.find(l => l.action === 'SERVE_ITEM');
      const t7Log = logs.find(l => l.action === 'CHECKOUT');

      if (t1Log) {
        // Traffic by hour based on T1
        const hour = new Date(t1Log.time).getHours().toString().padStart(2, '0') + ':00';
        trafficByHour[hour] = (trafficByHour[hour] || 0) + s.guestCount;

        if (t2Log) {
          t1ToT2Total += (t2Log.time - t1Log.time);
          t1ToT2Count++;
          
          if (t6Log) {
            t2ToT6Total += (t6Log.time - t2Log.time);
            t2ToT6Count++;
          }
        }
        if (t7Log) {
          t1ToT7Total += (t7Log.time - t1Log.time);
          t1ToT7Count++;
        }
      }
    });

    return {
      avgT1ToT2: t1ToT2Count > 0 ? t1ToT2Total / t1ToT2Count : 0,
      avgT2ToT6: t2ToT6Count > 0 ? t2ToT6Total / t2ToT6Count : 0,
      avgT1ToT7: t1ToT7Count > 0 ? t1ToT7Total / t1ToT7Count : 0,
      trafficByHour
    };
  },

  getKitchenMetrics(sessions: OrderSession[]): KitchenMetrics {
    // Tính cookTime = serve - sent của từng món tương ứng sessionItem
    const stationMap: Record<string, { totalTime: number, count: number }> = {};
    const itemCookTimes: Record<string, { totalTime: number, count: number }> = {};

    sessions.forEach(s => {
      const items = s.items || [];
      const logs = s.eventLogs || [];

      items.forEach(item => {
        if (!item.sentAt) return;
        let cookTime: number | null = null;
        if (item.status === 'SERVED') {
          // Find logic: nearest SERVE_ITEM log after sentAt for this item
          const serveLog = logs.find(l => l.action === 'SERVE_ITEM' && l.time >= item.sentAt! && l.targetItemId === item.id);
          if (serveLog) {
            cookTime = serveLog.time - item.sentAt;
          }
        } else if (item.status === 'SENT') {
          cookTime = Date.now() - item.sentAt;
        }

        if (cookTime !== null) {
          const station = item.menuItem?.station || 'N';
          if (!stationMap[station]) stationMap[station] = { totalTime: 0, count: 0 };
          stationMap[station].totalTime += cookTime;
          stationMap[station].count++;

          const itemName = item.menuItem.displayName;
          if (!itemCookTimes[itemName]) itemCookTimes[itemName] = { totalTime: 0, count: 0 };
          itemCookTimes[itemName].totalTime += cookTime;
          itemCookTimes[itemName].count++;
        }
      });
    });

    const stationMetrics = Object.entries(stationMap).reduce((acc, [station, data]) => {
      acc[station] = data.totalTime / data.count;
      return acc;
    }, {} as Record<string, number>);

    const slowestItems = Object.entries(itemCookTimes)
      .map(([name, data]) => ({ name, avgTime: Math.round((data.totalTime / data.count) / 60000) }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    return { stationMetrics, slowestItems };
  },

  getStaffMetrics(sessions: OrderSession[]) {
    const staffMap: Record<string, {
      openedTables: number;
      closedBills: number;
      revenue: number;
      upsellAttempts: number;
      upsellSuccess: number;
      upsellRevenue: number;
      totalServiceTime: number; // for average serve speed
      serviceCount: number;
    }> = {};

    sessions.forEach(s => {
      const openStaff = s.openedByStaffId;
      if (!staffMap[openStaff]) {
        staffMap[openStaff] = { openedTables: 0, closedBills: 0, revenue: 0, upsellAttempts: 0, upsellSuccess: 0, upsellRevenue: 0, totalServiceTime: 0, serviceCount: 0 };
      }
      staffMap[openStaff].openedTables++;

      if (s.status === 'COMPLETED') {
        const closeLog = s.eventLogs?.find(l => l.action === 'CHECKOUT');
        const closedStaff = closeLog ? closeLog.staffId : openStaff;
        if (!staffMap[closedStaff]) {
          staffMap[closedStaff] = { openedTables: 0, closedBills: 0, revenue: 0, upsellAttempts: 0, upsellSuccess: 0, upsellRevenue: 0, totalServiceTime: 0, serviceCount: 0 };
        }
        staffMap[closedStaff].closedBills++;

        // Calculate session revenue roughly
        const rev = s.items.filter(i => i.status !== 'CANCELED').reduce((acc, i) => acc + (i.menuItem.price * i.quantity), 0);
        staffMap[closedStaff].revenue += rev;
      }

      (s.upsellAttempts || []).forEach(u => {
        const sid = u.staffId;
        if (!staffMap[sid]) {
          staffMap[sid] = { openedTables: 0, closedBills: 0, revenue: 0, upsellAttempts: 0, upsellSuccess: 0, upsellRevenue: 0, totalServiceTime: 0, serviceCount: 0 };
        }
        staffMap[sid].upsellAttempts++;
        if (u.result === 'TC') staffMap[sid].upsellSuccess++;
      });

      (s.items || []).forEach(item => {
        if (item.isUpsold && item.status !== 'CANCELED') {
          const itemRev = (item.menuItem.price || 0) * item.quantity;
          const attempt = s.upsellAttempts?.find(a => a.menuItemId === item.menuItem.posCode && a.result === 'TC');
          const sid = attempt ? attempt.staffId : s.openedByStaffId;
          if (!staffMap[sid]) {
            staffMap[sid] = { openedTables: 0, closedBills: 0, revenue: 0, upsellAttempts: 0, upsellSuccess: 0, upsellRevenue: 0, totalServiceTime: 0, serviceCount: 0 };
          }
          staffMap[sid].upsellRevenue += itemRev;
        }
      });
      
      // Serve events
      s.eventLogs?.forEach(l => {
        if (l.action === 'SERVE_ITEM') {
           const staff = l.staffId;
           if (!staffMap[staff]) staffMap[staff] = { openedTables: 0, closedBills: 0, revenue: 0, upsellAttempts: 0, upsellSuccess: 0, upsellRevenue: 0, totalServiceTime: 0, serviceCount: 0 };
           // We'd need to know exactly when it was sent, we simplified and just count frequency
           staffMap[staff].serviceCount++;
        }
      });
    });

    return staffMap;
  }
};
