const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Replicating the logic from src/lib/dre-parser.ts to run in Node quickly for debugging
function parseDREDebug() {
    const fullPath = path.resolve(process.cwd(), 'data/source.xlsx');
    const fileBuffer = fs.readFileSync(fullPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Assuming first sheet
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const items = [];

    // Heuristic from dre-parser.ts
    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 3) continue;

        const code = row[0];
        const description = row[2];

        if (typeof code !== 'string' && typeof code !== 'number') continue;
        if (typeof description !== 'string') continue;

        const codeStr = String(code).trim();
        // if (!/^[0-9.]+$/.test(codeStr)) continue; // Relaxing this check for debug to see everything

        // Extract values (same logic as parser)
        const values = [];
        const potentialValues = row.slice(3).filter(cell => typeof cell === 'number');
        if (potentialValues.length > 0) {
            values.push(...potentialValues.slice(0, 12));
        }

        if (values.length > 0) {
            items.push({
                code: codeStr,
                description: description.trim(),
                total: values.reduce((a, b) => a + b, 0)
            });
        }
    }

    return items;
}

const items = parseDREDebug();
console.log("Total Items:", items.length);
console.log("\n--- Top Level Items (Code length < 5) ---");
items.filter(i => i.code.length < 5).forEach(i => {
    console.log(`[${i.code}] ${i.description}: ${i.total.toFixed(2)}`);
});

console.log("\n--- Searching for Key Terms ---");
['Receita', 'Lucro', 'Resultado', 'Despesa', 'Custo'].forEach(term => {
    console.log(`\nMatching "${term}":`);
    items.filter(i => i.description.toLowerCase().includes(term.toLowerCase())).slice(0, 5).forEach(i => {
        console.log(`  [${i.code}] ${i.description}: ${i.total.toFixed(2)}`);
    });
});
