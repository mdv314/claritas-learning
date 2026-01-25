"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const Header = () => (
    <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                C
            </div>
            <span className="font-semibold text-xl tracking-tight text-gray-900">Claritas Learning</span>
        </div>
        <nav className="flex gap-6 text-sm font-medium text-gray-500">
            <a href="/" className="hover:text-blue-600 transition-colors">Home</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Courses</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Community</a>
        </nav>
        <div className="w-8 h-8 rounded-full bg-gray-200" />
    </header>
);

export default function TopicPage() {
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitNumber = searchParams.get('unit');
    const subtopicIndex = searchParams.get('subtopic');
    const topicName = searchParams.get('name');

    const backUrl = courseId ? `/course/${courseId}` : '/generate';

    return (
        <div className="min-h-screen bg-[#fafafa]">
            <Header />
            <div className="max-w-4xl mx-auto py-12 px-6">
                <Link
                    href={backUrl}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Course
                </Link>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                    <div className="text-sm text-blue-600 font-medium mb-2">
                        Unit {unitNumber} {subtopicIndex !== null ? `• Topic ${parseInt(subtopicIndex) + 1}` : ''}
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">
                        {topicName || 'Topic Content'}
                    </h1>

                    <div className="text-center py-16 text-gray-500">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <p className="text-lg font-medium text-gray-700 mb-2">Content Coming Soon</p>
                        <p className="text-gray-500">This topic page will be populated with learning content.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
