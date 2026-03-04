const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function inspectHeaders() {
    const fullPath = path.resolve(process.cwd(), 'data/DRE.xlsx');
    const fileBuffer = fs.readFileSync(fullPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets['Sheet1'] || workbook.Sheets[workbook.SheetNames[0]];

    // Read first 10 rows
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0 });

    console.log("--- First 5 Rows ---");
    rawData.slice(0, 5).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
    });

    console.log("\n--- Searching for 'Receita' or 'Despesa' in distinct values ---");
    // Let's guess column indices. Usually Date is 0, Category might be 1 or 2 or 3.
    // Row 19 had "Contas a receber" at index 1?

    const categories = new Set();
    const subCategories = new Set();

    rawData.forEach((row, i) => {
        if (i < 5) return; // Skip potential headers
        if (row[1]) categories.add(row[1]);
        if (row[3]) subCategories.add(row[3]);
    });

    console.log("Distinct Col 1 (Potential Category):", Array.from(categories).slice(0, 10));
    console.log("Distinct Col 3 (Potential SubCategory):", Array.from(subCategories).slice(0, 10));
}

inspectHeaders();
