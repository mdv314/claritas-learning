"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import QuizHelpPanel from '@/components/QuizHelpPanel';
import { evaluateModuleQuizAuth, generateModuleQuizRetake, getQuizAttempts } from '@/services/apiService';
import { API_BASE_URL } from '@/lib/apiConfig';

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

interface MCQQuestion {
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
}

interface FRQQuestion {
    question: string;
    sampleAnswer: string;
    keyPoints: string[];
    maxPoints: number;
}

interface ModuleQuiz {
    title: string;
    multipleChoice: MCQQuestion[];
    freeResponse: FRQQuestion[];
}

interface MCQResult {
    question: string;
    options: string[];
    selectedIndex: number;
    correctAnswerIndex: number;
    explanation: string;
    correct: boolean;
}

interface FRQEvaluation {
    questionIndex: number;
    score: number;
    maxPoints: number;
    feedback: string;
}

interface EvaluationResult {
    mcqResults: MCQResult[];
    mcqScore: number;
    mcqTotal: number;
    frqEvaluations: FRQEvaluation[];
    frqQuestions: FRQQuestion[];
    frqAnswers: string[];
    frqScore: number;
    frqTotal: number;
    totalScore: number;
    totalPossible: number;
    percentage: number;
    passed: boolean;
    attemptNumber: number;
    weakSubtopics: string[];
    overallFeedback: string;
}

interface QuizAttempt {
    attempt_number: number;
    percentage: number;
    passed: boolean;
    mcq_score: number;
    mcq_total: number;
    frq_score: number;
    frq_total: number;
    total_score: number;
    total_possible: number;
    created_at: string;
}

