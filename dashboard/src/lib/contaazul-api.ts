import axios from 'axios';
import { getValidAccessToken } from './contaazul-auth';
import { DREData, DRELineItem, Transaction } from './dre-parser';

const CONTA_AZUL_API = 'https://api-v2.contaazul.com';

function extractDataArray(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.content)) return data.content; // Typical Spring / Java pagination
    if (Array.isArray(data.categorias)) return data.categorias;
    if (Array.isArray(data.lancamentos)) return data.lancamentos;
    if (data && typeof data === 'object') {
        const firstKeyWithArray = Object.keys(data).find(key => Array.isArray(data[key]));
        if (firstKeyWithArray) {
            console.log(`[Conta Azul] Auto-discovered list in key: ${firstKeyWithArray}`);
            return data[firstKeyWithArray];
        }
    }

    console.error('[Conta Azul API] Unexpected response format. Keys found:', data ? Object.keys(data) : 'none');
    return [];
}

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
    category_name?: string;
    type: string; // RECEIPT or PAYMENT
}

export async function fetchCategories(): Promise<Map<string, ContaAzulCategory>> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated with Conta Azul');

    // Trying the most common endpoints
    const response = await axios.get(`${CONTA_AZUL_API}/v1/categorias`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).catch(error => {
        console.error('[Conta Azul API] Error fetching Categories:', error?.response?.status, error?.response?.data, error.config?.url);
        throw new Error(`Falha ao buscar Categorias: ${error?.response?.status} na URL ${error.config?.url}`);
    });

    const categoryMap = new Map<string, ContaAzulCategory>();
    const categories: ContaAzulCategory[] = extractDataArray(response.data);

    categories.forEach(cat => {
        categoryMap.set(cat.id, cat);
    });

    return categoryMap;
}

export async function fetchTransactionsForYear(year: string): Promise<ContaAzulTransaction[]> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated with Conta Azul');

    // For the search endpoint, the date format must include data_vencimento_de and data_vencimento_ate
    // Let's use standard ISO YYYY-MM-DD as usually required by Brazilian APIs
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    const commonParams = {
        data_vencimento_de: start,
        data_vencimento_ate: end,
        size: 1000
    };

    // We fetch Receivables
    const receivingReq = axios.get(`${CONTA_AZUL_API}/v1/financeiro/eventos-financeiros/contas-a-receber/buscar`, {
        params: commonParams,
        headers: { 'Authorization': `Bearer ${token}` }
    }).catch(error => {
        console.warn('[Conta Azul API] Warning fetching Receivables:', error?.response?.status, error?.response?.data, error.config?.url);
        return { data: [] }; // Fallback to empty array if fails so we don't break the whole DRE
    });

    // We fetch Payables
    const payableReq = axios.get(`${CONTA_AZUL_API}/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar`, {
        params: commonParams,
        headers: { 'Authorization': `Bearer ${token}` }
    }).catch(error => {
        console.warn('[Conta Azul API] Warning fetching Payables:', error?.response?.status, error?.response?.data, error.config?.url);
        return { data: [] }; // Fallback
    });

    const [receivablesRes, payablesRes] = await Promise.all([receivingReq, payableReq]);

    console.log('[Conta Azul Logs] Receivables API keys:', Object.keys(receivablesRes.data || {}));
    console.log('[Conta Azul Logs] Payables API keys:', Object.keys(payablesRes.data || {}));

    const rawReceivablesList = extractDataArray(receivablesRes.data);
    const rawPayablesList = extractDataArray(payablesRes.data);

    if (rawReceivablesList.length > 0) {
        console.log('[Conta Azul Logs] Sample Receivable object:', JSON.stringify(rawReceivablesList[0]));
    }
    if (rawPayablesList.length > 0) {
        console.log('[Conta Azul Logs] Sample Payable object:', JSON.stringify(rawPayablesList[0]));
    }

    const receivables = rawReceivablesList.map(tx => ({
        ...tx,
        type: 'RECEIPT',
        value: tx.total || tx.valor || tx.value || 0,
        emission: tx.data_vencimento || tx.data_competencia || tx.emission || tx.date || `${year}-01-01`,
        category_id: (tx.categorias && tx.categorias.length > 0) ? tx.categorias[0].id : (tx.categoria_id || tx.category_id),
        category_name: (tx.categorias && tx.categorias.length > 0) ? tx.categorias[0].nome : undefined,
        description: tx.descricao || tx.observacao || tx.description || 'Recebimento'
    }));

    const payables = rawPayablesList.map(tx => ({
        ...tx,
        type: 'PAYMENT',
        value: tx.total || tx.valor || tx.value || 0,
        emission: tx.data_vencimento || tx.data_competencia || tx.emission || tx.date || `${year}-01-01`,
        category_id: (tx.categorias && tx.categorias.length > 0) ? tx.categorias[0].id : (tx.categoria_id || tx.category_id),
        category_name: (tx.categorias && tx.categorias.length > 0) ? tx.categorias[0].nome : undefined,
        description: tx.descricao || tx.observacao || tx.description || 'Pagamento'
    }));

    const allTransactions = [...receivables, ...payables];

    // Filter by year locally to be safe, since we didn't pass strict date params to avoid API rejection
    return allTransactions.filter(tx => {
        if (!tx.emission) return true; // keep if no date
        return tx.emission.startsWith(year) || tx.emission.includes(year);
    });
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
        const categoryName = tx.category_name || (cat ? cat.description : 'Sem Categoria');

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
