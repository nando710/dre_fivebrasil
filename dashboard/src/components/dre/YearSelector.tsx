'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from 'react';

interface YearSelectorProps {
    years: string[];
    currentYear: string;
}

export function YearSelector({ years, currentYear }: YearSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleValueChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('year', value);
        router.push(`/?${params.toString()}`);
    }

    return (
        <div className="flex items-center gap-2 z-50 relative">
            <span className="text-sm text-zinc-400 font-medium">Ano Base:</span>
            <Select value={currentYear} onValueChange={handleValueChange}>
                <SelectTrigger className="w-[100px] bg-zinc-900 border-zinc-700 text-zinc-100 z-50">
                    <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 max-h-[200px] z-[100]">
                    {years.map(year => (
                        <SelectItem key={year} value={year} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">
                            {year}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
