'use client';

import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DRELineItem } from '@/lib/dre-parser';

interface RevenueBreakdownProps {
    items: DRELineItem[];
    selectedMonthIndex?: number | null;
}

export function RevenueBreakdown({ items, selectedMonthIndex = null }: RevenueBreakdownProps) {
    // Filter for children of 8.1.01 (Vendas) or just 8.1 direct children
    // Hierarchy uses dots. Direct children of 8.1 are 8.1.01 etc.
    // The log showed: 
    // 8.1.01 Vendas
    //   8.1.01.001 Venda Vista
    //   8.1.02.002 Venda Prazo

    // Let's grab the lowest level "Payment Types" which seem to comprise the total.
    // Codes like 8.1.01.001.03xxx seems to be the leaf nodes.

    const getValue = (item: DRELineItem) => {
        if (selectedMonthIndex !== null && selectedMonthIndex !== undefined && item.values.length > selectedMonthIndex) {
            return item.values[selectedMonthIndex];
        }
        return item.total;
    };

    const revenueLeaves = items.filter(i =>
        i.code.startsWith('8.1') &&
        i.level >= 3 && // Adjusted to level 3 based on parser
        getValue(i) > 0
    ).map(i => ({
        name: i.description,
        value: getValue(i)
    })).sort((a, b) => b.value - a.value);

    // If too many, group small ones?
    // tailored colors
    const COLORS = [
        'oklch(0.696 0.17 162.48)', // Emerald
        'oklch(0.627 0.265 303.9)', // Purple
        'oklch(0.6 0.118 184.704)', // Teal
        'oklch(0.769 0.188 70.08)', // Orange
        'oklch(0.488 0.243 264.376)' // Blue
    ];

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(val);

    return (
        <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-sm h-full">
            <CardHeader>
                <CardTitle className="text-zinc-100">Origem da Receita</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {revenueLeaves.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={revenueLeaves}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {revenueLeaves.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                                    formatter={(value: any) => formatCurrency(value as number)}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-zinc-500">
                            Sem dados de receita {'para este período'}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
