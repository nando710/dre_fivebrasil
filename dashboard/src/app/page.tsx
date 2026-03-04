
import { parseDRE } from '@/lib/dre-parser';
import { Shell } from '@/components/layout/Shell';
import { KPICards } from '@/components/dre/KPICards';
import { TrendChart } from '@/components/charts/TrendChart';
import { WaterfallChart } from '@/components/charts/WaterfallChart';
import { RevenueBreakdown } from '@/components/dre/RevenueBreakdown';
import { ExpenseBreakdown } from '@/components/dre/ExpenseBreakdown';
import { cn } from '@/lib/utils';
import { YearSelector } from '@/components/dre/YearSelector';
import { MonthSelector } from '@/components/dre/MonthSelector';
import { DetailedTable } from '@/components/dre/DetailedTable';

export default async function Home(props: { searchParams?: Promise<{ year?: string; month?: string }> }) {
  // Await searchParams as required in newer Next.js versions
  const params = await props.searchParams;
  const selectedYear = params?.year;
  const selectedMonthStr = params?.month;
  const selectedMonthIndex = selectedMonthStr && !isNaN(parseInt(selectedMonthStr)) ? parseInt(selectedMonthStr) : null;

  const dreData = parseDRE('data/DRE.xlsx', selectedYear);
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
  // 8.1 (+) RECEITA OPERACIONAL BRUTA
  const grossRevenueItem = items.find(i => i.code === '8.1');
  // 8.2 (-) DEDUÇÕES
  const deductionsItem = items.find(i => i.code === '8.2');
  // 8.3 (-) GASTOS VARIÁVEIS (CMV)
  const variableCostsItem = items.find(i => i.code === '8.3');
  // 8.4 (-) GASTOS OPERACIONAIS
  const opExpensesItem = items.find(i => i.code === '8.4');
  // 8.5 (-) EXTRA OPERACIONAIS
  const extraOpItem = items.find(i => i.code === '8.5');

  // Current Period Calculations
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

  // Previous Period Calculations (MoM / YoY)
  let prevRevenue = 0;
  let prevExpenses = 0;
  let prevNetResult = 0;
  let prevMargin = 0;
  let showDeltas = false;

  if (selectedMonthIndex !== null && selectedMonthIndex > 0) {
    // MoM Calculation within the same year (for Jan, we'd need previous year data, so for simplicity we skip Jan-Dec MoM if not loaded)
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

  // Delta Percentages
  const calcDelta = (current: number, previous: number) => {
    if (previous === 0) return null;
    return (current - previous) / Math.abs(previous);
  };
  const diffMargin = margin - prevMargin; // percentage points

  // Waterfall
  const waterfallData = [
    { name: 'Receita Bruta', amount: revVal },
    { name: 'Deduções', amount: -dedDed },
    { name: 'Custos Var.', amount: -varCost },
    { name: 'Desp. Oper.', amount: -opExp },
    { name: 'Extra Oper.', amount: -exOp },
    { name: 'Lucro Líquido', amount: netResult }
  ];

  // Monthly Trend
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
            <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
            <p className="text-zinc-400">Visão Financeira - {dreData.year} {selectedMonthIndex !== null ? `- ${dreData.months[selectedMonthIndex]}` : '(Consolidado)'}</p>
          </div>
          <div className="flex items-center gap-4">
            <MonthSelector months={dreData.months} currentMonthIndex={selectedMonthIndex} />
            {dreData.availableYears && (
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

        {/* Row 1: Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueBreakdown items={items} selectedMonthIndex={selectedMonthIndex} />
          <ExpenseBreakdown items={items} selectedMonthIndex={selectedMonthIndex} />
        </div>

        {/* Row 2: Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/40 p-6 rounded-xl border border-zinc-800 min-h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Desempenho Mensal</h3>
              {selectedMonthIndex !== null && (
                <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full">
                  Mês selecionado no painel: {dreData.months[selectedMonthIndex]}
                </span>
              )}
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
}
