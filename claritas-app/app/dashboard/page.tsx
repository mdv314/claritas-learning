'use client'
import React from "react"
import { useRouter } from 'next/navigation'

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


  const DashboardPage = () => {
    const router = useRouter();

    const addNewCourse = () => {
      router.push('/dashboard/generate');
    }

    return (
        <div className="relative flex flex-col justify-center items-center min-h-screen py-8">
          <div className="w-full max-w-[1200px] space-y-8">
            <div className="flex justify-between items-end border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">My Dashboard</h2>
                <p className="text-slate-500 mt-2 font-medium">Manage your personalized learning paths and progress.</p>
              </div>
              <button
                onClick={addNewCourse}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>New Calibration</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl p-16 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-400 mb-6">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No learning paths yet</h3>
              <p className="text-slate-500 max-w-sm mb-8">
                Complete a self-assessment to generate a custom-tailored course path based on your current knowledge.
              </p>
              <button
                className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors"
              >
                Start your first assessment &rarr;
              </button>
            </div>

            {/*courses.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-400 mb-6">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No learning paths yet</h3>
                <p className="text-slate-500 max-w-sm mb-8">
                  Complete a self-assessment to generate a custom-tailored course path based on your current knowledge.
                </p>
                <button
                  onClick={onAddNew}
                  className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors"
                >
                  Start your first assessment &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div 
                    key={course.course_id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded tracking-wider uppercase">
                        {course.metadata.skillLevel}
                      </span>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                      <button className="text-indigo-600 font-bold hover:underline">Resume &rarr;</button>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={onAddNew}
                  className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-400 transition-all min-h-[240px]"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center mb-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="font-bold">Add Another Subject</span>
                </button>
              </div>
            )*/}
          </div>
          
        </div>
      );
}

export default DashboardPage;