import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// 1. Khai báo Interface
export interface SummaryRow {
  'Transaction': string;
  'Time Start': string; // Format: 'YYYY-MM-DD HH:mm:ss'
  'Customer': number | string;
  'Final Total': number | string;
  [key: string]: any;
}

export interface DetailRow {
  'Transaction': string;
  'Category': string;
  'Product name': string;
  'Product ID'?: string;
  'Time Order'?: string;
  'Quantity': number | string;
  'Final Amout'?: number | string; 
  'Final Amount'?: number | string;
  'Net Amout'?: number | string;
  [key: string]: any;
}

export interface PaymentRow {
  'Transaction': string;
  'Payment Method': string;
  'Tender': number | string;
  [key: string]: any;
}

export interface TopProduct {
  name: string;
  revenue: number;
  quantity: number;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalCustomers: number;
  totalTransactions: number;
  totalBills: number; // Unique transactions
  aov: number; // Average Order Value
  hourlyDistribution: { hour: string; guests: number }[];
  categoryStructure: { name: string; value: number }[];
  topProducts: TopProduct[];
  paymentDistribution: { name: string; value: number }[];
}

// Helpers
const parseNumeric = (val: any, fallback = 0): number => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return val;
  const cleanedStr = String(val).replace(/,/g, '').trim();
  const parsed = parseFloat(cleanedStr);
  return isNaN(parsed) ? fallback : parsed;
};

const getVal = (row: any, possibleKeys: string[]) => {
  for (const k of Object.keys(row)) {
    const keyLower = k.toLowerCase().trim();
    if (possibleKeys.some(pk => keyLower.includes(pk.toLowerCase()))) {
      return row[k];
    }
  }
  return null;
};

export const parseExcelMultiSheet = (file: File): Promise<Record<string, any[]>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array', cellDates: true });
        const result: Record<string, any[]> = {};
        workbook.SheetNames.forEach(sn => {
          result[sn] = XLSX.utils.sheet_to_json(workbook.Sheets[sn], { defval: '', raw: false });
        });
        resolve(result);
      } catch (err) { reject(err); }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

