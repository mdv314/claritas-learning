'use client'
import React, { useContext, useEffect, useState } from 'react';
import {
    UserRole,
    EducationLevel,
    PreferenceProfile,
    UserInformation,
    UserPreferences
} from '../types';
import {
    US_STATES,
    K12_GRADES,
    COLLEGE_YEARS,
    COMMON_SUBJECTS,
    LEARNING_STYLES,
    STUDENT_TRAITS
} from '../constants';
import { ChevronLeft, ChevronRight, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SessionContext } from "@/context/SessionContext";
import { createUser } from '@/services/apiService';

interface Props {
    onComplete: (data: any) => void;
    onProcessingChange: (status: boolean) => void;
}

const PreferenceForm: React.FC<Props> = ({ onComplete, onProcessingChange }) => {
    const [step, setStep] = useState(1);
    const [profile, setProfile] = useState<PreferenceProfile>({
        role: UserRole.STUDENT,
        state: 'California',
        educationLevel: EducationLevel.K12,
        grade: '9th Grade (Freshman)',
        isVerified: true,
        learningStyle: 'visual',
        traits: [],
        weaknesses: [],
        customGoals: ''
    });
    const [loading, setLoading] = useState(false);
    const [customSubject, setCustomSubject] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const router = useRouter();
    const session = useContext(SessionContext);

    const totalSteps = 4;
    const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps + 1));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    useEffect(() => {
        if (session == null) {
            router.push('/')
        } else {
            console.log(session.email)
        }
    })

    const toggleTrait = (trait: string) => {
        setProfile(prev => ({
            ...prev,
            traits: prev.traits.includes(trait) ? prev.traits.filter(t => t !== trait) : [...prev.traits, trait]
        }));
    };

    const toggleWeakness = (subject: string) => {
        setProfile(prev => ({
            ...prev,
            weaknesses: prev.weaknesses.includes(subject) ? prev.weaknesses.filter(s => s !== subject) : [...prev.weaknesses, subject]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        onProcessingChange(true);

        try {
            if (session) {
                const userInformation: UserInformation = {
                    name: session.name!,
                    email: session.email!,
                    password: session.password!,
                };

                const userPrefs: UserPreferences = {
                    role: profile.role,
                    educationLevel: profile.educationLevel,
                    grade: profile.grade,
                    state: profile.state,
                    traits: profile.traits.join(','), // or keep as array if your backend expects array
                    learningStyle: profile.learningStyle,
                };

                const result = await createUser(userInformation, userPrefs);

                // ✅ result is the JSON returned by your API
                if (result.error) {
                    throw new Error(result.error);
                }

                router.push('/dashboard');
            } else {
                router.push('/sign-in');
            }
        } catch (error: any) {
            console.error("Course Generation Error:", error);
            alert(error.message || "The AI engine failed to synthesize your roadmap.");
        } finally {
            setLoading(false);
            onProcessingChange(false);
        }
    };


    return (
        <div className="glass rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-100 border border-white/60 max-w-4xl width-100 mx-auto overflow-y-hidden">
            {/* Steps Progress Header */}
            <div className="px-10 py-8 border-b border-slate-100 bg-white/40 flex items-center justify-between">
                <div className="flex gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="group relative">
                            <div className={`-translate-x-1/2 ml-8 text-[10px] font-black text-indigo-600 tracking-widest transition-opacity duration-300 ${step === i ? 'opacity-100' : 'opacity-0'}`}>
                                STEP {i}
                            </div>
                            <div className={`h-2 w-16 rounded-full transition-all duration-700 ${step >= i ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-200'}`} />
                        </div>
                    ))}
                </div>
                <div className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                    Profile: {Math.round((step / (totalSteps - 1)) * 100)}% Complete
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 md:p-14 min-h-[600px] flex flex-col justify-between">
                <div className="flex-1">
                    {/* Step 1: Role & Region */}
                    {step === 1 && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">Identify Your <br /><span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">Perspective</span></h2>
                                <p className="text-slate-500 text-lg font-medium">Select your role to unlock localized curricula.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[UserRole.STUDENT, UserRole.PARENT].map(role => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setProfile({ ...profile, role })}
                                        className={`relative p-8 rounded-3xl border-2 transition-all text-left group overflow-hidden ${profile.role === role
                                            ? 'border-indigo-600 bg-indigo-50/50 shadow-xl shadow-indigo-100'
                                            : 'border-slate-100 bg-white hover:border-indigo-200'
                                            }`}
                                    >
                                        <div className="relative z-10 flex flex-col items-start gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all ${profile.role === role ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                                {role === UserRole.STUDENT ? '🎓' : '👪'}
                                            </div>
                                            <div>
                                                <div className="font-black text-xl text-slate-800">I am a {role}</div>
                                                <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">
                                                    {role === UserRole.STUDENT
                                                        ? 'I want to build a personal learning roadmap for my own goals.'
                                                        : 'I am managing standards and progress for my child.'}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">State or Territory</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-h-[160px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                                    {US_STATES.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setProfile({ ...profile, state: s })}
                                            className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all ${profile.state === s
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Education Level & Grade */}
                    {step === 2 && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">Academic <br /><span className="text-indigo-600">Calibration</span></h2>
                                <p className="text-slate-500 text-lg font-medium">Where are you in your learning journey?</p>
                            </div>

                            <div className="flex p-2 bg-slate-100 rounded-[2rem] gap-2">
                                {[EducationLevel.K12, EducationLevel.COLLEGE].map(level => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => setProfile({ ...profile, educationLevel: level, grade: level === EducationLevel.K12 ? K12_GRADES[0] : COLLEGE_YEARS[0] })}
                                        className={`flex-1 py-4 px-6 rounded-[1.5rem] font-black text-sm transition-all ${profile.educationLevel === level ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {(profile.educationLevel === EducationLevel.K12 ? K12_GRADES : COLLEGE_YEARS).map(g => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setProfile({ ...profile, grade: g })}
                                        className={`p-4 rounded-2xl text-xs font-bold border transition-all text-center leading-tight h-16 flex items-center justify-center ${profile.grade === g
                                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                            : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'
                                            }`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center gap-6 cursor-pointer group" onClick={() => setProfile(p => ({ ...p, isVerified: !p.isVerified }))}>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${profile.isVerified ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'bg-white text-slate-300 border border-slate-100'}`}>
                                    {profile.isVerified ? <CheckCircle2 size={24} /> : <div className="w-6 h-6 rounded-full border-2 border-slate-200" />}
                                </div>
                                <div className="flex-1">
                                    <div className="font-black text-slate-800">Verify Academic Integrity</div>
                                    <p className="text-xs text-slate-500 font-medium">Align course difficulty to real-world educational standards.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Learning Style & Traits */}
                    {step === 3 && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">Personal <br /><span className="text-indigo-600">Cognition</span></h2>
                                <p className="text-slate-500 text-lg font-medium">How do you process new information?</p>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {LEARNING_STYLES.map(style => (
                                    <button
                                        key={style.id}
                                        type="button"
                                        onClick={() => setProfile({ ...profile, learningStyle: style.id })}
                                        className={`p-6 rounded-3xl border-2 transition-all flex flex-col gap-4 text-left ${profile.learningStyle === style.id
                                            ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                            : 'border-slate-100 bg-white hover:border-indigo-200'
                                            }`}
                                    >
                                        <span className="text-3xl">{style.icon}</span>
                                        <div>
                                            <div className="font-black text-sm text-slate-800">{style.label}</div>
                                            <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">{style.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Learning Traits</label>
                                <div className="flex flex-wrap gap-2">
                                    {STUDENT_TRAITS.map(trait => (
                                        <button
                                            key={trait}
                                            type="button"
                                            onClick={() => toggleTrait(trait)}
                                            className={`px-5 py-3 rounded-2xl text-xs font-bold border transition-all ${profile.traits.includes(trait)
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100'
                                                : 'bg-white border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200'
                                                }`}
                                        >
                                            {trait}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Bar */}
                <div className="flex justify-between items-center pt-10 mt-10 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={prevStep}
                        disabled={step === 1 || loading}
                        className={`flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all ${step === 1 || loading ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-slate-800'
                            }`}
                    >
                        <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-50"><ChevronLeft size={18} /></div>
                        Back
                    </button>

                    <button
                        type={step === totalSteps ? 'submit' : 'button'}
                        onClick={step === totalSteps ? undefined : nextStep}
                        disabled={loading}
                        className={`group relative px-10 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all ${loading
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-transparent'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 active:scale-95'
                            }`}
                    >
                        <span className="flex items-center gap-3">
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Synthesizing...
                                </>
                            ) : (
                                <>
                                    {step === totalSteps ? (isAuthenticated ? 'Generate Course' : 'Sign In to Generate Course') : 'Continue'}
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PreferenceForm;
