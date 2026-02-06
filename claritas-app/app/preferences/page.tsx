'use client';

import React, { useState } from 'react';
import PreferenceForm from '../../components/PreferenceForm';
import { CourseView } from '../../components/CourseView';
import { Loader2, Sparkles } from 'lucide-react';

interface PreferencesContainerProps {
    onBackToHome: () => void;
  }

const PreferencesPage: React.FC<PreferencesContainerProps> = ({ onBackToHome }) => {
    const [courseData, setCourseData] = useState<any | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFormComplete = (data: any) => {
        setCourseData(data);
    };

    // View 1: The Generated Roadmap
    if (courseData && courseData.courseTitle) {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-7xl mx-auto pt-32 animate-fade-in">
                    <CourseView course={courseData} courseId={courseData.course_id} />
                    
                    <div className="flex justify-center pb-32">
                        <button 
                            onClick={() => setCourseData(null)}
                            className="group flex items-center gap-3 text-slate-400 hover:text-indigo-600 transition-all font-black text-[10px] uppercase tracking-[0.2em]"
                        >
                            <span className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-indigo-500 group-hover:bg-white transition-all shadow-sm">
                                ←
                            </span>
                            Modify Pathway Preferences
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // View 2: The Configuration Form (Pathfinder View)
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden height-100 overflow-y-hidden">
            {/* Background Decorative Elements */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-50/50 rounded-full blur-[100px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 pt-32 pb-32 w-full relative z-10">
                
                {/* Pathfinder Header Section */}
                <div className="flex flex-col items-center mb-16 text-center space-y-6 overflow-y-hidden">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm animate-fade-in">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                        </span>
                        Claritas Pathfinder v1.0
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.1] animate-fade-in">
                        Configure Your <br/>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500">
                            Future Roadmap
                        </span>
                    </h1>

                    <p className="text-slate-500 max-w-xl font-medium text-lg leading-relaxed animate-fade-in">
                        We synchronize your academic DNA with state-specific curriculum standards to build a learning experience that truly fits.
                    </p>
                </div>

                <div className="animate-fade-in delay-200">
                    <PreferenceForm
                        onComplete={handleFormComplete}
                        onProcessingChange={setIsProcessing}
                    />

                    {/* Full-screen AI Processing Overlay */}
                    {isProcessing && (
                        <div className="fixed inset-0 bg-white/90 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                            <div className="relative w-40 h-40 flex items-center justify-center mb-12">
                                {/* Rotating Ring */}
                                <div className="absolute inset-0 border-[6px] border-indigo-50 rounded-[3rem]"></div>
                                <div className="absolute inset-0 border-[6px] border-indigo-600 border-t-transparent rounded-[3rem] animate-spin"></div>
                                
                                {/* Inner Floating Elements */}
                                <div className="relative z-10 bg-white p-6 rounded-[2rem] shadow-2xl border border-indigo-50 animate-bounce">
                                  <Sparkles size={48} className="text-indigo-600" />
                                </div>
                                
                                {/* Orbiting Particles */}
                                <div className="absolute -top-4 -right-4 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg animate-pulse">
                                  <Loader2 size={20} className="animate-spin" />
                                </div>
                            </div>
                            
                            <div className="space-y-4 max-w-md">
                                <h3 className="text-4xl font-black text-slate-900 tracking-tight">
                                    Synthesizing DNA...
                                </h3>
                                <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                    Our AI engine is cross-referencing state standards with your learning style to build a master roadmap.
                                </p>
                            </div>
                            
                            <div className="mt-16 flex flex-col items-center gap-4">
                                <div className="flex items-center gap-3 bg-white px-8 py-4 rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-100/50">
                                  <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse"></div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live: Gemini 3.0 Flash Native Audio</span>
                                </div>
                                <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest animate-pulse">
                                    Step 4/4: Standards Alignment
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PreferencesPage;