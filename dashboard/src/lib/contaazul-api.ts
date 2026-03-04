import axios from 'axios';
import { getValidAccessToken } from './contaazul-auth';
import { DREData, DRELineItem, Transaction } from './dre-parser';

const CONTA_AZUL_API = 'https://api.contaazul.com';

interface ContaAzulCategory {
    id: string;
    description: string;
    type: 'RECEIPT' | 'PAYMENT' | string;
}

interface ContaAzulTransaction {
    id: string;
    description: string;
    value: number;
    emission: string;
    status: string;
    category_id: string;
    type: string; // RECEIPT or PAYMENT
}

export async function fetchCategories(): Promise<Map<string, ContaAzulCategory>> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated with Conta Azul');

    // Trying the most common endpoints
    const response = await axios.get(`${CONTA_AZUL_API}/v1/categorias`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const categoryMap = new Map<string, ContaAzulCategory>();
    const categories: ContaAzulCategory[] = response.data || [];

    categories.forEach(cat => {
        categoryMap.set(cat.id, cat);
    });

    return categoryMap;
}

export async function fetchTransactionsForYear(year: string): Promise<ContaAzulTransaction[]> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated with Conta Azul');

    // Typically start and end date for the year
    const start = `${year}-01-01T00:00:00.000Z`;
    const end = `${year}-12-31T23:59:59.999Z`;

    // Depending on the exact API, it could be `emission_start` or `due_date_start`
    // We'll use emission as default
    const response = await axios.get(`${CONTA_AZUL_API}/v1/financeiro/lancamentos`, {
        params: {
            emission_start: start,
            emission_end: end,
            size: 1000 // Might need pagination in a real scenario
        },
        headers: { 'Authorization': `Bearer ${token}` }
    });

    // Handle pagination if needed, but for simplicity we return the first page.
    // In a robust app, append all pages.
    return response.data || [];
}

export async function getContaAzulDRE(targetYear: string = new Date().getFullYear().toString()): Promise<DREData> {
    const categories = await fetchCategories();
    const transactions = await fetchTransactionsForYear(targetYear);

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    interface CategoryData {
        values: number[];
        transactions: Transaction[];
    }

    const revenueMap = new Map<string, CategoryData>();
    const expenseMap = new Map<string, CategoryData>();

    const totalRevenue = new Array(12).fill(0);
    const totalExpenses = new Array(12).fill(0);

    for (const tx of transactions) {
        // Only count realized/paid depending on business rule. Assuming all for now.
        const date = new Date(tx.emission || tx.id); // fallback if emission is missing
        if (isNaN(date.getTime())) continue;

        const monthIndex = date.getUTCMonth();
        const value = Math.abs(tx.value || 0);
        const cat = categories.get(tx.category_id);
        const categoryName = cat ? cat.description : 'Sem Categoria';

        // Ignore specific categories
        const normalizedCategory = categoryName.toLowerCase().trim();
        if (
            normalizedCategory.includes('transferência') ||
            normalizedCategory.includes('transferencia') ||
            normalizedCategory === 'saldo inicial'
        ) {
            continue;
        }

        const transaction: Transaction = {
            date,
            description: tx.description || categoryName,
            value,
            monthIndex
        };

        if (tx.type === 'RECEIPT' || (cat && cat.type === 'REVENUE')) {
            if (!revenueMap.has(categoryName)) revenueMap.set(categoryName, { values: new Array(12).fill(0), transactions: [] });
            const data = revenueMap.get(categoryName)!;
            data.values[monthIndex] += value;
            data.transactions.push(transaction);
            totalRevenue[monthIndex] += value;
        } else if (tx.type === 'PAYMENT' || (cat && cat.type === 'EXPENSE')) {
            if (!expenseMap.has(categoryName)) expenseMap.set(categoryName, { values: new Array(12).fill(0), transactions: [] });
            const data = expenseMap.get(categoryName)!;
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
    revenueMap.forEach((data, catName) => {
        items.push({
            code: `8.1.01.${revCode.toString().padStart(3, '0')}`,
            description: catName,
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
    expenseMap.forEach((data, catName) => {
        items.push({
            code: `8.4.01.${expCode.toString().padStart(3, '0')}`,
            description: catName,
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
        year: targetYear,
        availableYears: [targetYear] // Enhance later by dynamically checking available years from API
    };
}
