const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = path.resolve(process.cwd(), 'data/source.xlsx');
console.log("Attempting to read:", filePath);

if (fs.existsSync(filePath)) {
    console.log("File exists (fs check passed)");
    try {
        const buf = fs.readFileSync(filePath);
        console.log("File read into buffer successfully. Size:", buf.length);

        const wb = XLSX.read(buf, { type: 'buffer' });
        console.log("XLSX parsed buffer successfully. Sheets:", wb.SheetNames);
    } catch (e) {
        console.error("Error reading/parsing:", e);
    }
} else {
    console.error("File does not exist!");
}
