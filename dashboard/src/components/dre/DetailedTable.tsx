'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { DRELineItem } from '@/lib/dre-parser';
import { TransactionModal } from './TransactionModal';

interface DetailedTableProps {
    items: DRELineItem[];
    months: string[];
    selectedMonthIndex: number | null;
    totalRevenueItem?: DRELineItem;
}

export function DetailedTable({ items, months, selectedMonthIndex, totalRevenueItem }: DetailedTableProps) {
    const [selectedItem, setSelectedItem] = useState<DRELineItem | null>(null);

    const formatPercent = (val: number, revenue: number) => {
        if (!revenue || revenue === 0) return '';
        const pct = (val / revenue) * 100;
        return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
    };

    const handleRowClick = (item: DRELineItem) => {
        // Only open modal if the item has transactions attached (leaf nodes)
        if (item.transactions && item.transactions.length > 0) {
            setSelectedItem(item);
        }
    };

    return (
        <div className="bg-zinc-900/40 p-6 rounded-xl border border-zinc-800 hidden md:block">
            <h3 className="text-lg font-semibold mb-4 text-zinc-100">Demonstrativo Detalhado</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-zinc-950/50 text-zinc-400 border-b border-zinc-800">
                        <tr>
                            <th className="text-left py-3 px-4 rounded-tl-lg">Conta</th>
                            {months.map((m, i) => (
                                <th key={i} className={cn(
                                    "text-right py-3 px-2 w-24 transition-colors",
                                    selectedMonthIndex === i ? "text-zinc-100 bg-zinc-800/50" : "hidden xl:table-cell"
                                )}>{m}</th>
                            ))}
                            <th className={cn("text-right py-3 px-4 rounded-tr-lg", selectedMonthIndex === null ? "text-emerald-400" : "")}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, i) => {
                            const hasTransactions = Boolean(item.transactions && item.transactions.length > 0);
                            return (
                                <tr
                                    key={i}
                                    onClick={() => handleRowClick(item)}
                                    className={cn(
                                        "border-b border-zinc-800/50 transition-colors",
                                        item.isTotal ? "bg-zinc-900/50" : "hover:bg-zinc-800/30",
                                        hasTransactions ? "cursor-pointer" : ""
                                    )}
                                    title={hasTransactions ? "Clique para ver os lançamentos" : item.description}
                                >
                                    <td className="py-3 px-4 max-w-[200px] truncate">
                                        <div style={{ paddingLeft: `${(item.level - 1) * 16}px` }} className="flex items-center">
                                            <span className="font-mono text-zinc-600 mr-2 text-xs opacity-70">{item.code}</span>
                                            <span className={cn(
                                                item.isTotal ? "font-bold text-zinc-100" : "text-zinc-300",
                                                hasTransactions && "group-hover:text-emerald-400 underline decoration-dashed underline-offset-4 decoration-zinc-600"
                                            )}>
                                                {item.description}
                                            </span>
                                        </div>
                                    </td>
                                    {/* Show monthly columns on large screens or the selected month */}
                                    {item.values.slice(0, 12).map((val, idx) => {
                                        const revForMonth = totalRevenueItem?.values[idx] || 0;
                                        return (
                                            <td key={idx} className={cn(
                                                "text-right py-3 px-2 transition-colors",
                                                selectedMonthIndex === idx ? "bg-zinc-800/30" : "hidden xl:table-cell",
                                            )}>
                                                <div className="flex flex-col items-end justify-center">
                                                    <span className={cn(
                                                        "font-mono text-xs",
                                                        selectedMonthIndex === idx ? "text-zinc-200 font-medium" : "text-zinc-500",
                                                    )}>
                                                        {val === 0 ? '-' : val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                    </span>
                                                    {(val !== 0 && totalRevenueItem && item.code !== '8.1' && revForMonth !== 0) && (
                                                        <span className={cn(
                                                            "text-[10px] leading-none mt-1 font-mono",
                                                            val > 0 ? (item.code.startsWith('8.1.') ? 'text-emerald-500/80' : 'text-zinc-500') : 'text-rose-500/80'
                                                        )}>
                                                            {formatPercent(Math.abs(val), revForMonth)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className={cn(
                                        "text-right py-3 px-4 transition-colors",
                                        selectedMonthIndex === null ? "" : ""
                                    )}>
                                        <div className="flex flex-col items-end justify-center">
                                            <span className={cn(
                                                "font-mono",
                                                item.isTotal ? "text-white font-medium" : "text-zinc-400 text-sm",
                                                selectedMonthIndex === null ? "text-emerald-400 font-bold" : ""
                                            )}>
                                                {item.total === 0 ? '-' : item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </span>
                                            {(item.total !== 0 && totalRevenueItem && item.code !== '8.1' && totalRevenueItem.total !== 0) && (
                                                <span className={cn(
                                                    "text-[10px] leading-none mt-1 font-mono",
                                                    item.total > 0 ? (item.code.startsWith('8.1.') ? 'text-emerald-500/80' : 'text-zinc-500') : 'text-rose-500/80'
                                                )}>
                                                    AV: {formatPercent(Math.abs(item.total), totalRevenueItem.total)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <TransactionModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                item={selectedItem}
                selectedMonthIndex={selectedMonthIndex}
            />
        </div>
    );
}
