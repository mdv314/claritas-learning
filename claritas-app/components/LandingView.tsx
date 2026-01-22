
import React from 'react';

interface LandingProps {
    onStart: () => void;
}

const LandingView: React.FC<LandingProps> = ({ onStart }) => {
    return (
        <div className="space-y-32">
            {/* Hero Section */}
            <section className="flex flex-col items-center text-center gap-10 py-12 md:py-24">
                <div className="space-y-6 max-w-4xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-bold uppercase tracking-[0.2em] animate-in fade-in slide-in-from-top-4 duration-1000">
                        Intelligent Curriculum Synthesis
                    </div>
                    <h1 className="text-6xl md:text-[8rem] font-black text-white leading-[0.9] tracking-tighter animate-in fade-in zoom-in-95 duration-1000 delay-200">
                        Master Every <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-300 to-slate-500">Academic Gap.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                        Hyper-personalized learning material aligned with your specific state standards and unique cognitive profile.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                    <button
                        onClick={onStart}
                        className="group relative px-12 py-6 rounded-[2rem] bg-indigo-600 text-white font-black uppercase tracking-widest text-sm hover:bg-indigo-500 transition-all hover:shadow-[0_0_50px_rgba(99,102,241,0.4)] active:scale-95 overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            Initialize Blueprint
                            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] group-hover:translate-x-1 transition-transform">→</span>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </button>

                    <button className="px-12 py-6 rounded-[2rem] glass-panel text-white font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all border border-white/10">
                        View K-12 Stats
                    </button>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    {
                        title: "State Standard Precision",
                        desc: "Whether it's TEKS, Common Core, or NYS Regents, we map every lesson to your local board requirements.",
                        icon: "🏛️",
                        color: "from-blue-500/20 to-indigo-500/20"
                    },
                    {
                        title: "Declining Score Recovery",
                        desc: "Our AI identifies specific sub-topics where state proficiency is dropping and prioritizes recovery drills.",
                        icon: "📈",
                        color: "from-purple-500/20 to-pink-500/20"
                    },
                    {
                        title: "Persona-Based Design",
                        desc: "We don't just teach subjects; we adapt to your learning DNA—whether you're visual, auditory, or hands-on.",
                        icon: "🧬",
                        color: "from-orange-500/20 to-amber-500/20"
                    }
                ].map((feature, i) => (
                    <div key={i} className={`group glass-panel p-10 rounded-[3rem] border border-white/5 space-y-6 hover:border-white/20 transition-all hover:-translate-y-2 cursor-default relative overflow-hidden`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity blur-3xl`}></div>
                        <div className="relative z-10 space-y-6">
                            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl group-hover:rotate-6 transition-transform">
                                {feature.icon}
                            </div>
                            <h3 className="text-2xl font-black text-white">{feature.title}</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
                        </div>
                    </div>
                ))}
            </section>

            {/* Social Proof / Stats */}
            <section className="glass-panel rounded-[4rem] p-12 md:p-20 border border-white/5 flex flex-col md:flex-row items-center gap-16 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full"></div>
                <div className="flex-1 space-y-6 text-center md:text-left">
                    <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                        Built for the future <br /> of <span className="text-indigo-400">education.</span>
                    </h2>
                    <p className="text-slate-400 text-lg font-medium max-w-xl">
                        Currently utilized across all 50 states to help parents and students bridge the gap between classroom teaching and state exam success.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-8 w-full md:w-auto">
                    {[
                        { val: "50k+", label: "Daily Paths" },
                        { val: "100%", label: "Alignment" },
                        { val: "22%", label: "Score Lift" },
                        { val: "AI", label: "Optimized" }
                    ].map((stat, i) => (
                        <div key={i} className="space-y-1">
                            <div className="text-3xl font-black text-white">{stat.val}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default LandingView;
