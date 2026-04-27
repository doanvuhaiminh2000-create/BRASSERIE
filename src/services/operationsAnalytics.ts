import { POSBatch, POSSummaryRow } from '../types/store';
import { OrderSession } from '../types';

function localDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function getValidBills(batches: POSBatch[], startMs: number, endMs: number): { summary: POSSummaryRow; details: any[] }[] {
  const bills: { summary: POSSummaryRow; details: any[] }[] = [];
  for (const batch of batches) {
    for (const sum of batch.summary) {
      if (
        sum.customer > 0 &&
        sum.timeStart > 0 &&
        sum.timeEnd > 0 &&
        sum.timeEnd > sum.timeStart &&
        Number(sum.table) <= 1000 &&
        sum.timeStart >= startMs &&
        sum.timeStart <= endMs
      ) {
        const durationMin = (sum.timeEnd - sum.timeStart) / 60000;
        if (durationMin >= 5 && durationMin <= 240) {
          const details = batch.details.filter((d) => d.transaction === sum.transaction);
          bills.push({ summary: sum, details });
        }
      }
    }
  }
  return bills;
}

export function computePOSFunnel(batches: POSBatch[], startMs: number, endMs: number) {
  const bills = getValidBills(batches, startMs, endMs);
  
  const t1ToFirst: number[] = [];
  const firstToLast: number[] = [];
  const lastToCheckout: number[] = [];
  const totalDurations: number[] = [];

  for (const { summary, details } of bills) {
    const duration = (summary.timeEnd - summary.timeStart) / 60000;
    totalDurations.push(duration);

    if (details.length > 0) {
      const orderTimes = details.map(d => d.timeOrder).filter(t => t > 0);
      if (orderTimes.length > 0) {
        const firstOrder = Math.min(...orderTimes);
        const lastOrder = Math.max(...orderTimes);

        let t1ToF = (firstOrder - summary.timeStart) / 60000;
        if (t1ToF < 0) t1ToF = 0;
        
        let lToC = (summary.timeEnd - lastOrder) / 60000;
        if (lToC < 0) lToC = 0;
        if (lToC > 180) continue; // Filter out outliers

        const fToL = (lastOrder - firstOrder) / 60000;

        t1ToFirst.push(t1ToF);
        firstToLast.push(fToL);
        lastToCheckout.push(lToC);
      }
    }
  }

  const calcMed = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const calcMean = (arr: number[]) => {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  const calcP75 = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.75)];
  };

  return {
    t1ToFirstOrderMin: { mean: calcMean(t1ToFirst), median: calcMed(t1ToFirst), n: t1ToFirst.length },
    firstToLastOrderMin: { mean: calcMean(firstToLast), median: calcMed(firstToLast), n: firstToLast.length },
    lastOrderToCheckoutMin: { mean: calcMean(lastToCheckout), median: calcMed(lastToCheckout), n: lastToCheckout.length },
    totalDurationMin: { mean: calcMean(totalDurations), median: calcMed(totalDurations), p75: calcP75(totalDurations), n: totalDurations.length },
    rawBills: bills // useful for B3 table
  };
}

