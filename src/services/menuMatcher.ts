import * as XLSX from 'xlsx';
import { MenuItemFull } from '../types/store';

// Helper clean string
const sanitizeStr = (s: any) => String(s || '').trim();

// Normalize tên để so sánh
function normalizeName(s: string): string {
  return s
    .toLowerCase()
//    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // bỏ dấu Latin (Not perfectly simple without standard methods, but this is fine)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`´]/g, "'")                            // chuẩn hóa nháy
    .replace(/\s*-\s*/g, '-')                           // chuẩn hóa dấu gạch
    .replace(/\s+/g, ' ')                               // collapse spaces
    .replace(/[^\w\s'-]/g, '')                          // bỏ ký tự đặc biệt khác
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({length: m+1}, () => new Array(n+1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m][n];
}

// Levenshtein-based similarity (0..1)
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (longer.length === 0) return 1;
  const dist = levenshtein(longer, shorter);
  return (longer.length - dist) / longer.length;
}

export const parseMenuMapping = async (file: File): Promise<{ items: MenuItemFull[], errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('mapping')) || workbook.SheetNames[0];
        // Use sheet_to_json with header: 1 to get Array of Arrays
        const rows: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: true });
        
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
          let posCode: string;
          if (typeof posCodeRaw === 'number') {
            posCode = Math.round(posCodeRaw).toString();
          } else {
            const raw = sanitizeStr(posCodeRaw);
            if (/^-?\d+(\.\d+)?e[+-]?\d+$/i.test(raw)) {
              posCode = Math.round(Number(raw)).toString();
            } else {
              posCode = raw.split('.')[0].trim();
            }
          }

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
            category: category,
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

export const parseMenuRecipe = async (
  file: File,
  existingMenu: MenuItemFull[]
): Promise<{
  updatedMenu: MenuItemFull[];
  matched: number;
  unmatched: Array<{ recipeName: string; cost: number; price: number; suggestions: string[] }>;
  total: number;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array', cellDates: false });
        const sheetName = wb.SheetNames.find(s => s === 'menu');
        if (!sheetName) throw new Error("Không tìm thấy sheet 'menu' (chữ thường) trong file định lượng.");

        const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { 
          header: 1, defval: null, raw: true 
        });

        // Parse all valid recipe items first
        const recipes: Array<{ nameEN: string; cost: number; priceVat: number; costRatio: number | null }> = [];
        for (let i = 6; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length < 10) continue;
          const stt = r[1], nameEN = r[3], cost = r[6], ratio = r[8], priceVat = r[9];
          if (typeof stt !== 'number' || !Number.isInteger(Math.round(stt))) continue;
          if (!nameEN || typeof nameEN !== 'string') continue;
          if (typeof cost !== 'number' || typeof priceVat !== 'number') continue;
          if (cost <= 0 || priceVat <= 0) continue;

          recipes.push({
            nameEN: nameEN.trim(),
            cost: Math.round(cost),
            priceVat: Math.round(priceVat),
            costRatio: typeof ratio === 'number' ? ratio : null
          });
        }

        // Build lookup tables for menu
        const menuByExact = new Map<string, number>();        // normalized name → index
        existingMenu.forEach((m, idx) => {
          const key = normalizeName(m.displayNameEN);
          if (!menuByExact.has(key)) menuByExact.set(key, idx);
        });

        const updated = existingMenu.map(m => ({...m}));
        const unmatched: Array<{ recipeName: string; cost: number; price: number; suggestions: string[] }> = [];
        let matchedCount = 0;
        const now = Date.now();

        for (const rec of recipes) {
          const normalizedRec = normalizeName(rec.nameEN);

          // STEP 1: Exact normalized match
          let foundIdx = menuByExact.get(normalizedRec);
          let method: 'exact' | 'normalized' | 'fuzzy' = 'exact';

          // STEP 2: Fuzzy match (similarity >= 0.85)
          if (foundIdx === undefined) {
            let bestScore = 0;
            let bestIdx = -1;
            for (let i = 0; i < existingMenu.length; i++) {
              const score = similarity(normalizedRec, normalizeName(existingMenu[i].displayNameEN));
              if (score > bestScore) {
                bestScore = score;
                bestIdx = i;
              }
            }
            if (bestScore >= 0.85) {
              foundIdx = bestIdx;
              method = 'fuzzy';
            }
          }

          if (foundIdx !== undefined && foundIdx >= 0) {
            updated[foundIdx] = {
              ...updated[foundIdx],
              cost: rec.cost,
              costRatio: rec.costRatio ?? undefined,
              priceFromRecipe: rec.priceVat,
              costSource: 'recipe',
              costUpdatedAt: now,
              recipeMatchMethod: method
            };
            matchedCount++;
          } else {
            // Find top 3 suggestions for manual matching
            const scored = existingMenu.map((m, i) => ({
              name: m.displayNameEN,
              idx: i,
              score: similarity(normalizedRec, normalizeName(m.displayNameEN))
            })).sort((a, b) => b.score - a.score).slice(0, 3);

            unmatched.push({
              recipeName: rec.nameEN,
              cost: rec.cost,
              price: rec.priceVat,
              suggestions: scored.map(s => s.name)
            });
          }
        }

        resolve({ updatedMenu: updated, matched: matchedCount, unmatched, total: recipes.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