function QuizPageContent() {
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitNumber = searchParams.get('unitNumber');

    const [quiz, setQuiz] = useState<ModuleQuiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Quiz-taking state
    const [mcqAnswers, setMcqAnswers] = useState<{ [key: number]: number }>({});
    const [frqAnswers, setFrqAnswers] = useState<{ [key: number]: string }>({});

    // Results state
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState<EvaluationResult | null>(null);

    // Help panel state
    const [helpOpen, setHelpOpen] = useState(false);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [activeQuestionType, setActiveQuestionType] = useState<"mcq" | "frq">("mcq");

    // Attempt history state
    const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
    const [retaking, setRetaking] = useState(false);

    const openHelp = (index: number, type: "mcq" | "frq") => {
        setActiveQuestionIndex(index);
        setActiveQuestionType(type);
        setHelpOpen(true);
    };

    const backUrl = courseId && unitNumber
        ? `/dashboard/course/module?courseId=${courseId}&unit=${unitNumber}`
        : '/dashboard';

    // Fetch quiz and attempt history
    useEffect(() => {
        if (!courseId || !unitNumber) return;
        const fetchQuiz = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/generate_module_quiz`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ courseId, unitNumber: parseInt(unitNumber) })
                });
                if (!res.ok) throw new Error(await res.text() || 'Failed to generate quiz');
                setQuiz(await res.json());
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();

        // Fetch attempt history (non-blocking)
        getQuizAttempts(courseId, parseInt(unitNumber))
            .then(data => setAttempts(data.attempts || []))
            .catch(() => {}); // Silently fail if not authenticated
    }, [courseId, unitNumber]);

    const allAnswered = quiz
        ? quiz.multipleChoice.every((_, i) => mcqAnswers[i] !== undefined) &&
          quiz.freeResponse.every((_, i) => (frqAnswers[i] || '').trim().length > 0)
        : false;

    const handleSubmit = async () => {
        if (!quiz || !courseId || !unitNumber) return;
        setSubmitting(true);
        try {
            const mcqArr = quiz.multipleChoice.map((_, i) => mcqAnswers[i] ?? -1);
            const frqArr = quiz.freeResponse.map((_, i) => frqAnswers[i] || '');

            // Try authenticated route first, fall back to direct backend
            let data;
            try {
                data = await evaluateModuleQuizAuth(courseId, parseInt(unitNumber), mcqArr, frqArr);
            } catch {
                // Fallback to direct backend (no result storage)
                const res = await fetch(`${API_BASE_URL}/evaluate_module_quiz`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        courseId,
                        unitNumber: parseInt(unitNumber),
                        mcqAnswers: mcqArr,
                        frqAnswers: frqArr
                    })
                });
                if (!res.ok) throw new Error(await res.text() || 'Failed to evaluate quiz');
                data = await res.json();
            }
            setResults(data);

            // Refresh attempt history
            getQuizAttempts(courseId, parseInt(unitNumber))
                .then(d => setAttempts(d.attempts || []))
                .catch(() => {});
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Evaluation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRetake = async () => {
        if (!courseId || !unitNumber) return;
        setRetaking(true);
        setResults(null);
        setMcqAnswers({});
        setFrqAnswers({});
        setError(null);
        try {
            // Try authenticated retake (adaptive)
            let data;
            try {
                data = await generateModuleQuizRetake(courseId, parseInt(unitNumber));
            } catch {
                // Fallback: generate fresh quiz without weakness data
                const res = await fetch(`${API_BASE_URL}/generate_module_quiz`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ courseId, unitNumber: parseInt(unitNumber), retake: true })
                });
                if (!res.ok) throw new Error(await res.text() || 'Failed to generate retake quiz');
                data = await res.json();
            }
            setQuiz(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate retake quiz');
        } finally {
            setRetaking(false);
        }
    };

    if (loading || retaking) {
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
                        <p className="mt-8 text-gray-500 font-medium">
                            {retaking ? 'Generating your adaptive retake quiz...' : 'Generating your module quiz...'}
                        </p>
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
                        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Results view
    if (results) {
        const pct = results.percentage ?? Math.round((results.totalScore / results.totalPossible) * 100);
        const passed = results.passed ?? pct >= 80;
        const scoreColor = passed ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600';
        const scoreBg = passed ? 'bg-green-50 border-green-200' : pct >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

        return (
            <div className="min-h-screen bg-[#fafafa]">
                <Header />
                <div className="max-w-3xl mx-auto py-12 px-6">
                    <Link href={backUrl} className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-8 transition-colors text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back to Module
                    </Link>

                    {/* Score Summary */}
                    <div className={`rounded-2xl border p-8 mb-8 ${scoreBg}`}>
                        <div className="text-sm font-bold tracking-wide uppercase mb-2 text-gray-500">Quiz Results</div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">{quiz?.title}</h1>
                        <div className="flex items-baseline gap-3">
                            <span className={`text-5xl font-bold ${scoreColor}`}>{pct}%</span>
                            <span className="text-gray-500 text-lg">({results.totalScore} / {results.totalPossible} points)</span>
                        </div>
                        <div className="mt-3 flex gap-6 text-sm text-gray-600">
                            <span>MCQ: {results.mcqScore}/{results.mcqTotal}</span>
                            <span>Free Response: {results.frqScore}/{results.frqTotal}</span>
                        </div>

                        {/* Pass/Fail message */}
                        <div className={`mt-4 p-4 rounded-xl ${passed ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                            {passed ? (
                                <div className="flex items-center gap-3">
                                    <svg className="w-6 h-6 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="font-bold text-green-800">Congratulations! You passed!</p>
                                        <p className="text-sm text-green-700">You scored {pct}%, meeting the 80% passing threshold. This module is now complete.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <svg className="w-6 h-6 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <p className="font-bold text-red-800">Not quite there yet</p>
                                        <p className="text-sm text-red-700">You need at least 80% to pass. Review the feedback below and try again.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {results.overallFeedback && (
                            <p className="mt-4 text-gray-700 leading-relaxed">{results.overallFeedback}</p>
                        )}
                    </div>

                    {/* MCQ Results */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Multiple Choice</h2>
                        <div className="space-y-6">
                            {results.mcqResults.map((r, i) => (
                                <div key={i} className={`rounded-xl p-6 ${r.correct ? 'bg-green-50' : 'bg-red-50'}`}>
                                    <div className="font-semibold text-gray-900 mb-3">{i + 1}. <MarkdownRenderer content={r.question} className="inline" /></div>
                                    <div className="space-y-2 mb-3">
                                        {r.options.map((opt, oIdx) => {
                                            let cls = "p-3 rounded-lg border-2 text-sm ";
                                            if (oIdx === r.correctAnswerIndex) cls += "bg-green-100 border-green-400 text-green-900 font-medium";
                                            else if (oIdx === r.selectedIndex && !r.correct) cls += "bg-red-100 border-red-400 text-red-900";
                                            else cls += "bg-white border-transparent opacity-60";
                                            return <div key={oIdx} className={cls}><MarkdownRenderer content={opt} /></div>;
                                        })}
                                    </div>
                                    {!r.correct && (
                                        <div className="text-sm text-red-800 bg-red-100 p-3 rounded-lg">
                                            <span className="font-bold">Explanation:</span> <MarkdownRenderer content={r.explanation} className="inline" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FRQ Results */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Free Response</h2>
                        <div className="space-y-8">
                            {results.frqEvaluations.map((ev, i) => {
                                const q = results.frqQuestions[i];
                                const ans = results.frqAnswers[i];
                                const scorePct = ev.maxPoints > 0 ? ev.score / ev.maxPoints : 0;
                                const evColor = scorePct >= 0.8 ? 'bg-green-50' : scorePct >= 0.5 ? 'bg-yellow-50' : 'bg-red-50';
                                return (
                                    <div key={i} className={`rounded-xl p-6 ${evColor}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="font-semibold text-gray-900 text-lg">{i + 1}. <MarkdownRenderer content={q?.question || ''} className="inline" /></div>
                                            <span className="text-sm font-bold px-3 py-1 rounded-full bg-white border border-gray-200">
                                                {ev.score}/{ev.maxPoints}
                                            </span>
                                        </div>
                                        <div className="mb-4">
                                            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Your Answer</p>
                                            <p className="text-gray-700 bg-white p-3 rounded-lg border border-gray-200 text-sm whitespace-pre-wrap">{ans}</p>
                                        </div>
                                        <div className="mb-4">
                                            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Feedback</p>
                                            <div className="text-gray-700 text-sm leading-relaxed"><MarkdownRenderer content={ev.feedback} /></div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Sample Answer</p>
                                            <div className="text-gray-600 bg-white p-3 rounded-lg border border-gray-200 text-sm"><MarkdownRenderer content={q?.sampleAnswer || ''} /></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Attempt History */}
                    {attempts.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Attempt History</h2>
                            <div className="space-y-3">
                                {attempts.map((a) => (
                                    <div key={a.attempt_number} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-gray-500">#{a.attempt_number}</span>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {a.total_score}/{a.total_possible} points ({Math.round(a.percentage)}%)
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(a.created_at).toLocaleDateString()} at {new Date(a.created_at).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                            a.passed
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {a.passed ? 'PASSED' : 'FAILED'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="text-center flex items-center justify-center gap-4">
                        {!passed && (
                            <button
                                onClick={handleRetake}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                            >
                                Retake Quiz
                            </button>
                        )}
                        <Link href={backUrl} className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-black font-medium transition-colors">
                            Back to Module
                        </Link>
                    </div>
                    {!passed && (
                        <p className="text-center text-sm text-gray-500 mt-3">
                            The retake quiz will adapt to focus on your weak areas.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // Quiz-taking view
    return (
        <div className="min-h-screen bg-[#fafafa]">
            <Header />
            <div className="max-w-3xl mx-auto py-12 px-6">
                <Link href={backUrl} className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-8 transition-colors text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to Module
                </Link>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8">
                    <div className="mb-8 border-b border-gray-100 pb-6">
                        <div className="text-sm text-blue-600 font-bold tracking-wide uppercase mb-2">Module Assessment</div>
                        <h1 className="text-3xl font-bold text-gray-900 leading-tight">{quiz?.title}</h1>
                        <p className="text-gray-500 mt-2">
                            {quiz?.multipleChoice.length} multiple choice + {quiz?.freeResponse.length} free response questions
                        </p>
                    </div>

                    {/* MCQ Section */}
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Multiple Choice</h2>
                    <div className="space-y-8 mb-12">
                        {quiz?.multipleChoice.map((q, qIdx) => (
                            <div key={qIdx} className="bg-gray-50 rounded-xl p-6 relative">
                                <button
                                    onClick={() => openHelp(qIdx, "mcq")}
                                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-colors"
                                    title="Get help with this question"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                                <div className="font-semibold text-gray-900 mb-4 text-lg pr-10">{qIdx + 1}. <MarkdownRenderer content={q.question} className="inline" /></div>
                                <div className="space-y-3">
                                    {q.options.map((opt, oIdx) => {
                                        const isSelected = mcqAnswers[qIdx] === oIdx;
                                        const btnClass = isSelected
                                            ? "w-full text-left p-4 rounded-lg border-2 bg-blue-50 border-blue-600 text-blue-900 font-medium shadow-sm transition-all duration-200"
                                            : "w-full text-left p-4 rounded-lg border-2 bg-white border-transparent hover:bg-gray-200 text-gray-700 hover:shadow-sm transition-all duration-200";
                                        return (
                                            <button key={oIdx} onClick={() => setMcqAnswers(prev => ({ ...prev, [qIdx]: oIdx }))} className={btnClass}>
                                                <MarkdownRenderer content={opt} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* FRQ Section */}
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Free Response</h2>
                    <div className="space-y-8">
                        {quiz?.freeResponse.map((q, qIdx) => (
                            <div key={qIdx} className="bg-gray-50 rounded-xl p-6 relative">
                                <button
                                    onClick={() => openHelp(qIdx, "frq")}
                                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-colors"
                                    title="Get help with this question"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                                <div className="font-semibold text-gray-900 mb-2 text-lg pr-10">
                                    {(quiz?.multipleChoice.length || 0) + qIdx + 1}. <MarkdownRenderer content={q.question} className="inline" />
                                </div>
                                <p className="text-sm text-gray-500 mb-4">{q.maxPoints} points</p>
                                <textarea
                                    value={frqAnswers[qIdx] || ''}
                                    onChange={(e) => setFrqAnswers(prev => ({ ...prev, [qIdx]: e.target.value }))}
                                    placeholder="Type your answer here..."
                                    className="w-full p-4 rounded-lg border-2 border-gray-200 focus:border-blue-600 focus:outline-none text-gray-900 min-h-[120px] resize-y transition-colors"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-center">
                    <button
                        onClick={handleSubmit}
                        disabled={!allAnswered || submitting}
                        className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-black font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
                    >
                        {submitting ? 'Evaluating...' : 'Submit Quiz'}
                    </button>
                    {!allAnswered && (
                        <p className="text-sm text-gray-400 mt-2">Please answer all questions before submitting.</p>
                    )}
                </div>
            </div>

            {courseId && unitNumber && (
                <QuizHelpPanel
                    isOpen={helpOpen}
                    onClose={() => setHelpOpen(false)}
                    questionIndex={activeQuestionIndex}
                    questionType={activeQuestionType}
                    courseId={courseId}
                    unitNumber={parseInt(unitNumber)}
                />
            )}
        </div>
    );
}

export default function QuizPage() {
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
            <QuizPageContent />
        </Suspense>
    );
}
