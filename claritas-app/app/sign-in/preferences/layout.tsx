'use client';
import React from 'react';

export default function PreferencesLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="relative">
            <div className="absolute -inset-10 bg-indigo-600/5 blur-[120px] -z-10 rounded-full"></div>
            {children}
        </div>
    );
};
