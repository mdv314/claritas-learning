'use client'
import React, { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { getUserCourses } from '@/services/apiService'

interface EnrolledCourse {
  id: string;
  course_id: string;
  course_title: string;
  course_description: string;
  skill_level: string;
  age_group: string;
  estimated_duration: string;
  enrolled_at: string;
  completed_topics: string[];
  last_visited: string | null;
  is_completed: boolean;
}

const DashboardPage = () => {
  const router = useRouter();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await getUserCourses();
        setCourses(data.courses || []);
      } catch (err) {
        console.warn('Could not fetch courses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

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
            <span>New Course</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-400 mb-6">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No learning paths yet</h3>
            <p className="text-slate-500 max-w-sm mb-8">
              Generate a custom-tailored course to get started with your personalized learning journey.
            </p>
            <button
              onClick={addNewCourse}
              className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors"
            >
              Create your first course &rarr;
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const completedCount = course.completed_topics?.length || 0;
              // We don't have total topics in the denormalized data, so show count
              return (
                <div
                  key={course.id}
                  onClick={() => router.push(`/dashboard/course/${course.course_id}`)}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded tracking-wider uppercase">
                      {course.skill_level}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-2">{course.course_title}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{course.course_description}</p>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                    {course.estimated_duration && (
                      <span>{course.estimated_duration}</span>
                    )}
                    {course.is_completed && (
                      <span className="text-green-600 font-semibold">Completed</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{completedCount} topic{completedCount !== 1 ? 's' : ''} completed</span>
                    <span className="text-indigo-600 font-bold group-hover:underline">Resume &rarr;</span>
                  </div>
                </div>
              );
            })}

            <button
              onClick={addNewCourse}
              className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-400 transition-all min-h-[240px]"
            >
              <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="font-bold">Add Another Course</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
