'use client';

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DRELineItem } from '@/lib/dre-parser';

interface ExpenseBreakdownProps {
    items: DRELineItem[];
    selectedMonthIndex?: number | null;
}

export function ExpenseBreakdown({ items, selectedMonthIndex = null }: ExpenseBreakdownProps) {
    // Expenses are 8.4
    // We want the direct children of 8.4 (Level 3 typically)
    // 8.4.01, 8.4.02, 8.4.03...

    const getValue = (item: DRELineItem) => {
        if (selectedMonthIndex !== null && selectedMonthIndex !== undefined && item.values.length > selectedMonthIndex) {
            return item.values[selectedMonthIndex];
        }
        return item.total;
    };

    const expenseCategories = items.filter(i =>
        i.code.startsWith('8.4.') &&
        Math.abs(getValue(i)) > 0 // Allow negative totals
    ).map(i => ({
        name: i.description,
        value: Math.abs(getValue(i)) // Display as positive
    })).sort((a, b) => b.value - a.value);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(val);

    return (
        <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-sm h-full">
            <CardHeader>
                <CardTitle className="text-zinc-100">Despesas Operacionais</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {expenseCategories.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={expenseCategories} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke="#999"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    width={120}
                                />
                                <Tooltip
                                    cursor={{ fill: '#27272a' }}
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                                    formatter={(value: any) => formatCurrency(value as number)}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                    {expenseCategories.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="oklch(0.627 0.265 303.9)" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-zinc-500">
                            Sem dados de despesa {'para este período'}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
