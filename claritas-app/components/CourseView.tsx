"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
}

interface CourseProgress {
    isEnrolled: boolean;
    completedTopics: string[]; // Format: "unitNumber-subtopicIndex"
    lastVisited: string | null; // Format: "unitNumber-subtopicIndex"
}

// Helper to generate a simple course ID from the title
const getCourseId = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
};

// Helper to get/set course progress from localStorage
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

export const CourseView = ({ course, courseId: propCourseId }: { course: CoursePlan, courseId?: string }) => {
    const router = useRouter();
    const [activeUnit, setActiveUnit] = useState<number | null>(1);
    const [progress, setProgress] = useState<CourseProgress>({
        isEnrolled: false,
        completedTopics: [],
        lastVisited: null
    });
    // Use provided courseId or generate one from title
    const courseId = propCourseId || getCourseId(course.courseTitle);

    // Load progress from localStorage on mount
    useEffect(() => {
        const savedProgress = getProgress(courseId);
        setProgress(savedProgress);
    }, [courseId]);

    // Calculate total topics and progress percentage
    const totalTopics = course.units.reduce((sum, unit) => sum + unit.subtopics.length, 0);
    const completedCount = progress.completedTopics.length;
    const progressPercentage = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

    const handleEnroll = () => {
        const newProgress = { ...progress, isEnrolled: true };
        setProgress(newProgress);
        saveProgress(courseId, newProgress);
    };

    const handleModuleClick = (unitNumber: number) => {
        // Navigate to module page
        const params = new URLSearchParams({
            courseId: courseId,
            unit: unitNumber.toString()
        });
        router.push(`/course/module?${params.toString()}`);
    };

    const handlePickUpWhereLeftOff = () => {
        if (progress.lastVisited) {
            const [unitNumber] = progress.lastVisited.split('-').map(Number);
            // Navigate to the module containing the last visited topic
            handleModuleClick(unitNumber);
        } else {
            // If no last visited, go to first module
            const firstUnit = course.units[0];
            if (firstUnit) {
                handleModuleClick(firstUnit.unitNumber);
            }
        }
    };

    const isTopicCompleted = (unitNumber: number, subtopicIndex: number) => {
        return progress.completedTopics.includes(`${unitNumber}-${subtopicIndex}`);
    };

    // Calculate module progress
    const getModuleProgress = (unit: Unit) => {
        const completed = unit.subtopics.filter((_, idx) =>
            isTopicCompleted(unit.unitNumber, idx)
        ).length;
        return { completed, total: unit.subtopics.length };
    };

    return (
        <div className="max-w-5xl mx-auto py-12 px-6">
            <div className="mb-12">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">{course.courseTitle}</h1>
                        <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">{course.description}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm min-w-[200px]">
                        <div className="text-sm font-medium text-gray-500 mb-1">Skill Level</div>
                        <div className="text-gray-900 font-semibold mb-3">{course.metadata.skillLevel}</div>

                        <div className="text-sm font-medium text-gray-500 mb-1">Age Group</div>
                        <div className="text-gray-900 font-semibold mb-3">{course.metadata.ageGroup}</div>

                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                            <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Course Progress: {progressPercentage}%</div>
                    </div>
                </div>

                {/* Enrollment / Continue Learning Section */}
                {!progress.isEnrolled ? (
                    <div className="mt-6">
                        <button
                            onClick={handleEnroll}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-[0.98]"
                        >
                            Enroll in Course
                        </button>
                    </div>
                ) : (
                    <div className="mt-6 flex items-center gap-4">
                        <button
                            onClick={handlePickUpWhereLeftOff}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-[0.98] flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {progress.lastVisited ? 'Continue Learning' : 'Start Learning'}
                        </button>
                        <span className="text-sm text-gray-500">
                            {completedCount} of {totalTopics} topics completed
                        </span>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-900">Course Curriculum</h2>
                    <span className="text-sm text-gray-500 font-medium">{course.metadata.estimatedTotalDuration} Total</span>
                </div>

                <div className="divide-y divide-gray-100">
                    {course.units.map((unit) => {
                        const moduleProgress = getModuleProgress(unit);
                        const allCompleted = moduleProgress.completed === moduleProgress.total;

                        return (
                            <div key={unit.unitNumber} className="group">
                                <div className={`flex items-center justify-between px-6 py-5 ${activeUnit === unit.unitNumber ? 'bg-blue-50/50' : ''}`}>
                                    <button
                                        onClick={() => setActiveUnit(activeUnit === unit.unitNumber ? null : unit.unitNumber)}
                                        className="flex items-center gap-4 text-left hover:opacity-80 transition-opacity flex-1"
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors ${
                                            allCompleted
                                                ? 'bg-green-500 border-green-500 text-white'
                                                : activeUnit === unit.unitNumber
                                                    ? 'bg-blue-600 border-blue-600 text-white'
                                                    : 'bg-white border-gray-300 text-gray-500'
                                        }`}>
                                            {allCompleted ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                unit.unitNumber
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`font-semibold text-lg ${activeUnit === unit.unitNumber ? 'text-blue-900' : 'text-gray-900'}`}>{unit.title}</h3>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span>{unit.duration}</span>
                                                <span>•</span>
                                                <span>{moduleProgress.completed}/{moduleProgress.total} topics</span>
                                            </div>
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-3">
                                        {progress.isEnrolled && (
                                            <button
                                                onClick={() => handleModuleClick(unit.unitNumber)}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                Go to Module
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setActiveUnit(activeUnit === unit.unitNumber ? null : unit.unitNumber)}
                                            className="text-gray-400 hover:text-gray-600 p-1"
                                        >
                                            <svg className={`w-5 h-5 transform transition-transform ${activeUnit === unit.unitNumber ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {activeUnit === unit.unitNumber && (
                                    <div className="px-6 pb-6 pt-2 bg-blue-50/30">
                                        <p className="text-gray-600 mb-4 ml-12 text-sm">{unit.description}</p>
                                        <ul className="space-y-2 ml-12">
                                            {unit.subtopics.map((sub, idx) => {
                                                const completed = isTopicCompleted(unit.unitNumber, idx);

                                                return (
                                                    <li key={idx} className="flex items-start gap-3 py-1">
                                                        <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${completed ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'}`}>
                                                            {completed ? (
                                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            ) : (
                                                                <div className="w-2 h-2 rounded-full bg-gray-300" />
                                                            )}
                                                        </div>
                                                        <span className={`text-sm ${completed ? 'text-gray-500' : 'text-gray-700'}`}>{sub}</span>
                                                    </li>
                                                );
                                            })}
                                            <li className="flex items-center gap-3 pt-2">
                                                <div className="w-5 h-5 flex items-center justify-center text-blue-600">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <span className="font-medium text-blue-900 text-sm">Quiz: {unit.quiz.title} ({unit.quiz.questionCount} questions)</span>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
