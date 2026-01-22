import React from 'react';
import { RecommendationResponse } from '../types';

interface Props {
    recommendations: RecommendationResponse;
    onBack: () => void;
}

const ResultsView: React.FC<Props> = ({ recommendations, onBack }) => {
    return (
        <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
            <div className="glass-panel rounded-[3rem] p-10 md:p-16 border border-white/10 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <div className="w-96 h-96 bg-indigo-500 rounded-full blur-[100px]"></div>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-12 items-start">
                    <div className="flex-1 space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                            Blueprint Generated Successfully
                        </div>

                        <h2 className="text-5xl md:text-6xl font-black text-white leading-none tracking-tighter">
                            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Personalized</span> Path is Ready.
                        </h2>

                        <p className="text-xl text-slate-400 leading-relaxed font-medium">
                            {recommendations.summary}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                            {/* Focus Areas Bento */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                                    <span className="w-8 h-[1px] bg-slate-800"></span> Primary Objectives
                                </h3>
                                <div className="space-y-3">
                                    {recommendations.suggestedFocusAreas.map((area, idx) => (
                                        <div key={idx} className="group flex items-center gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/10 transition-all cursor-default">
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                                                0{idx + 1}
                                            </div>
                                            <span className="text-slate-200 font-bold group-hover:text-white transition-colors">{area}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* State Alignment Bento */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                                    <span className="w-8 h-[1px] bg-slate-800"></span> Governance Alignment
                                </h3>
                                <div className="h-full rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white flex flex-col justify-between shadow-2xl shadow-indigo-500/20 group">
                                    <div className="space-y-6">
                                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl group-hover:rotate-12 transition-transform">🏛️</div>
                                        <div>
                                            <h4 className="text-2xl font-black mb-3">State Standards</h4>
                                            <p className="text-indigo-100 text-sm leading-relaxed font-medium opacity-90">
                                                {recommendations.stateStandardNote}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-8 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-indigo-200 bg-white/10 px-4 py-2 rounded-full w-fit border border-white/10">
                                        Curriculum Verified ✓
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-10 flex flex-col sm:flex-row gap-4">
                            <button className="flex-1 px-10 py-5 rounded-[2rem] bg-white text-slate-950 font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-white/10">
                                Initiate Learning Cycle
                            </button>
                            <button
                                onClick={onBack}
                                className="px-10 py-5 rounded-[2rem] bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all active:scale-95"
                            >
                                Refactor Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { icon: '📉', title: 'District Recovery', desc: 'Auto-adapting to declining regional test scores.' },
                    { icon: '🧬', title: 'Adaptive DNA', desc: 'The curriculum mutates based on your persona.' },
                    { icon: '✅', title: 'Goal Locked', desc: 'Priority given to your custom stated ambitions.' }
                ].map((item, i) => (
                    <div key={i} className="glass-panel p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-4 group hover:bg-white/10 transition-all">
                        <div className="text-4xl group-hover:scale-110 transition-transform origin-left">{item.icon}</div>
                        <div>
                            <h5 className="font-black text-white text-lg">{item.title}</h5>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResultsView;
