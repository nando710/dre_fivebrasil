import { Shell } from '@/components/layout/Shell';
import { KPICards } from '@/components/dre/KPICards';
import { TrendChart } from '@/components/charts/TrendChart';
import { WaterfallChart } from '@/components/charts/WaterfallChart';
import { RevenueBreakdown } from '@/components/dre/RevenueBreakdown';
import { ExpenseBreakdown } from '@/components/dre/ExpenseBreakdown';
import { YearSelector } from '@/components/dre/YearSelector';
import { MonthSelector } from '@/components/dre/MonthSelector';
import { DetailedTable } from '@/components/dre/DetailedTable';
import { getContaAzulDRE } from '@/lib/contaazul-api';
import { getValidAccessToken, getAuthUrl } from '@/lib/contaazul-auth';
import Link from 'next/link';

export default async function ContaAzulDashboard(props: { searchParams?: Promise<{ year?: string; month?: string }> }) {
    const token = await getValidAccessToken();
    const isConnected = !!token;

    if (!isConnected) {
        const authUrl = getAuthUrl();
        return (
            <Shell>
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                    <div className="bg-zinc-900/40 p-10 rounded-xl border border-zinc-800 text-center max-w-md">
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-4">Autenticação Conta Azul</h2>
                        <p className="text-zinc-400 mb-8">
                            Para visualizar seu DRE em tempo real, precisamos de permissão para ler seus lançamentos e categorias.
                        </p>
                        <a
                            href={authUrl}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors inline-block"
                        >
                            Conectar com Conta Azul
                        </a>
                    </div>
                </div>
            </Shell>
        )
    }

    const params = await props.searchParams;
    const selectedYear = params?.year || new Date().getFullYear().toString();
    const selectedMonthStr = params?.month;
    const selectedMonthIndex = selectedMonthStr && !isNaN(parseInt(selectedMonthStr)) ? parseInt(selectedMonthStr) : null;

    try {
        const dreData = await getContaAzulDRE(selectedYear);
        const items = dreData.items;

        // Function to get value for a specific item, considering the selected month
        const getValue = (item: any, monthIndex: number | null) => {
            if (!item) return 0;
            if (monthIndex !== null && item.values.length > monthIndex) {
                return item.values[monthIndex];
            }
            return item.total;
        };

        // --- Exact DRE Logic ---
        const grossRevenueItem = items.find(i => i.code === '8.1');
        const deductionsItem = items.find(i => i.code === '8.2');
        const variableCostsItem = items.find(i => i.code === '8.3');
        const opExpensesItem = items.find(i => i.code === '8.4');
        const extraOpItem = items.find(i => i.code === '8.5');

        const revVal = Math.abs(getValue(grossRevenueItem, selectedMonthIndex));
        const dedDed = Math.abs(getValue(deductionsItem, selectedMonthIndex));
        const varCost = Math.abs(getValue(variableCostsItem, selectedMonthIndex));
        const opExp = Math.abs(getValue(opExpensesItem, selectedMonthIndex));
        const exOp = Math.abs(getValue(extraOpItem, selectedMonthIndex));

        const netRevCalc = revVal - dedDed;
        const grossProfit = netRevCalc - varCost;
        const opResult = grossProfit - opExp;
        const netResult = opResult - exOp;
        const margin = revVal ? (netResult / revVal) : 0;

        const revenue = revVal;
        const expenses = varCost + opExp + exOp;

        let prevRevenue = 0;
        let prevExpenses = 0;
        let prevNetResult = 0;
        let prevMargin = 0;
        let showDeltas = false;

        if (selectedMonthIndex !== null && selectedMonthIndex > 0) {
            showDeltas = true;
            const prevMonthIndex = selectedMonthIndex - 1;

            const pRev = Math.abs(getValue(grossRevenueItem, prevMonthIndex));
            const pDed = Math.abs(getValue(deductionsItem, prevMonthIndex));
            const pVar = Math.abs(getValue(variableCostsItem, prevMonthIndex));
            const pOp = Math.abs(getValue(opExpensesItem, prevMonthIndex));
            const pEx = Math.abs(getValue(extraOpItem, prevMonthIndex));

            const pNetRevCalc = pRev - pDed;
            const pGrossProfit = pNetRevCalc - pVar;
            const pOpResult = pGrossProfit - pOp;

            prevRevenue = pRev;
            prevExpenses = pVar + pOp + pEx;
            prevNetResult = pOpResult - pEx;
            prevMargin = pRev ? (prevNetResult / pRev) : 0;
        }

        const calcDelta = (current: number, previous: number) => previous === 0 ? null : (current - previous) / Math.abs(previous);
        const diffMargin = margin - prevMargin;

        const waterfallData = [
            { name: 'Receita Bruta', amount: revVal },
            { name: 'Deduções', amount: -dedDed },
            { name: 'Custos Var.', amount: -varCost },
            { name: 'Desp. Oper.', amount: -opExp },
            { name: 'Extra Oper.', amount: -exOp },
            { name: 'Lucro Líquido', amount: netResult }
        ];

        const trendData = dreData.months.map((month, index) => {
            const revM = grossRevenueItem?.values[index] || 0;
            const dedM = Math.abs(deductionsItem?.values[index] || 0);
            const varM = Math.abs(variableCostsItem?.values[index] || 0);
            const opM = Math.abs(opExpensesItem?.values[index] || 0);
            const exM = Math.abs(extraOpItem?.values[index] || 0);

            const profitM = revM - dedM - varM - opM - exM;

            return {
                name: month,
                revenue: revM,
                profit: profitM
            };
        });

        return (
            <Shell>
                <div className="flex flex-col space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-bold tracking-tight text-white">Conta Azul</h2>
                                <span className="bg-blue-600/20 text-blue-400 border border-blue-600/30 text-xs px-2 py-1 rounded-md font-medium">Ao Vivo</span>
                            </div>
                            <p className="text-zinc-400">Visão Financeira - {dreData.year} {selectedMonthIndex !== null ? `- ${dreData.months[selectedMonthIndex]}` : '(Consolidado)'}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <MonthSelector months={dreData.months} currentMonthIndex={selectedMonthIndex} />
                            {dreData.availableYears && dreData.availableYears.length > 0 && (
                                <YearSelector years={dreData.availableYears} currentYear={dreData.year} />
                            )}
                        </div>
                    </div>

                    <KPICards
                        revenue={revenue}
                        expenses={expenses}
                        netProfit={netResult}
                        margin={margin}
                        revenueDelta={showDeltas ? calcDelta(revenue, prevRevenue) : null}
                        expensesDelta={showDeltas ? calcDelta(expenses, prevExpenses) : null}
                        profitDelta={showDeltas ? calcDelta(netResult, prevNetResult) : null}
                        marginDelta={showDeltas ? diffMargin : null}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <RevenueBreakdown items={items} selectedMonthIndex={selectedMonthIndex} />
                        <ExpenseBreakdown items={items} selectedMonthIndex={selectedMonthIndex} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-zinc-900/40 p-6 rounded-xl border border-zinc-800 min-h-[400px]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-zinc-100">Desempenho Mensal</h3>
                            </div>
                            <div className="h-[300px]">
                                <TrendChart data={trendData} selectedMonthIndex={selectedMonthIndex} />
                            </div>
                        </div>

                        <div className="bg-zinc-900/40 p-6 rounded-xl border border-zinc-800 min-h-[400px]">
                            <h3 className="text-lg font-semibold mb-4 text-zinc-100">Composição do Resultado</h3>
                            <div className="h-[300px]">
                                <WaterfallChart data={waterfallData} />
                            </div>
                        </div>
                    </div>

                    <DetailedTable items={items} months={dreData.months} selectedMonthIndex={selectedMonthIndex} totalRevenueItem={grossRevenueItem} />
                </div>
            </Shell>
        );

    } catch (error: any) {
        return (
            <Shell>
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <div className="bg-rose-950/30 p-6 rounded-xl border border-rose-900/50 text-center max-w-lg">
                        <h3 className="text-xl font-bold text-rose-500 mb-2">Erro ao carregar dados do Conta Azul</h3>
                        <p className="text-zinc-300 text-sm mb-4">{error.message}</p>
                        <Link href="/conta-azul" className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-white font-medium transition-colors">
                            Tentar Novamente
                        </Link>
                    </div>
                </div>
            </Shell>
        )
    }
}
