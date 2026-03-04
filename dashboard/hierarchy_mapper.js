const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function mapHierarchy() {
    const fullPath = path.resolve(process.cwd(), 'data/source.xlsx');
    const fileBuffer = fs.readFileSync(fullPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log("--- Full DRE Structure ---");

    const extracted = [];

    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 3) continue;

        const code = row[0];
        const description = row[2];

        if (typeof code !== 'string' && typeof code !== 'number') continue;
        if (typeof description !== 'string') continue;

        const codeStr = String(code).trim();
        if (!codeStr.startsWith('8.')) continue; // Focus on the main DRE section we saw (8.x)

        // Calculate total from correct columns (35 + 4*m)
        let total = 0;
        for (let m = 0; m < 12; m++) {
            const colIndex = 35 + (m * 4);
            const val = row[colIndex];
            if (typeof val === 'number') total += val;
        }

        if (codeStr.length < 12 || total !== 0) { // Only show major items or items with values
            console.log(`${codeStr.padEnd(20)} | ${description.padEnd(50)} | ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            extracted.push({ code: codeStr, desc: description, total });
        }
    }
}

mapHierarchy();
