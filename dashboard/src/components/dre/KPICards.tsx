import { ArrowDownRight, ArrowUpRight, DollarSign, Percent, Wallet, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface KPICardsProps {
    revenue: number;
    expenses: number;
    netProfit: number;
    margin: number;
    revenueDelta?: number | null;
    expensesDelta?: number | null;
    profitDelta?: number | null;
    marginDelta?: number | null;
}

export function KPICards({ revenue, expenses, netProfit, margin, revenueDelta, expensesDelta, profitDelta, marginDelta }: KPICardsProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const formatPercent = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1 }).format(val);

    const renderDelta = (delta: number | null | undefined, inverted: boolean = false, isPoints: boolean = false) => {
        if (delta === null || delta === undefined) return null;

        let isPositive = delta > 0;
        let isNeutral = delta === 0;
        // For expenses, a positive delta (increase) is generally "bad" (red), and negative is "good" (green)
        const isGood = inverted ? !isPositive : isPositive;

        return (
            <div className={cn(
                "flex items-center text-xs font-medium ml-2 px-1.5 py-0.5 rounded-full",
                isNeutral ? "text-zinc-400 bg-zinc-800" :
                    isGood ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
            )}>
                {isNeutral ? <Minus className="h-3 w-3 mr-1" /> :
                    isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {isPoints
                    ? `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)} pp`
                    : formatPercent(Math.abs(delta))}
            </div>
        );
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Receita Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline">
                        <div className="text-2xl font-bold text-white">{formatCurrency(revenue)}</div>
                        {renderDelta(revenueDelta)}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Receita operacional bruta</p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Despesas Totais</CardTitle>
                    <Wallet className="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline">
                        <div className="text-2xl font-bold text-white">{formatCurrency(expenses)}</div>
                        {renderDelta(expensesDelta, true)}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Operacionais e não operacionais</p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Lucro Líquido</CardTitle>
                    <div className={cn("h-4 w-4 rounded-full", netProfit >= 0 ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500")}>
                        {netProfit >= 0 ? <ArrowUpRight className="h-4 w-4 p-0.5" /> : <ArrowDownRight className="h-4 w-4 p-0.5" />}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline">
                        <div className={cn("text-2xl font-bold", netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                            {formatCurrency(netProfit)}
                        </div>
                        {renderDelta(profitDelta)}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Resultado final do período</p>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Margem Líquida</CardTitle>
                    <Percent className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline">
                        <div className="text-2xl font-bold text-white">{formatPercent(margin)}</div>
                        {renderDelta(marginDelta, false, true)}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Taxa de lucratividade</p>
                </CardContent>
            </Card>
        </div>
    );
}

