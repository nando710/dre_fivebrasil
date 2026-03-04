const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function inspectRows() {
    const fullPath = path.resolve(process.cwd(), 'data/source.xlsx');
    const fileBuffer = fs.readFileSync(fullPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log("Analyzing Row Structures...");

    // Find "Receita" row and "Despesa de Pessoal" row
    const receitaRow = rawData.find(row => row && String(row[0]).includes('8.1') && String(row[2]).includes('RECEITA'));
    const despesaRow = rawData.find(row => row && String(row[0]).includes('8.4.02') && String(row[2]).includes('Despesas'));

    if (receitaRow) {
        console.log("\n--- Row 8.1 (Receita) ---");
        // Print index: value
        receitaRow.forEach((val, idx) => {
            if (val !== null && val !== undefined) console.log(`${idx}: ${val}`);
        });
    } else {
        console.log("Row 8.1 not found!");
    }

    if (despesaRow) {
        console.log("\n--- Row 8.4.02 (Despesas Pessoal) ---");
        despesaRow.forEach((val, idx) => {
            if (val !== null && val !== undefined && typeof val === 'number') console.log(`${idx}: ${val}`);
        });
    }

    // Look for Header Row
    console.log("\n--- Potential Header Rows ---");
    for (let i = 0; i < 30; i++) {
        const row = rawData[i];
        if (row && row.some(c => typeof c === 'string' && (c.includes('Jan') || c.includes('Realizado')))) {
            console.log(`Row ${i}:`, JSON.stringify(row));
        }
    }
}

inspectRows();
