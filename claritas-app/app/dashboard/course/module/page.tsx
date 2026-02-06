"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// --- Types ---
interface Quiz {
    title: string;
    questionCount: number;
}

interface Unit {
    unitNumber: number;
    title: string;
    description: string;
    duration: string;
    subtopics: string[];
    quiz: Quiz;
}

interface CourseMetadata {
    skillLevel: string;
    ageGroup: string;
    estimatedTotalDuration: string;
}

interface CoursePlan {
    courseTitle: string;
    description: string;
    metadata: CourseMetadata;
    units: Unit[];
    course_id?: string;
}

interface CourseProgress {
    isEnrolled: boolean;
    completedTopics: string[]; // Format: "unitNumber-subtopicIndex"
    lastVisited: string | null; // Format: "unitNumber-subtopicIndex"
}

const getProgress = (courseId: string): CourseProgress => {
    if (typeof window === 'undefined') {
        return { isEnrolled: false, completedTopics: [], lastVisited: null };
    }
    const stored = localStorage.getItem(`course-progress-${courseId}`);
    if (stored) {
        return JSON.parse(stored);
    }
    return { isEnrolled: false, completedTopics: [], lastVisited: null };
};

const saveProgress = (courseId: string, progress: CourseProgress) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(`course-progress-${courseId}`, JSON.stringify(progress));
    }
};

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

function ModulePageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const courseId = searchParams.get('courseId');
    const unitNumber = parseInt(searchParams.get('unit') || '1');

    const [course, setCourse] = useState<CoursePlan | null>(null);
    const [progress, setProgress] = useState<CourseProgress>({
        isEnrolled: false,
        completedTopics: [],
        lastVisited: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch course data
    useEffect(() => {
        const fetchCourse = async () => {
            if (!courseId) {
                setError('No course ID provided');
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`http://127.0.0.1:5000/course/${courseId}`);
                if (!response.ok) {
                    throw new Error('Course not found');
                }
                const data = await response.json();
                setCourse(data);

                // Load progress
                const savedProgress = getProgress(courseId);
                setProgress(savedProgress);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load course');
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [courseId]);

    const unit = course?.units.find(u => u.unitNumber === unitNumber);

    const isTopicCompleted = (subtopicIndex: number) => {
        return progress.completedTopics.includes(`${unitNumber}-${subtopicIndex}`);
    };

    const getModuleProgress = () => {
        if (!unit) return { completed: 0, total: 0 };
        const completed = unit.subtopics.filter((_, idx) => isTopicCompleted(idx)).length;
        return { completed, total: unit.subtopics.length };
    };

    const handleTopicClick = (subtopicIndex: number, subtopicName: string) => {
        if (!courseId) return;

        // Update last visited
        const topicKey = `${unitNumber}-${subtopicIndex}`;
        const newProgress = { ...progress, lastVisited: topicKey };
        setProgress(newProgress);
        saveProgress(courseId, newProgress);

        // Navigate to topic page
        const params = new URLSearchParams({
            courseId: courseId,
            unit: unitNumber.toString(),
            subtopic: subtopicIndex.toString(),
            name: subtopicName
        });
        router.push(`/course/topic?${params.toString()}`);
    };

    const handleModuleNavigation = (newUnitNumber: number) => {
        if (!courseId) return;
        const params = new URLSearchParams({
            courseId: courseId,
            unit: newUnitNumber.toString()
        });
        router.push(`/course/module?${params.toString()}`);
    };

    const backUrl = courseId ? `/course/${courseId}` : '/generate';
    const moduleProgress = getModuleProgress();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fafafa]">
                <Header />
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500">Loading module...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !course || !unit) {
        return (
            <div className="min-h-screen bg-[#fafafa]">
                <Header />
                <div className="max-w-4xl mx-auto py-12 px-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <p className="text-lg font-medium text-gray-700 mb-2">{error || 'Module not found'}</p>
                        <Link href={backUrl} className="text-blue-600 hover:text-blue-700">
                            Return to course
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa]">
            <Header />

            <div className="max-w-6xl mx-auto py-8 px-6">
                {/* Breadcrumb */}
                <Link
                    href={backUrl}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Course Overview
                </Link>

                <div className="flex gap-8">
                    {/* Sidebar - Module Navigation */}
                    <div className="w-64 flex-shrink-0">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-24">
                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-semibold text-gray-900 text-sm">Course Modules</h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {course.units.map((u) => {
                                    const isActive = u.unitNumber === unitNumber;
                                    const completedInUnit = u.subtopics.filter((_, idx) =>
                                        progress.completedTopics.includes(`${u.unitNumber}-${idx}`)
                                    ).length;
                                    const allCompleted = completedInUnit === u.subtopics.length;

                                    return (
                                        <button
                                            key={u.unitNumber}
                                            onClick={() => handleModuleNavigation(u.unitNumber)}
                                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${isActive ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                                allCompleted
                                                    ? 'bg-green-500 text-white'
                                                    : isActive
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-200 text-gray-600'
                                            }`}>
                                                {allCompleted ? (
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    u.unitNumber
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${isActive ? 'text-blue-900' : 'text-gray-700'}`}>
                                                    Module {u.unitNumber}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">{u.title}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Module Header */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-sm text-blue-600 font-medium mb-1">Module {unitNumber}</div>
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{unit.title}</h1>
                                    <p className="text-gray-600 mb-4">{unit.description}</p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {unit.duration}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            {unit.subtopics.length} Topics
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            1 Quiz
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-500 mb-1">Progress</div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {moduleProgress.completed}/{moduleProgress.total}
                                    </div>
                                    <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-2">
                                        <div
                                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                            style={{ width: `${moduleProgress.total > 0 ? (moduleProgress.completed / moduleProgress.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Topics List */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h2 className="font-semibold text-gray-900">Topics</h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {unit.subtopics.map((topic, idx) => {
                                    const completed = isTopicCompleted(idx);
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleTopicClick(idx, topic)}
                                            className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                completed
                                                    ? 'bg-green-500'
                                                    : 'bg-gray-100 group-hover:bg-blue-100'
                                            }`}>
                                                {completed ? (
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-medium ${completed ? 'text-gray-500' : 'text-gray-900 group-hover:text-blue-700'}`}>
                                                    {topic}
                                                </p>
                                                <p className="text-sm text-gray-500">Reading</p>
                                            </div>
                                            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quiz Section */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h2 className="font-semibold text-gray-900">Assessment</h2>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{unit.quiz.title}</h3>
                                        <p className="text-sm text-gray-500">{unit.quiz.questionCount} questions</p>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/course/quiz?courseId=${courseId}&unitNumber=${unitNumber}`)}
                                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Start Quiz
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-6">
                            {unitNumber > 1 ? (
                                <button
                                    onClick={() => handleModuleNavigation(unitNumber - 1)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Previous Module
                                </button>
                            ) : (
                                <div />
                            )}
                            {unitNumber < course.units.length ? (
                                <button
                                    onClick={() => handleModuleNavigation(unitNumber + 1)}
                                    className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 transition-colors"
                                >
                                    Next Module
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ) : (
                                <div />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ModulePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#fafafa]">
                <Header />
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500">Loading module...</p>
                    </div>
                </div>
            </div>
        }>
            <ModulePageContent />
        </Suspense>
    );
}
