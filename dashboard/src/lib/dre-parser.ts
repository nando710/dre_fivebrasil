import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export interface Transaction {
    date: Date;
    description: string;
    value: number;
    monthIndex: number;
}

export interface DRELineItem {
    code: string;
    description: string;
    values: number[]; // Yearly values (months 1-12)
    total: number;
    level: number; // Indentation level based on code (e.g., 8.4 = level 2)
    isTotal: boolean; // Computed rows like "Receita Líquida"
    transactions?: Transaction[]; // Raw transactions for drilldown
}

export interface DREData {
    items: DRELineItem[];
    months: string[]; // Headers for months
    year: string;
    availableYears?: string[];
}

export function parseDRE(filePath: string = 'data/source.xlsx', targetYear?: string): DREData {
    const fullPath = path.resolve(process.cwd(), filePath);

    // Default to DRE.xlsx if source.xlsx doesn't exist
    let finalPath = fullPath;
    if (!fs.existsSync(fullPath) && filePath === 'data/source.xlsx') {
        if (fs.existsSync(path.resolve(process.cwd(), 'data/DRE.xlsx'))) {
            finalPath = path.resolve(process.cwd(), 'data/DRE.xlsx');
        }
    }

    if (!fs.existsSync(finalPath)) {
        throw new Error(`File not found: ${finalPath}`);
    }

    // Use readFileSync + XLSX.read for better robustness in Next.js/Server components
    const fileBuffer = fs.readFileSync(finalPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    // Check for "Sheet1" and flat structure (Transaction List)
    if (sheetName === 'Sheet1' || rawData[0]?.[0] === 'Data de vencimento') {
        return parseTransactionList(rawData, targetYear);
    }

    // Fallback Legacy Parser (for ANALISE GERENCIAL FIVE.xlsx if used)
    const items: DRELineItem[] = [];

    // Extract year from sheet name (e.g. "DRE 2022 ...")
    const yearMatch = sheetName.match(/20\d{2}/);
    const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();

    let headerIndex = -1;
    const targetHeaders = ['Descrição', 'Realizado', 'Janeiro'];
    for (let i = 0; i < 50; i++) {
        const row = rawData[i];
        if (row && row.some((cell: any) => typeof cell === 'string' && targetHeaders.includes(cell.trim()))) {
            if (row.includes('Código') && row.includes('Descrição')) {
                headerIndex = i;
                break;
            }
        }
    }

    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 3) continue;

        const code = row[0];
        const description = row[2];

        if (typeof code !== 'string' && typeof code !== 'number') continue;
        if (typeof description !== 'string') continue;

        const codeStr = String(code).trim();
        if (!/^[0-9.]+$/.test(codeStr)) continue;

        const values: number[] = [];
        let total = 0;

        for (let m = 0; m < 12; m++) {
            const colIndex = 35 + (m * 4);
            const val = typeof row[colIndex] === 'number' ? row[colIndex] : 0;
            values.push(val);
        }

        total = values.reduce((a, b) => a + b, 0);

        if (values.length > 0) {
            items.push({
                code: codeStr,
                description: description.trim(),
                values,
                total,
                level: codeStr.split('.').length,
                isTotal: values.some(v => Math.abs(v) > 0.01) && (description.includes('(=)') || description.includes('Total') || codeStr.length < 5)
            });
        }
    }

    return {
        items,
        months: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        year
    };
}

function parseTransactionList(rawData: any[], targetYear?: string): DREData {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    interface CategoryData {
        values: number[];
        transactions: Transaction[];
    }

    const revenueMap = new Map<string, CategoryData>();
    const expenseMap = new Map<string, CategoryData>();

    const totalRevenue = new Array(12).fill(0);
    const totalExpenses = new Array(12).fill(0);

    const availableYears = new Set<string>();

    // First pass: Collect years
    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row[0] || typeof row[0] !== 'number') continue;
        const date = new Date(Math.round((row[0] - 25569) * 86400 * 1000));
        availableYears.add(date.getUTCFullYear().toString());
    }

    const sortedYears = Array.from(availableYears).sort();
    const yearToProcess = targetYear && availableYears.has(targetYear) ? targetYear : sortedYears[0] || '2022';

    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 6) continue;

        const dateSerial = row[0];
        const type = row[1];
        const category = row[3] || 'Outros';
        const description = row[2] || category; // Using column 2 as description, fallback to category
        const value = row[5];

        if (typeof dateSerial !== 'number' || typeof value !== 'number') continue;

        // Ignore specific categories
        const normalizedCategory = category.toLowerCase().trim();
        if (
            normalizedCategory === 'transferência de entrada' ||
            normalizedCategory === 'transferência de saída' ||
            normalizedCategory === 'saldo inicial' ||
            normalizedCategory === 'transferencia de entrada' ||
            normalizedCategory === 'transferencia de saida'
        ) {
            continue;
        }

        const date = new Date(Math.round((dateSerial - 25569) * 86400 * 1000));
        const monthIndex = date.getUTCMonth();
        const yearStr = date.getUTCFullYear().toString();

        if (yearStr !== yearToProcess) continue;

        const transaction: Transaction = {
            date,
            description,
            value,
            monthIndex
        };

        if (type === 'Contas a receber') {
            if (!revenueMap.has(category)) revenueMap.set(category, { values: new Array(12).fill(0), transactions: [] });
            const data = revenueMap.get(category)!;
            data.values[monthIndex] += value;
            data.transactions.push(transaction);
            totalRevenue[monthIndex] += value;
        }
        else if (type === 'Contas a pagar') {
            if (!expenseMap.has(category)) expenseMap.set(category, { values: new Array(12).fill(0), transactions: [] });
            const data = expenseMap.get(category)!;
            data.values[monthIndex] += value;
            data.transactions.push(transaction);
            totalExpenses[monthIndex] += value;
        }
    }

    const items: DRELineItem[] = [];

    // 8.1 Revenue
    items.push({
        code: '8.1',
        description: 'RECEITA OPERACIONAL BRUTA',
        values: totalRevenue,
        total: totalRevenue.reduce((a, b) => a + b, 0),
        level: 1,
        isTotal: true
    });

    let revCode = 1;
    revenueMap.forEach((data, cat) => {
        items.push({
            code: `8.1.01.${revCode.toString().padStart(3, '0')}`,
            description: cat,
            values: data.values,
            total: data.values.reduce((a, b) => a + b, 0),
            level: 3,
            isTotal: false,
            transactions: data.transactions.sort((a, b) => a.date.getTime() - b.date.getTime())
        });
        revCode++;
    });

    // 8.4 Expenses
    items.push({
        code: '8.4',
        description: 'GASTOS OPERACIONAIS',
        values: totalExpenses,
        total: totalExpenses.reduce((a, b) => a + b, 0),
        level: 1,
        isTotal: true
    });

    let expCode = 1;
    expenseMap.forEach((data, cat) => {
        items.push({
            code: `8.4.01.${expCode.toString().padStart(3, '0')}`,
            description: cat,
            values: data.values,
            total: data.values.reduce((a, b) => a + b, 0),
            level: 3,
            isTotal: false,
            transactions: data.transactions.sort((a, b) => a.date.getTime() - b.date.getTime())
        });
        expCode++;
    });

    items.sort((a, b) => a.code.localeCompare(b.code));

    return {
        items,
        months,
        year: yearToProcess,
        availableYears: sortedYears
    };
}
