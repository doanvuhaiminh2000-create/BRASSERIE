import { POSBatch, POSDetailRow, POSSummaryRow } from '../types/store';

export interface DashboardMetrics {
  totalRevenue: number;
  totalTransactions: number;
  totalCustomers: number;
  averageTicketSize: number;
  averageSpendPerHead: number;
  revenueByStation: Record<string, number>;
  revenueByCategory: Record<string, number>;
  topProducts: { name: string; quantity: number; revenue: number }[];
  hourlyTraffic: Record<string, number>;
  weeklyRevenue: Record<string, number>;
}

export const posAggregator = {
  aggregate(batches: POSBatch[], dateFromStr: string, dateToStr: string): DashboardMetrics {
    const [y, m, d] = dateFromStr.split('-').map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const startMs = start.getTime();
    
    const [ey, em, ed] = dateToStr.split('-').map(Number);
    const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    const endMs = end.getTime();

    let totalRevenue = 0;
    let totalTransactions = 0;
    let totalCustomers = 0;
    const revenueByStation: Record<string, number> = {};
    const revenueByCategory: Record<string, number> = {};
    const topProductsMap: Record<string, { quantity: number; revenue: number }> = {};
    const hourlyTraffic: Record<string, number> = {};
    const weeklyRevenue: Record<string, number> = {};
    
    const uniqueTx = new Set<string>();

    for (const batch of batches) {
      // 1. Summaries
      for (const sumRow of batch.summary) {
        if (sumRow.timeStart >= startMs && sumRow.timeStart <= endMs) {
          uniqueTx.add(`${batch.batchId}_${sumRow.transaction}`);
          totalRevenue += sumRow.finalTotal;
          totalCustomers += sumRow.customer || 0;
          
          const endHour = new Date(sumRow.timeEnd).getHours();
          const hourKey = `${endHour}:00`;
          hourlyTraffic[hourKey] = (hourlyTraffic[hourKey] || 0) + (sumRow.customer || 0);
          
          const day = new Date(sumRow.timeStart).toLocaleDateString('vi-VN', { weekday: 'short' });
          weeklyRevenue[day] = (weeklyRevenue[day] || 0) + sumRow.finalTotal;
        }
      }
      
      // 2. Details
      for (const det of batch.details) {
        if (det.timeOrder >= startMs && det.timeOrder <= endMs) {
          // Category
          const cat = det.category || 'Other';
          revenueByCategory[cat] = (revenueByCategory[cat] || 0) + (det.finalAmount || 0);

          // Top Products
          const pName = det.productName || 'Unknown';
          if (!topProductsMap[pName]) {
            topProductsMap[pName] = { quantity: 0, revenue: 0 };
          }
          topProductsMap[pName].quantity += (det.quantity || 0);
          topProductsMap[pName].revenue += (det.finalAmount || 0);
        }
      }
    }

    const topProducts = Object.entries(topProductsMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalRevenue,
      totalTransactions: uniqueTx.size,
      totalCustomers,
      averageTicketSize: uniqueTx.size > 0 ? totalRevenue / uniqueTx.size : 0,
      averageSpendPerHead: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
      revenueByStation, // Assuming detailed logic if needed
      revenueByCategory,
      topProducts,
      hourlyTraffic,
      weeklyRevenue
    };
  }
};
