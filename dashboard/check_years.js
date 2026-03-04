const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function checkYears() {
    const fullPath = path.resolve(process.cwd(), 'data/DRE.xlsx');
    const fileBuffer = fs.readFileSync(fullPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    const years = new Set();

    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 6) continue;
        const dateSerial = row[0];
        if (typeof dateSerial !== 'number') continue;

        const date = new Date(Math.round((dateSerial - 25569) * 86400 * 1000));
        years.add(date.getUTCFullYear());
    }

    console.log("Years found:", Array.from(years).sort());
}

checkYears();
