'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MonthSelectorProps {
    months: string[]; // ['Jan', 'Fev'...]
    currentMonthIndex: number | null; // 0 for Jan, null for 'Ano Completo'
}

export function MonthSelector({ months, currentMonthIndex }: MonthSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleValueChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value === 'all') {
            params.delete('month');
        } else {
            params.set('month', value);
        }
        router.push(`/?${params.toString()}`);
    }

    const valueStr = currentMonthIndex !== null ? currentMonthIndex.toString() : 'all';

    return (
        <div className="flex items-center gap-2 z-50 relative">
            <span className="text-sm text-zinc-400 font-medium">Mês:</span>
            <Select value={valueStr} onValueChange={handleValueChange}>
                <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-700 text-zinc-100 z-50">
                    <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 max-h-[250px] z-[100]">
                    <SelectItem value="all" className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer font-medium">
                        Ano Completo
                    </SelectItem>
                    {months.map((month, index) => (
                        <SelectItem key={index} value={index.toString()} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">
                            {month}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
