'use client';

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Legend,
    ReferenceLine
} from 'recharts';

interface TrendChartProps {
    data: any[];
    selectedMonthIndex?: number | null;
}

export function TrendChart({ data, selectedMonthIndex }: TrendChartProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(val);

    return (
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="oklch(0.696 0.17 162.48)" stopOpacity={0.3} /> {/* Emerald-ish */}
                            <stop offset="95%" stopColor="oklch(0.696 0.17 162.48)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="oklch(0.627 0.265 303.9)" stopOpacity={0.3} /> {/* Blue/Purple-ish */}
                            <stop offset="95%" stopColor="oklch(0.627 0.265 303.9)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#666"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#666"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatCurrency}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                        formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number)}
                    />
                    <Legend />
                    {selectedMonthIndex !== null && selectedMonthIndex !== undefined && data[selectedMonthIndex] && (
                        <ReferenceLine
                            x={data[selectedMonthIndex].name}
                            stroke="oklch(0.546 0.245 262.881)" // highlight blue
                            strokeOpacity={0.8}
                            strokeDasharray="3 3"
                        />
                    )}
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Receita"
                        stroke="oklch(0.696 0.17 162.48)"
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        strokeWidth={2}
                    />
                    <Area
                        type="monotone"
                        dataKey="profit"
                        name="Lucro Líquido"
                        stroke="oklch(0.627 0.265 303.9)"
                        fillOpacity={1}
                        fill="url(#colorProfit)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
