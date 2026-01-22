'use client';
import React from 'react';

export default function PreferencesLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="max-w-7xl mx-auto px-6 pt-32 pb-32">
            <div className="flex flex-col items-center mb-12 text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                    Claritas Pathfinder v1.0
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
                    Configure Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Roadmap</span>
                </h1>
                <p className="text-slate-400 max-w-xl">
                    Complete your profile to synchronize your academic goals with state-specific curriculum standards.
                </p>
            </div>
            <div className="relative">
                <div className="absolute -inset-10 bg-indigo-600/5 blur-[120px] -z-10 rounded-full"></div>
                {children}
            </div>
        </div>
    );
};
