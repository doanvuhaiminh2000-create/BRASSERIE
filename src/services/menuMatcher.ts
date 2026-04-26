import * as XLSX from 'xlsx';
import { MenuItemFull } from '../types/store';

// Helper clean string
const sanitizeStr = (s: any) => String(s || '').trim();

export const parseMenuMapping = async (file: File): Promise<{ items: MenuItemFull[], errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('mapping')) || workbook.SheetNames[0];
        // Use sheet_to_json with header: 1 to get Array of Arrays
        const rows: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
        
        const items: MenuItemFull[] = [];
        const errors: string[] = [];

        // Data starts from row index 2
        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          const colA = sanitizeStr(row[0]);
          if (colA === '' || colA.startsWith('▶')) continue; // Skip headers/empty

          const section = sanitizeStr(row[1]) as any;
          const displayNameEN = sanitizeStr(row[2]);
          const displayName = sanitizeStr(row[3]);
          const priceRaw = row[4];
          const posCodeRaw = row[5];
          const posName = sanitizeStr(row[6]);
          const category = sanitizeStr(row[7]);

          let price = typeof priceRaw === 'number' ? priceRaw : parseFloat(sanitizeStr(priceRaw).replace(/,/g, ''));
          if (isNaN(price)) price = 0;

          // Strip POS code S3P / numeric parsing issues
          let posCode = sanitizeStr(posCodeRaw).split('.')[0]; 

          if (!displayNameEN || !posCode) {
             errors.push(`Row ${i + 1}: Thiếu Tên món hoặc POS Code`);
             continue;
          }

          items.push({
            posCode,
            posName,
            displayNameEN,
            displayName,
            section,
            category: category as any, // casting for simplicity,
            price,
            isActive: true,
            station: 'N', // default
            cookTime: 10,
            complexity: 2
          });
        }
        resolve({ items, errors });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const parseMenuRecipe = async (file: File, existingMenu: MenuItemFull[]): Promise<{ updatedMenu: MenuItemFull[], unmatched: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        // Sheet tên 'menu'
        const sheetName = workbook.SheetNames.find(s => s.toLowerCase() === 'menu');
        if (!sheetName) throw new Error("Không tìm thấy sheet tên 'menu'");
        
        const rows: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });

        const updatedMenu = [...existingMenu];
        const unmatched: string[] = [];
        
        // Header ở row 5 (index 4) -> Data từ index 5
        for (let i = 5; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          const stt = sanitizeStr(row[1]); // col B
          if (!stt || isNaN(Number(stt))) continue; // Bỏ qua section headers
          
          const displayNameEN = sanitizeStr(row[3]); // TÊN MÓN là tiếng Anh ở col D
          const costRaw = row[6]; // GIÁ COST ở phân tích spec bảo GIÁ COST ở index 5 (col F) nhưng stt col B là 1 thì col F -> index 5
          // C (Tên món tắt) index 2, D (Tên móm EN) index 3, E (Trống) index 4, F (ĐVT) index 5, G (GIÁ COST) index 6 ???
          // Từ prompt: "10 cột: (A trống) | STT | Tên món tắt | TÊN MÓN | (E trống) | ĐVT | GIÁ COST | GIÁ BÁN CHƯA VAT | TỶ LỆ COST | GIÁ BÁN CÓ VAT"
          // => A(0), B(1)-STT, C(2)-Tắt, D(3)-TÊN, E(4)-Trống, F(5)-ĐVT, G(6)-GIÁ COST
          
          let cost = typeof costRaw === 'number' ? costRaw : parseFloat(sanitizeStr(costRaw).replace(/,/g, ''));
          if (isNaN(cost)) cost = 0;

          if (!displayNameEN) continue;

          const matchIndex = updatedMenu.findIndex(m => m.displayNameEN.toLowerCase() === displayNameEN.toLowerCase());
          
          if (matchIndex >= 0) {
            updatedMenu[matchIndex] = {
              ...updatedMenu[matchIndex],
              cost: cost || undefined,
              costSource: 'recipe'
            };
          } else {
            unmatched.push(displayNameEN);
          }
        }
        
        resolve({ updatedMenu, unmatched });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
