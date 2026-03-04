'use client';

import { BarChart3, Home, PieChart, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();

    const items = [
        { name: 'Dashboard (Planilha)', href: '/', icon: Home },
        { name: 'Conta Azul (API)', href: '/conta-azul', icon: PieChart }
    ];

    return (
        <div className={cn("pb-12 w-64 border-r border-zinc-800 bg-zinc-950/50 backdrop-blur-xl h-screen fixed left-0 top-0 z-30 hidden lg:block", className)}>
            <div className="space-y-4 py-4">
                <div className="px-6 py-2">
                    <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                        Gestão DRE
                    </h2>
                </div>
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-zinc-500 uppercase">
                        Plataforma
                    </h2>
                    <div className="space-y-1">
                        {items.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-800/60 hover:text-white",
                                    pathname === item.href ? "bg-zinc-800 text-white" : "text-zinc-400"
                                )}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-black">
            <Sidebar />
            <div className="lg:ml-64 min-h-screen flex flex-col">
                <header className="sticky top-0 z-20 w-full border-b border-zinc-800 bg-black/50 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/20">
                    <div className="container flex h-16 items-center lg:px-8 px-4">
                        <div className="ml-auto flex items-center space-x-4">
                            <button className="rounded-full bg-zinc-800 p-2 text-zinc-400 hover:text-white transition-colors">
                                <User className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </header>
                <main className="flex-1 space-y-4 p-8 pt-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
