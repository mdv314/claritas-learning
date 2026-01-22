
import React, { useState } from 'react';
import {
    UserRole,
    EducationLevel,
    PreferenceProfile,
    RecommendationResponse
} from '../types';
import {
    US_STATES,
    K12_GRADES,
    COLLEGE_YEARS,
    COMMON_SUBJECTS,
    LEARNING_STYLES,
    STUDENT_TRAITS
} from '../constants';
import { getLearningRecommendations } from '../services/apiService';

interface Props {
    onComplete: (data: RecommendationResponse) => void;
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

    const totalSteps = 4;
    const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

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
            const result = await getLearningRecommendations(profile);
            onComplete(result);
        } catch (error) {
            alert("Verification failed. Please retry.");
        } finally {
            setLoading(false);
            onProcessingChange(false);
        }
    };

    return (
        <div className="glass-panel rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/50 border border-white/10 max-w-4xl mx-auto">
            {/* Dynamic Header */}
            <div className="px-10 py-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="group relative">
                            <div className={`h-1.5 w-16 rounded-full transition-all duration-700 ${step >= i ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/10'}`} />
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                STAGE {i}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                    Profile Completion: {Math.round((step / totalSteps) * 100)}%
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-10 md:p-14 min-h-[550px] flex flex-col justify-between">
                <div className="flex-1">
                    {step === 1 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-bold text-white tracking-tight">The Journey Begins</h2>
                                <p className="text-slate-400 text-lg">Select your perspective to unlock custom curricula.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[UserRole.STUDENT, UserRole.PARENT].map(role => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setProfile({ ...profile, role })}
                                        className={`relative p-8 rounded-3xl border-2 transition-all group overflow-hidden ${profile.role === role
                                            ? 'border-indigo-500 bg-indigo-500/10 shadow-2xl shadow-indigo-500/20'
                                            : 'border-white/5 hover:border-white/20 bg-white/5'
                                            }`}
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                            {role === UserRole.STUDENT ? <span className="text-8xl">🎓</span> : <span className="text-8xl">👪</span>}
                                        </div>
                                        <div className="relative z-10 flex flex-col items-start text-left gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-white/10 border border-white/10 transition-transform group-hover:scale-110 ${profile.role === role ? 'bg-indigo-500/20 border-indigo-500/50' : ''}`}>
                                                {role === UserRole.STUDENT ? '🎓' : '👪'}
                                            </div>
                                            <div>
                                                <div className={`font-black text-xl ${profile.role === role ? 'text-white' : 'text-slate-300'}`}>I am a {role}</div>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    {role === UserRole.STUDENT ? 'Tailoring content for my personal learning goals.' : 'Managing progress and state standards for my child.'}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Region of Focus</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {US_STATES.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setProfile({ ...profile, state: s })}
                                            className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all ${profile.state === s
                                                ? 'bg-white text-slate-950 border-white'
                                                : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-bold text-white tracking-tight">Level Calibration</h2>
                                <p className="text-slate-400 text-lg">Pinpoint your current academic stage.</p>
                            </div>

                            <div className="flex p-2 bg-white/5 rounded-[2rem] border border-white/10 gap-2">
                                {[EducationLevel.K12, EducationLevel.COLLEGE].map(level => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => setProfile({ ...profile, educationLevel: level, grade: level === EducationLevel.K12 ? K12_GRADES[0] : COLLEGE_YEARS[0] })}
                                        className={`flex-1 py-4 px-6 rounded-[1.5rem] font-black text-sm transition-all ${profile.educationLevel === level ? 'bg-white text-slate-950 shadow-xl' : 'text-slate-500 hover:text-slate-300'
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
                                        className={`p-4 rounded-2xl text-xs font-bold border transition-all text-center leading-tight ${profile.grade === g
                                            ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                            : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20'
                                            }`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 flex items-center gap-6 cursor-pointer group" onClick={() => setProfile(p => ({ ...p, isVerified: !p.isVerified }))}>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${profile.isVerified ? 'bg-indigo-500 text-white rotate-12 scale-110 shadow-lg' : 'bg-white/5 text-slate-600'}`}>
                                    {profile.isVerified ? '🛡️' : '🔘'}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">Official Verification</div>
                                    <p className="text-xs text-slate-500">I confirm this academic level is accurate for state standards.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-bold text-white tracking-tight">Personal Persona</h2>
                                <p className="text-slate-400 text-lg">Define the unique traits of the learner.</p>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {LEARNING_STYLES.map(style => (
                                    <button
                                        key={style.id}
                                        type="button"
                                        onClick={() => setProfile({ ...profile, learningStyle: style.id })}
                                        className={`p-6 rounded-3xl border-2 transition-all flex flex-col gap-4 text-left ${profile.learningStyle === style.id
                                            ? 'border-indigo-500 bg-indigo-500/10 shadow-lg'
                                            : 'border-white/5 bg-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        <span className="text-3xl">{style.icon}</span>
                                        <div>
                                            <div className={`font-black text-sm ${profile.learningStyle === style.id ? 'text-white' : 'text-slate-300'}`}>{style.label}</div>
                                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{style.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Character Attributes</label>
                                <div className="flex flex-wrap gap-2">
                                    {STUDENT_TRAITS.map(trait => (
                                        <button
                                            key={trait}
                                            type="button"
                                            onClick={() => toggleTrait(trait)}
                                            className={`px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all ${profile.traits.includes(trait)
                                                ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/20'
                                                : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'
                                                }`}
                                        >
                                            {trait}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
                            <div className="space-y-2">
                                <h2 className="text-4xl font-bold text-white tracking-tight">Gap Analysis</h2>
                                <p className="text-slate-400 text-lg">Pinpoint specific weaknesses to prioritize.</p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {COMMON_SUBJECTS.map(subject => (
                                    <button
                                        key={subject}
                                        type="button"
                                        onClick={() => toggleWeakness(subject)}
                                        className={`p-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-between ${profile.weaknesses.includes(subject)
                                            ? 'border-pink-500 bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                                            : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20'
                                            }`}
                                    >
                                        {subject}
                                        {profile.weaknesses.includes(subject) && <span>✨</span>}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-6">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Add a custom topic or specific struggle..."
                                        className="w-full bg-white/5 border-2 border-white/5 rounded-[1.5rem] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all font-bold text-white placeholder:text-slate-600"
                                        value={customSubject}
                                        onChange={(e) => setCustomSubject(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), customSubject.trim() && toggleWeakness(customSubject.trim()), setCustomSubject(''))}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <button type="button" onClick={() => (customSubject.trim() && toggleWeakness(customSubject.trim()), setCustomSubject(''))} className="p-3 rounded-xl bg-indigo-500 text-white font-bold text-xs hover:bg-indigo-600 transition-all shadow-lg">ADD</button>
                                    </div>
                                </div>

                                <div className="space-y-3 px-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Academic Narrative</label>
                                    <textarea
                                        placeholder="Describe specific obstacles or long-term dreams..."
                                        className="w-full h-32 bg-white/5 border-2 border-white/5 rounded-[1.5rem] px-8 py-5 focus:outline-none focus:border-purple-500 transition-all font-bold text-white placeholder:text-slate-600 resize-none"
                                        value={profile.customGoals}
                                        onChange={(e) => setProfile({ ...profile, customGoals: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Dynamic Navigation */}
                <div className="flex justify-between items-center pt-10 mt-10 border-t border-white/5">
                    <button
                        type="button"
                        onClick={prevStep}
                        disabled={step === 1 || loading}
                        className={`flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all ${step === 1 || loading ? 'opacity-0 pointer-events-none' : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">←</div>
                        Previous Stage
                    </button>

                    <button
                        type={step === totalSteps ? 'submit' : 'button'}
                        onClick={step === totalSteps ? undefined : nextStep}
                        disabled={loading || (step === 4 && profile.weaknesses.length === 0)}
                        className={`group relative px-12 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all overflow-hidden ${loading || (step === 4 && profile.weaknesses.length === 0)
                            ? 'bg-white/5 text-slate-700 cursor-not-allowed border border-white/5'
                            : 'bg-white text-slate-950 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:-translate-y-1 active:scale-95'
                            }`}
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Processing...
                                </>
                            ) : step === totalSteps ? 'Reveal Blueprint' : 'Advance Stage'}
                            {!loading && <span className="w-5 h-5 rounded-full bg-slate-950 text-white flex items-center justify-center text-[8px]">→</span>}
                        </span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PreferenceForm;
