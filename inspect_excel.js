const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('ANALISE GERENCIAL FIVE (1).xlsx');
  const sheetName = workbook.SheetNames[0];
  console.log(`Analyzing Sheet: ${sheetName}`);
  
  const sheet = workbook.Sheets[sheetName];
  // Get data as array of arrays (header: 1) to see structure clearly
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0 });
  
  console.log("--- First 50 Rows ---");
  console.log(JSON.stringify(data.slice(0, 50), null, 2));

} catch (error) {
  console.error("Error reading file:", error);
}
