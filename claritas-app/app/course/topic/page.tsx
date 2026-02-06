"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MarkdownRenderer from '@/components/MarkdownRenderer';

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

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
}

interface VideoReference {
    title: string;
    url: string;
    creatorName: string;
}

interface TopicSection {
    heading: string;
    content: string;
    videos?: VideoReference[];
}

interface TopicContent {
    title: string;
    sections: TopicSection[];
    quiz: QuizQuestion[];
    searchAttribution?: string;
}

function getYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

function VideoEmbed({ video }: { video: VideoReference }) {
    const ytId = getYouTubeId(video.url);

    if (ytId) {
        return (
            <div className="my-5 rounded-xl overflow-hidden border border-gray-200 bg-black">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                        className="absolute top-0 left-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                    />
                </div>
                <div className="bg-white px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{video.title}</p>
                        <p className="text-xs text-gray-500">{video.creatorName}</p>
                    </div>
                    <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-gray-600 shrink-0 ml-3"
                    >
                        Watch on YouTube
                    </a>
                </div>
            </div>
        );
    }

    return (
        <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 my-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
        >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div>
                <p className="font-medium text-gray-900">{video.title}</p>
                <p className="text-sm text-gray-500">by {video.creatorName}</p>
            </div>
        </a>
    );
}

function TopicPageContent() {
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitNumber = searchParams.get('unit');
    const subtopicIndex = searchParams.get('subtopic');

    const [content, setContent] = useState<TopicContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Quiz state
    const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
    const [showResults, setShowResults] = useState<{ [key: number]: boolean }>({});

    const backUrl = courseId && unitNumber
        ? `/course/module?courseId=${courseId}&unit=${unitNumber}`
        : courseId
            ? `/course/${courseId}`
            : '/generate';

    useEffect(() => {
        if (!courseId || !unitNumber || !subtopicIndex) return;

        const fetchContent = async () => {
            try {
                // Using localhost explicitly as per main.py default
                const res = await fetch('http://127.0.0.1:5000/generate_topic', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        courseId,
                        unitNumber: parseInt(unitNumber),
                        subtopicIndex: parseInt(subtopicIndex)
                    })
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(errorText || 'Failed to generate content');
                }

                const data = await res.json();
                setContent(data);
            } catch (err) {
                console.error("Fetch error:", err);
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [courseId, unitNumber, subtopicIndex]);

    const handleOptionSelect = (qIndex: number, oIndex: number) => {
        if (showResults[qIndex]) return;
        setSelectedAnswers(prev => ({ ...prev, [qIndex]: oIndex }));
    };

    const checkAnswer = (qIndex: number) => {
        setShowResults(prev => ({ ...prev, [qIndex]: true }));
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fafafa]">
                <Header />
                <div className="max-w-4xl mx-auto py-12 px-6 text-center">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2 mb-8"></div>
                        <div className="space-y-4 w-full">
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                        <p className="mt-8 text-gray-500 font-medium">Generating your personalized lesson...</p>
                        <p className="text-sm text-gray-400 mt-2">This may take a few seconds.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#fafafa]">
                <Header />
                <div className="max-w-4xl mx-auto py-12 px-6 text-center">
                    <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100">
                        <h3 className="font-bold text-lg mb-2">Something went wrong</h3>
                        <p className="mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#fafafa]">
            <Header />
            <div className="max-w-3xl mx-auto py-12 px-6">
                <Link
                    href={backUrl}
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-8 transition-colors text-sm font-medium"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Module
                </Link>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8">
                    <div className="mb-8 border-b border-gray-100 pb-6">
                        <div className="text-sm text-blue-600 font-bold tracking-wide uppercase mb-2">Topic Lesson</div>
                        <h1 className="text-3xl font-bold text-gray-900 leading-tight">{content?.title}</h1>
                    </div>

                    {content?.sections.map((section, idx) => (
                        <div key={idx} className="mb-10 last:mb-0">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">{section.heading}</h2>
                            <div className="prose text-gray-600 leading-relaxed text-lg">
                                <MarkdownRenderer content={section.content} />
                            </div>
                            {section.videos && section.videos.length > 0 && (
                                <div className="mt-6">
                                    {section.videos.map((video, vIdx) => (
                                        <VideoEmbed key={vIdx} video={video} />
                                    ))}
                                    {content?.searchAttribution && (
                                        <div
                                            className="mt-1 opacity-60 scale-90 origin-left"
                                            dangerouslySetInnerHTML={{ __html: content.searchAttribution }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Quiz Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Knowledge Check</h2>
                    </div>

                    <div className="space-y-8">
                        {content?.quiz.map((q, qIdx) => (
                            <div key={qIdx} className="bg-gray-50 rounded-xl p-6">
                                <div className="font-semibold text-gray-900 mb-4 text-lg">{qIdx + 1}. <MarkdownRenderer content={q.question} className="inline" /></div>
                                <div className="space-y-3">
                                    {q.options.map((opt, oIdx) => {
                                        const isSelected = selectedAnswers[qIdx] === oIdx;
                                        const isCorrect = q.correctAnswerIndex === oIdx;
                                        const revealed = showResults[qIdx];

                                        let btnClass = "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 relative ";
                                        if (revealed) {
                                            if (isCorrect) btnClass += "bg-green-50 border-green-500 text-green-900 font-medium";
                                            else if (isSelected) btnClass += "bg-red-50 border-red-500 text-red-900";
                                            else btnClass += "bg-white border-transparent opacity-60";
                                        } else {
                                            if (isSelected) btnClass += "bg-blue-50 border-blue-600 text-blue-900 font-medium shadow-sm";
                                            else btnClass += "bg-white border-transparent hover:bg-gray-200 text-gray-700 hover:shadow-sm";
                                        }

                                        return (
                                            <button
                                                key={oIdx}
                                                onClick={() => handleOptionSelect(qIdx, oIdx)}
                                                className={btnClass}
                                                disabled={revealed}
                                            >
                                                <MarkdownRenderer content={opt} />
                                                {revealed && isCorrect && (
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </span>
                                                )}
                                                {revealed && isSelected && !isCorrect && (
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {!showResults[qIdx] && (
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => checkAnswer(qIdx)}
                                            disabled={selectedAnswers[qIdx] === undefined}
                                            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-black font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Check Answer
                                        </button>
                                    </div>
                                )}

                                {showResults[qIdx] && (
                                    <div className={`mt-4 p-4 rounded-lg animate-in fade-in slide-in-from-top-2 ${selectedAnswers[qIdx] === q.correctAnswerIndex ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        <p className="font-bold mb-1 flex items-center gap-2">
                                            {selectedAnswers[qIdx] === q.correctAnswerIndex ? 'Correct!' : 'Not quite right.'}
                                        </p>
                                        <div className="text-sm leading-relaxed"><MarkdownRenderer content={q.explanation} /></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TopicPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#fafafa]">
                <Header />
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500">Loading...</p>
                    </div>
                </div>
            </div>
        }>
            <TopicPageContent />
        </Suspense>
    );
}

