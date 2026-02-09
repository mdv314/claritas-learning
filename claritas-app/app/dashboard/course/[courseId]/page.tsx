"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CourseView } from '@/components/CourseView';
import { API_BASE_URL } from '@/lib/apiConfig';

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
    course_id: string;
    courseTitle: string;
    description: string;
    metadata: CourseMetadata;
    units: Unit[];
}

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

export default function CoursePage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const [course, setCourse] = useState<CoursePlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/course/${courseId}`);
                if (!response.ok) {
                    throw new Error('Course not found');
                }
                const data = await response.json();
                setCourse(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load course');
            } finally {
                setIsLoading(false);
            }
        };

        if (courseId) {
            fetchCourse();
        }
    }, [courseId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#fafafa]">
                <Header />
                <div className="flex items-center justify-center py-24">
                    <div className="flex items-center gap-3 text-gray-500">
                        <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading course...
                    </div>
                </div>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="min-h-screen bg-[#fafafa]">
                <Header />
                <div className="flex flex-col items-center justify-center py-24">
                    <div className="text-red-500 mb-4">Course not found</div>
                    <a href="/generate" className="text-blue-600 hover:underline">Create a new course</a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa]">
            <Header />
            <CourseView course={course} courseId={courseId} />
        </div>
    );
}
