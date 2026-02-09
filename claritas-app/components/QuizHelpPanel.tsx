"use client";

import React from 'react';
import TextChat from './TextChat';

interface QuizHelpPanelProps {
    isOpen: boolean;
    onClose: () => void;
    questionIndex: number;
    questionType: "mcq" | "frq";
    courseId: string;
    unitNumber: number;
}

export default function QuizHelpPanel({ isOpen, onClose, questionIndex, questionType, courseId, unitNumber }: QuizHelpPanelProps) {
    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Need Help?</h2>
                        <p className="text-xs text-gray-500">Question {questionIndex + 1} &middot; {questionType === 'mcq' ? 'Multiple Choice' : 'Free Response'}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Chat area */}
                <div className="flex-1 overflow-hidden">
                    <TextChat
                        courseId={courseId}
                        unitNumber={unitNumber}
                        questionIndex={questionIndex}
                        questionType={questionType}
                    />
                </div>
            </div>
        </>
    );
}