// Main processing function
export const processPOSData = (
  summaryText: string,
  detailText: string,
  paymentText: string
): { metrics: DashboardMetrics, detailRows: any[] } => {
  const summaryData = Papa.parse<any>(summaryText, { header: true, skipEmptyLines: 'greedy' }).data;
  const detailData = Papa.parse<any>(detailText, { header: true, skipEmptyLines: 'greedy' }).data;
  const paymentData = Papa.parse<any>(paymentText, { header: true, skipEmptyLines: 'greedy' }).data;

  // Overview
  let totalRevenue = 0;
  let totalCustomers = 0;
  let validBillsCount = 0;
  const uniqueTransactions = new Set<string>();
  const hourlyMap: Record<string, number> = {};

  (summaryData || []).forEach(row => {
    const trxRaw = getVal(row, ['Transaction']);
    if (!trxRaw || String(trxRaw).trim() === '') return;
    
    const trx = String(trxRaw).trim();
    if (isNaN(Number(trx))) return; // Bỏ qua nếu Transaction không phải số
    
    const timeStartRaw = String(getVal(row, ['Time Start', 'Thời gian']) || '');
    if (timeStartRaw.toLowerCase() === 'total') return; // Bỏ qua dòng Total

    let total = parseNumeric(getVal(row, ['Final Total', 'Total', 'Thành tiền']), 0);
    let cust = parseNumeric(getVal(row, ['Customer', 'Khách']), 0);

    if (cust === 0 && total === 0) return; // Bỏ qua bills hủy

    // Cap Customer tối đa 50
    cust = Math.min(Math.max(1, cust), 50);

    uniqueTransactions.add(trx);
    validBillsCount++;
    totalRevenue += total;
    totalCustomers += cust;

    // Hourly
    let hour = '';
    const rawTimeValue = getVal(row, ['Time Start', 'Thời gian']);
    const dateObj = new Date(rawTimeValue);
    if (rawTimeValue && !isNaN(dateObj.getTime())) {
      hour = dateObj.getHours().toString().padStart(2, '0') + 'h';
    } else {
      const hourMatch = timeStartRaw.match(/(\d{1,2}):\d{2}/);
      if (hourMatch) {
         hour = hourMatch[1].padStart(2, '0') + 'h';
      }
    }
    if (hour) hourlyMap[hour] = (hourlyMap[hour] || 0) + cust;
  });

  // Details
  let foodRevenue = 0;
  let beverageRevenue = 0;
  const productMap: Record<string, { revenue: number, quantity: number }> = {};
  const detailRows: any[] = [];

  (detailData || []).forEach(row => {
    const trx = getVal(row, ['Transaction']);
    if (!trx || String(trx).trim() === '') return;

    // Giữ nguyên typo Final Amout
    const amount = parseNumeric(getVal(row, ['Final Amout', 'Final Amount', 'Net Amout', 'Thành tiền']), 0);
    const category = String(getVal(row, ['Category', 'Loại']) || '').toLowerCase();
    const productName = String(getVal(row, ['Product name', 'Tên sản phẩm']) || 'Unknown');
    const qty = parseNumeric(getVal(row, ['Quantity', 'Số lượng']), 0);
    
    const productId = String(getVal(row, ['Product ID', 'Mã sản phẩm']) || '');
    const timeOrder = String(getVal(row, ['Time Order', 'Thời gian']) || '');

    detailRows.push({
      productId,
      productName,
      quantity: qty,
      finalAmount: amount,
      timeOrder
    });

    // Categories
    if (category.includes('1. food') || category.includes('food')) {
       foodRevenue += amount;
    } else if (category.includes('2. beverage') || category.includes('beverage')) {
       beverageRevenue += amount;
    } else if (category.includes('4. service') || category.includes('5. good')) {
       // Tùy chọn gom vào categoryStructure, nếu muốn. Nhưng đặc tả yêu cầu "1. Food, 2. Beverage, 4. Service Other, 5. Good Other, Coupon".
       // Tạm lưu nhóm.
    }

    // Top Products
    if (!productMap[productName]) {
      productMap[productName] = { revenue: 0, quantity: 0 };
    }
    productMap[productName].revenue += amount;
    productMap[productName].quantity += qty;
  });

  // Re-calculate categories exactly
  const categoryMapForOutput: Record<string, number> = {};
  (detailData || []).forEach(row => {
    const trx = getVal(row, ['Transaction']);
    if (!trx || String(trx).trim() === '') return;
    const amount = parseNumeric(getVal(row, ['Final Amout', 'Final Amount', 'Net Amout', 'Thành tiền']), 0);
    const category = String(getVal(row, ['Category', 'Loại']) || '').trim() || 'Unknown';
    categoryMapForOutput[category] = (categoryMapForOutput[category] || 0) + amount;
  });
  
  const categoryStructure = Object.entries(categoryMapForOutput)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Payments
  const paymentMap: Record<string, number> = {};
  (paymentData || []).forEach(row => {
    const trx = getVal(row, ['Transaction']);
    if (!trx || String(trx).trim() === '') return;

    const method = String(getVal(row, ['Payment Method', 'Phương thức']) || 'OTHER').toUpperCase();
    const tender = parseNumeric(getVal(row, ['Tender', 'Số tiền']), 0);
    paymentMap[method] = (paymentMap[method] || 0) + tender;
  });

  // Formatting Output
  const hourlyDistribution = Object.entries(hourlyMap)
    .map(([hour, guests]) => ({ hour, guests }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour)); // Sort theo giờ

  const topProducts = Object.entries(productMap)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const paymentDistribution = Object.entries(paymentMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const metrics = {
    totalRevenue,
    totalCustomers,
    totalTransactions: uniqueTransactions.size,
    totalBills: validBillsCount, // Bill tổng hợp
    aov: totalBillsCountIfAny(validBillsCount, totalRevenue),
    hourlyDistribution,
    categoryStructure,
    topProducts,
    paymentDistribution
  };
  
  return { metrics, detailRows };
};

const totalBillsCountIfAny = (bills: number, rev: number) => bills > 0 ? rev / bills : 0;

// Legacy support or File-based parsing
export const parseFile = <T>(file: File): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    if (file.name.toLowerCase().endsWith('.csv')) {
      Papa.parse<T>(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => resolve(results.data),
        error: (error: any) => reject(error)
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json<T>(worksheet, { defval: "" });
          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    }
  });
};

export const calculateDashboardMetrics = (
  summaryData: SummaryRow[],
  detailData: DetailRow[]
): any => {
  // Keeping this for compatibility but recommend using processPOSData for full features
  return processPOSData(
    Papa.unparse(summaryData),
    Papa.unparse(detailData),
    ""
  ).metrics;
};
