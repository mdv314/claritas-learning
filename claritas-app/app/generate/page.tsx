"use client";

import React, { useState } from 'react';
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

// --- Components ---

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

const GenerateForm = ({ onSubmit, isLoading }: { onSubmit: (data: any) => void, isLoading: boolean }) => {
    const [topic, setTopic] = useState('');
    const [skillLevel, setSkillLevel] = useState('Beginner');
    const [ageGroup, setAgeGroup] = useState('Adult');
    const [notes, setNotes] = useState('');
    const [materials, setMaterials] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('topic', topic);
        formData.append('skill_level', skillLevel);
        formData.append('age_group', ageGroup);
        formData.append('additional_notes', notes);
        formData.append('materials_text', materials);
        if (file) {
            formData.append('file', file);
        }
        onSubmit(formData);
    };

    return (
        <div className="max-w-2xl mx-auto py-16 px-6">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Create Your Course</h1>
                <p className="text-gray-600">Tell us what you want to learn, and we'll design a custom curriculum for you.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-gray-900"
                        placeholder="e.g. Astrophysics, Python Programming, 18th Century History"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white text-gray-900"
                            value={skillLevel}
                            onChange={(e) => setSkillLevel(e.target.value)}
                        >
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Age Group</label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white text-gray-900"
                            value={ageGroup}
                            onChange={(e) => setAgeGroup(e.target.value)}
                        >
                            <option>Child (5-10)</option>
                            <option>Teen (11-17)</option>
                            <option>Adult (18+)</option>
                            <option>Senior</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Related Materials (Optional)</label>
                    <div className="space-y-4">
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all min-h-[100px] text-gray-900"
                            placeholder="Paste structure, syllabus content, or notes here..."
                            value={materials}
                            onChange={(e) => setMaterials(e.target.value)}
                        />
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                />
                                <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    {file ? file.name : "Upload File (PDF, TXT)"}
                                </div>
                            </div>
                            {file && (
                                <button type="button" onClick={() => setFile(null)} className="text-red-500 text-sm hover:underline">Remove</button>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes (Optional)</label>
                    <textarea
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all min-h-[80px] text-gray-900"
                        placeholder="Any specific goals or preferences?"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-4 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20'}`}
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating Course...
                        </span>
                    ) : 'Generate Course Plan'}
                </button>
            </form>
        </div>
    );
};

export default function GeneratePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async (formData: FormData) => {
        setIsLoading(true);
        try {
            const response = await fetch('http://127.0.0.1:5000/generate_course', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("DEBUG: Course Data:", data);

            // Redirect to the course page
            if (data.course_id) {
                router.push(`/course/${data.course_id}`);
            }
        } catch (error) {
            console.error('Failed to generate course:', error);
            alert('Something went wrong. Please check if the backend is running.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa]">
            <Header />
            <GenerateForm onSubmit={handleGenerate} isLoading={isLoading} />
        </div>
    );
}
