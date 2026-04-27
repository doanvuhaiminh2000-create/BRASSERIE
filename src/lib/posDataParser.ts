import * as XLSX from 'xlsx';
import { POSBatch, POSSummaryRow, POSDetailRow, POSPaymentRow } from '../types/store';
import { normalizePosCode } from './utils';

// Helper: robust parsing for excel dates or string numbers
const parseExcelNumeric = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const s = String(val).replace(/,/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const parseExcelDate = (val: any): number => {
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') {
    // Excel date numeric format (days since 1900/1/1) mostly handles this by reading cellDates: true, 
    // but just in case, we can assume it's unix if it's very large
    if (val > 1000000) return val;
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return 0;
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

export const parseExcelPOSBatch = async (file: File, batchId: string, uploaderId: string): Promise<POSBatch> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array', cellDates: true });
        
        let detailData: any[] = [];
        let paymentData: any[] = [];
        let summaryData: any[] = [];

        // Check if sheets exist by rough index
        if (workbook.SheetNames.length > 0) {
          detailData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
        }
        if (workbook.SheetNames.length > 1) {
          paymentData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[1]], { defval: '' });
        }
        if (workbook.SheetNames.length > 2) {
          summaryData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[2]], { defval: '' });
        }

        const summaryRows: POSSummaryRow[] = [];
        const detailRows: POSDetailRow[] = [];
        const paymentRows: POSPaymentRow[] = [];

        let minDate = Number.MAX_SAFE_INTEGER;
        let maxDate = 0;
        let totalRevenue = 0;
        let totalCustomers = 0;

        summaryData.forEach(row => {
          const trxRaw = getVal(row, ['Transaction']);
          if (!trxRaw || String(trxRaw).trim() === '' || isNaN(Number(trxRaw))) return;
          const timeStartRaw = String(getVal(row, ['Time Start', 'Thời gian']) || '');
          if (timeStartRaw.toLowerCase() === 'total') return;

          const timeStart = parseExcelDate(getVal(row, ['Time Start']));
          const timeEnd = parseExcelDate(getVal(row, ['Time End']));
          const date = parseExcelDate(getVal(row, ['Date']));
          const customer = parseExcelNumeric(getVal(row, ['Customer']));
          
          if (customer === 0) return; // skip canceled bills
          
          const netTotal = parseExcelNumeric(getVal(row, ['Net Total']));
          const vat = parseExcelNumeric(getVal(row, ['VAT']));
          const finalTotal = parseExcelNumeric(getVal(row, ['Final Total', 'Total']));

          if (date > 0) {
            minDate = Math.min(minDate, date);
            maxDate = Math.max(maxDate, date);
          } else if (timeStart > 0) {
            minDate = Math.min(minDate, timeStart);
            maxDate = Math.max(maxDate, timeStart);
          }

          totalRevenue += finalTotal;
          totalCustomers += customer;

          summaryRows.push({
            transaction: Number(trxRaw),
            timeStart,
            timeEnd,
            date,
            table: getVal(row, ['Table']) || '',
            customer: customer,
            netTotal,
            vat,
            finalTotal,
            whoClose: String(getVal(row, ['Who Close']) || ''),
            whoStart: String(getVal(row, ['Who Start']) || '')
          });
        });

        detailData.forEach(row => {
          const trxRaw = getVal(row, ['Transaction']);
          if (!trxRaw || String(trxRaw).trim() === '' || isNaN(Number(trxRaw))) return;

          // productID has format S3P{posCode} occasionally
          const productId = String(getVal(row, ['Product ID']) || '').trim();
          const posCode = normalizePosCode(productId);

          detailRows.push({
            transaction: Number(trxRaw),
            table: getVal(row, ['Table']) || '',
            date: parseExcelDate(getVal(row, ['Date'])),
            categoryId: String(getVal(row, ['Category ID']) || ''),
            category: String(getVal(row, ['Category']) || ''),
            subCategoryId: String(getVal(row, ['Sub Category ID']) || ''),
            subCategory: String(getVal(row, ['Sub Category']) || ''),
            productId,
            posCode,
            productName: String(getVal(row, ['Product name']) || ''),
            unitPrice: parseExcelNumeric(getVal(row, ['Unit Price'])),
            quantity: parseExcelNumeric(getVal(row, ['Quantity'])),
            netAmount: parseExcelNumeric(getVal(row, ['Net Amout', 'Net Amount'])),
            finalAmount: parseExcelNumeric(getVal(row, ['Final Amout', 'Final Amount'])),
            timeOrder: parseExcelDate(getVal(row, ['Time Order'])),
            whoOrder: String(getVal(row, ['Who Order']) || '')
          });
        });

        paymentData.forEach((row: any) => {
          const trxRaw = getVal(row, ['Transaction']);
          if (!trxRaw || String(trxRaw).trim() === '' || isNaN(Number(trxRaw))) return;
          
          paymentRows.push({
            transaction: Number(trxRaw),
            openDate: parseExcelDate(getVal(row, ['Open Date'])),
            paymentMethod: String(getVal(row, ['Payment Method']) || ''),
            tender: parseExcelNumeric(getVal(row, ['Tender'])),
            change: parseExcelNumeric(getVal(row, ['Change'])),
            timePayment: parseExcelDate(getVal(row, ['Time Payment'])),
            whoPayment: String(getVal(row, ['Who Payment']) || '')
          });
        });

        const dateFrom = minDate !== Number.MAX_SAFE_INTEGER ? new Date(minDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const dateTo = maxDate !== 0 ? new Date(maxDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        const batch: POSBatch = {
          batchId,
          fileName: file.name,
          dateFrom,
          dateTo,
          uploadedAt: Date.now(),
          uploadedBy: uploaderId,
          summary: summaryRows,
          details: detailRows,
          payments: paymentRows,
          totalTransactions: summaryRows.length,
          totalRevenue,
          totalCustomers
        };

        resolve(batch);

      } catch (err) { reject(err); }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
