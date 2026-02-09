"use client";

import React, { useState, useRef, useEffect } from 'react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { API_BASE_URL } from '@/lib/apiConfig';

interface Message {
    role: "user" | "model";
    text: string;
}

interface TextChatProps {
    courseId: string;
    unitNumber: number;
    questionIndex: number;
    questionType: "mcq" | "frq";
}

export default function TextChat({ courseId, unitNumber, questionIndex, questionType }: TextChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        const userMessage: Message = { role: "user", text: trimmed };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/quiz_help/text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId,
                    unitNumber,
                    questionIndex,
                    questionType,
                    conversationHistory: messages,
                    studentMessage: trimmed
                })
            });

            if (!res.ok) throw new Error('Failed to get help');
            const data = await res.json();
            setMessages(prev => [...prev, { role: "model", text: data.response }]);
        } catch {
            setMessages(prev => [...prev, { role: "model", text: "Sorry, I couldn't connect. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-8">
                        <p className="text-sm">Ask me anything about this question!</p>
                        <p className="text-xs mt-1">I&apos;ll guide you without giving away the answer.</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-gray-100 text-gray-800 rounded-bl-md'
                        }`}>
                            {msg.role === 'model' ? (
                                <MarkdownRenderer content={msg.text} />
                            ) : (
                                <span>{msg.text}</span>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask for a hint..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none text-sm text-gray-900 placeholder-gray-400"
                        disabled={loading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || loading}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
