import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DRELineItem, Transaction } from '@/lib/dre-parser';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: DRELineItem | null;
    selectedMonthIndex: number | null;
}

export function TransactionModal({ isOpen, onClose, item, selectedMonthIndex }: TransactionModalProps) {
    if (!item || !item.transactions) return null;

    // Filter transactions based on selected month (if any)
    const filteredTransactions = selectedMonthIndex !== null
        ? item.transactions.filter(t => t.monthIndex === selectedMonthIndex)
        : item.transactions;

    const totalValue = filteredTransactions.reduce((acc, t) => acc + t.value, 0);

    // Format date helper
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    };

    // Format currency helper
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(val);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <span>Composição:</span>
                        <span className="text-emerald-400">{item.description}</span>
                    </DialogTitle>
                    <p className="text-sm text-zinc-400">
                        {selectedMonthIndex !== null
                            ? `Lançamentos do mês selecionado`
                            : `Todos os lançamentos do ano`}
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-auto rounded-md border border-zinc-800/50 my-4">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-900/50 text-zinc-400 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="text-left py-3 px-4 font-medium">Data</th>
                                <th className="text-left py-3 px-4 font-medium">Descrição</th>
                                <th className="text-right py-3 px-4 font-medium">Valor Estimado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((t, i) => (
                                    <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                                        <td className="py-3 px-4 whitespace-nowrap text-zinc-400">{formatDate(t.date)}</td>
                                        <td className="py-3 px-4 text-zinc-200">{t.description}</td>
                                        <td className="py-3 px-4 text-right font-mono text-zinc-300">{formatCurrency(t.value)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="py-8 text-center text-zinc-500 italic">
                                        Nenhum lançamento encontrado para este período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50">
                    <span className="font-medium text-zinc-300">Total no período:</span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                        {formatCurrency(totalValue)}
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
