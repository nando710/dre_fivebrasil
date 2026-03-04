const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function parseTransactionListDebug() {
    const fullPath = path.resolve(process.cwd(), 'data/DRE.xlsx');
    console.log("Reading:", fullPath);
    const fileBuffer = fs.readFileSync(fullPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    console.log(`Sheet: ${sheetName}, Rows: ${rawData.length}`);

    const revenueMap = new Map();
    const expenseMap = new Map();
    const totalRevenue = new Array(12).fill(0);
    const totalExpenses = new Array(12).fill(0);

    let count = 0;
    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 6) continue;

        const dateSerial = row[0];
        const type = row[1];
        const category = row[3] || 'Outros';
        const value = row[5];

        if (typeof dateSerial !== 'number' || typeof value !== 'number') continue;

        count++;
        const date = new Date(Math.round((dateSerial - 25569) * 86400 * 1000));
        const monthIndex = date.getUTCMonth();

        if (type === 'Contas a receber') {
            if (!revenueMap.has(category)) revenueMap.set(category, new Array(12).fill(0));
            revenueMap.get(category)[monthIndex] += value;
            totalRevenue[monthIndex] += value;
        }
        else if (type === 'Contas a pagar') {
            if (!expenseMap.has(category)) expenseMap.set(category, new Array(12).fill(0));
            expenseMap.get(category)[monthIndex] += value;
            totalExpenses[monthIndex] += value;
        }
    }

    console.log(`Processed ${count} transactions.`);
    console.log("Total Revenue (Year):", totalRevenue.reduce((a, b) => a + b, 0).toFixed(2));
    console.log("Total Expenses (Year):", totalExpenses.reduce((a, b) => a + b, 0).toFixed(2));

    console.log("\nReviewing Revenue Categories:");
    Array.from(revenueMap.entries()).slice(0, 5).forEach(([k, v]) => {
        console.log(` - ${k}: ${v.reduce((a, b) => a + b, 0).toFixed(2)}`);
    });
}

parseTransactionListDebug();
