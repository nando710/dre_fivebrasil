const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function inspectNewFile() {
    const fullPath = path.resolve(process.cwd(), 'data/DRE.xlsx');
    console.log("Reading:", fullPath);
    const fileBuffer = fs.readFileSync(fullPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    console.log("Sheet Name:", sheetName);
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log("\n--- Analyzing Row 8.1 (Revenue) to find columns ---");
    // Find a known row like 8.1
    const revenueRow = rawData.find(row => row && String(row[0]).includes('8.1'));

    if (revenueRow) {
        console.log("Found Row 8.1:");
        revenueRow.forEach((val, idx) => {
            if (val !== null && val !== undefined) console.log(`Idx ${idx}: ${val}`);
        });
    } else {
        console.log("Row 8.1 NOT found! Searching for any 'Receita'...");
        const genericRev = rawData.find(row => row && JSON.stringify(row).includes('Receita'));
        if (genericRev) console.log("Found generic Receita row:", genericRev);
    }

    console.log("\n--- Rows Dump (First 20) ---");
    for (let i = 0; i < 20; i++) {
        if (rawData[i]) console.log(`Row ${i}:`, JSON.stringify(rawData[i]));
    }
}

inspectNewFile();