export function computeLiveFunnel(sessions: OrderSession[], startMs: number, endMs: number) {
  const validSessions = sessions.filter(s => s.status === 'COMPLETED' && s.openedAt >= startMs && s.openedAt <= endMs);
  
  const t1ToT2: number[] = [];
  const t2ToT6: number[] = [];
  let totalRounds = 0;
  const interRoundGaps: number[] = [];

  for (const session of validSessions) {
    const logs = session.eventLogs;
    const sendLogs = logs.filter(l => l.action.includes('Gửi bếp'));
    const serveLogs = logs.filter(l => l.action.includes('Phục vụ'));

    totalRounds += sendLogs.length;

    if (sendLogs.length > 0) {
      const firstSend = Math.min(...sendLogs.map(l => l.time));
      t1ToT2.push((firstSend - session.openedAt) / 60000);

      if (serveLogs.length > 0) {
        const firstServe = Math.min(...serveLogs.map(l => l.time));
        if (firstServe >= firstSend) {
           t2ToT6.push((firstServe - firstSend) / 60000);
        }
      }

      // Inter-round gaps
      if (sendLogs.length > 1) {
        const sortedSends = sendLogs.map(l => l.time).sort((a,b) => a-b);
        for (let i = 1; i < sortedSends.length; i++) {
          interRoundGaps.push((sortedSends[i] - sortedSends[i-1]) / 60000);
        }
      }
    }
  }

  const calcMed = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const calcMean = (arr: number[]) => {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  return {
    t1ToT2Min: { mean: calcMean(t1ToT2), median: calcMed(t1ToT2), n: t1ToT2.length },
    t2ToT6Min: { mean: calcMean(t2ToT6), median: calcMed(t2ToT6), n: t2ToT6.length },
    avgRoundsPerBill: validSessions.length > 0 ? totalRounds / validSessions.length : 0,
    interRoundGapMin: { median: calcMed(interRoundGaps), n: interRoundGaps.length },
    totalSessions: validSessions.length
  };
}

export function buildDurationHistogram(durationsMin: number[]) {
  const buckets = [
    { label: '<20p', min: 0, max: 20 },
    { label: '20-30p', min: 20, max: 30 },
    { label: '30-40p', min: 30, max: 40 },
    { label: '40-50p', min: 40, max: 50 },
    { label: '50-60p', min: 50, max: 60 },
    { label: '60-75p', min: 60, max: 75 },
    { label: '75-90p', min: 75, max: 90 },
    { label: '90-120p', min: 90, max: 120 },
    { label: '>120p', min: 120, max: Infinity }
  ];

  const counts: Record<string, number> = {};
  buckets.forEach(b => counts[b.label] = 0);

  durationsMin.forEach(d => {
    const bucket = buckets.find(b => d >= b.min && d < b.max);
    if (bucket) {
      counts[bucket.label]++;
    }
  });

  const total = durationsMin.length;
  return buckets.map(b => ({
    bucket: b.label,
    count: counts[b.label],
    percentage: total > 0 ? (counts[b.label] / total) * 100 : 0
  }));
}

export function buildOccupancyHeatmap(batches: POSBatch[], startMs: number, endMs: number, totalTables: number) {
  const bills = getValidBills(batches, startMs, endMs);
  
  // We aggregate by dayOfWeek (0-6) and quarterHour (0-95)
  // To avoid noise, we only look at bills that intersect a 15-min bucket.
  
  const cellsMap = new Map<string, number[]>(); // key: "weekday-quarter", value: array of occupancies for each specific date

  const datesInRange = new Set<string>();

  for (const bill of bills) {
    const dateStr = localDateKey(bill.summary.timeStart);
    datesInRange.add(dateStr);
  }

  const sortedDates = Array.from(datesInRange);

  const occupancyByDateQuarter = new Map<string, number>(); // "YYYY-MM-DD-quarter": count
  
  for (const bill of bills) {
    const s = new Date(bill.summary.timeStart);
    const e = new Date(bill.summary.timeEnd);
    
    // Convert to minute of day
    const startMinsTotal = Math.floor(bill.summary.timeStart / 60000);
    const endMinsTotal = Math.floor(bill.summary.timeEnd / 60000);
    
    const startQuarter = Math.floor(startMinsTotal / 15);
    const endQuarter = Math.floor(endMinsTotal / 15);
    
    for (let q = startQuarter; q <= endQuarter; q++) {
       const qtDate = new Date(q * 15 * 60000);
       const key = localDateKey(qtDate.getTime()) + '-' + (qtDate.getHours() * 4 + Math.floor(qtDate.getMinutes() / 15));
       occupancyByDateQuarter.set(key, (occupancyByDateQuarter.get(key) || 0) + 1);
    }
  }

  for (let qHour = 0; qHour < 24*4; qHour++) {
    for (let day = 0; day < 7; day++) {
       const key = `${day}-${qHour}`;
       cellsMap.set(key, []);
    }
  }

  // Populate cellsMap
  for (const dateStr of sortedDates) {
     const d = new Date(dateStr);
     const dayOfWeek = d.getDay(); // 0: Sun, 1: Mon, ...
     for (let qHour = 0; qHour < 24*4; qHour++) {
       const searchKey = dateStr + '-' + qHour;
       const count = occupancyByDateQuarter.get(searchKey) || 0;
       cellsMap.get(`${dayOfWeek}-${qHour}`)?.push(count);
     }
  }

  const cells: Array<{ weekday: number; quarterHour: number; medianOccupied: number; n: number }> = [];
  let peakCell = { weekday: 0, quarterHour: 0, occupied: 0 };
  let idleCell = { weekday: 0, quarterHour: 0, occupied: totalTables }; // init max

  for (let day = 0; day < 7; day++) {
    for (let qHour = 0; qHour < 24 * 4; qHour++) {
      const arr = cellsMap.get(`${day}-${qHour}`) || [];
      let median = 0;
      if (arr.length > 0) {
        const sorted = [...arr].sort((a, b) => a - b);
        median = sorted[Math.floor(sorted.length / 2)];
      }

      // Filter hours 9 to 21 (36 to 84) to avoid extreme idle cells for idleCell finding
      if (qHour >= 36 && qHour <= 84 && arr.length > 0) {
         if (median > peakCell.occupied) {
             peakCell = { weekday: day, quarterHour: qHour, occupied: median };
         }
         if (median < idleCell.occupied) {
             idleCell = { weekday: day, quarterHour: qHour, occupied: median };
         }
      }

      cells.push({
        weekday: day,
        quarterHour: qHour,
        medianOccupied: median,
        n: arr.length
      });
    }
  }

  return { cells, peakCell, idleCell };
}

export function computeIdleGaps(batches: POSBatch[], startMs: number, endMs: number) {
  const bills = getValidBills(batches, startMs, endMs);
  
  // Group by Date and Table
  const byDateTable = new Map<string, { start: number; end: number }[]>();
  
  for (const bill of bills) {
    const dateStr = localDateKey(bill.summary.timeStart);
    const tableStr = bill.summary.table;
    const key = `${dateStr}|${tableStr}`;
    
    if (!byDateTable.has(key)) {
      byDateTable.set(key, []);
    }
    byDateTable.get(key)?.push({ start: bill.summary.timeStart, end: bill.summary.timeEnd });
  }

  const allGaps: number[] = [];
  const tableGaps: Record<string, number[]> = {};

  for (const [key, intervals] of byDateTable.entries()) {
    const table = key.split('|')[1];
    intervals.sort((a, b) => a.start - b.start);
    
    for (let i = 1; i < intervals.length; i++) {
       const gapMs = intervals[i].start - intervals[i-1].end;
       const gapMin = gapMs / 60000;
       
       if (gapMin > 0 && gapMin < 300) { // filter weird overnight/invalid gaps
          allGaps.push(gapMin);
          if (!tableGaps[table]) tableGaps[table] = [];
          tableGaps[table].push(gapMin);
       }
    }
  }

  allGaps.sort((a, b) => a - b);
  const median = allGaps.length > 0 ? allGaps[Math.floor(allGaps.length / 2)] : 0;
  const p25 = allGaps.length > 0 ? allGaps[Math.floor(allGaps.length * 0.25)] : 0;
  const p75 = allGaps.length > 0 ? allGaps[Math.floor(allGaps.length * 0.75)] : 0;
  
  const over30 = allGaps.filter(g => g > 30).length;
  const pctOver30 = allGaps.length > 0 ? (over30 / allGaps.length) * 100 : 0;

  const buckets = [
    { label: '<5p', min: 0, max: 5 },
    { label: '5-15p', min: 5, max: 15 },
    { label: '15-30p', min: 15, max: 30 },
    { label: '30-45p', min: 30, max: 45 },
    { label: '45-60p', min: 45, max: 60 },
    { label: '60-90p', min: 60, max: 90 },
    { label: '>90p', min: 90, max: Infinity }
  ];

  const histogram = buckets.map(b => ({
     bucket: b.label,
     count: allGaps.filter(g => g >= b.min && g < b.max).length
  }));

  const byTable = Object.entries(tableGaps).map(([table, gaps]) => {
     gaps.sort((a, b) => a - b);
     return {
       table: Number(table),
       medianGap: gaps[Math.floor(gaps.length / 2)],
       n: gaps.length
     };
  });

  return { median, p25, p75, pctOver30, histogram, byTable };
}

export function computePerTableMetrics(batches: POSBatch[], startMs: number, endMs: number, days: number) {
  const bills = getValidBills(batches, startMs, endMs);
  
  const tableStats: Record<number, { count: number; peakCount: number; durations: number[]; totalRev: number }> = {};
  
  for (const bill of bills) {
    const table = Number(bill.summary.table);
    if (!tableStats[table]) {
      tableStats[table] = { count: 0, peakCount: 0, durations: [], totalRev: 0 };
    }
    
    tableStats[table].count++;
    tableStats[table].totalRev += bill.summary.finalTotal;
    tableStats[table].durations.push((bill.summary.timeEnd - bill.summary.timeStart) / 60000);
    
    const d = new Date(bill.summary.timeStart);
    const hour = d.getHours();
    if (hour >= 11 && hour < 15) { // 11-14h peak
      tableStats[table].peakCount++;
    }
  }

  const { byTable: idleTableGaps } = computeIdleGaps(batches, startMs, endMs);
  const idleMap = new Map(idleTableGaps.map(t => [t.table, t.medianGap]));

  return Object.entries(tableStats).map(([tableStr, stats]) => {
     const table = Number(tableStr);
     const avgDur = stats.durations.reduce((a,b)=>a+b,0) / stats.durations.length;
     const avgRev = stats.totalRev / stats.count;
     const turnsPerDayPeak = stats.peakCount / days;

     return {
        table,
        bills: stats.count,
        turnsPerDayPeak,
        avgDurationMin: avgDur,
        avgRevenuePerBill: avgRev,
        totalRevenue: stats.totalRev,
        medianIdleGapMin: idleMap.get(table) || 0
     };
  });
}

export function calculateIdleReductionROI(
  currentMedianGapMin: number,
  targetGapMin: number,
  avgDurationMin: number,
  avgTicket: number,
  numTables: number,
  peakHours: number = 4
) {
  const diffGap = currentMedianGapMin - targetGapMin;
  if (diffGap <= 0 || avgDurationMin <= 0) return { extraTurnsPerTablePerDay: 0, extraBillsPerDay: 0, extraRevenuePerDay: 0, extraRevenuePerMonth: 0 };

  // peakHours in mins = peakHours * 60
  const peakMins = peakHours * 60;
  
  const currentTurnsPerPeak = peakMins / (avgDurationMin + currentMedianGapMin);
  const newTurnsPerPeak = peakMins / (avgDurationMin + targetGapMin);
  
  const extraTurnsPerTablePerDay = newTurnsPerPeak - currentTurnsPerPeak;
  const extraBillsPerDay = extraTurnsPerTablePerDay * numTables;
  const extraRevenuePerDay = extraBillsPerDay * avgTicket;

  return {
    extraTurnsPerTablePerDay,
    extraBillsPerDay,
    extraRevenuePerDay,
    extraRevenuePerMonth: extraRevenuePerDay * 30
  };
}
