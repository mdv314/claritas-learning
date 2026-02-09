'use client'
import { useState } from 'react';
import { 
  Sparkles, 
  MapPin, 
  BrainCircuit, 
  Zap, 
  ArrowRight, 
  CheckCircle2,
  Globe
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [selectedState, setSelectedState] = useState('California');
  const states = ['California', 'Texas', 'New York', 'Florida', 'Washington'];

  const curriculumData: Record<string, string[]> = {
    'California': ['NGSS Standards', 'Emphasis on Climate Science', 'Critical Thinking Framework'],
    'Texas': ['TEKS Alignment', 'Strong STEM Foundation', 'Applied Technical Skills'],
    'New York': ['Regents Mastery', 'Humanities Depth', 'Data Analysis Focus'],
    'Florida': ['BEST Standards', 'Civics Integration', 'Practical Literacy'],
    'Washington': ['Environmental Tech', 'Coding Integration', 'Social-Emotional Learning']
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full filter blur-3xl opacity-40 animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-100 rounded-full filter blur-3xl opacity-40 animate-pulse delay-700"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-bold mb-8 animate-fade-in">
            <Sparkles size={16} />
            <span>Powered by Gemini 3.0</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8">
            The Classroom of <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500">
              One.
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 font-medium mb-12 leading-relaxed">
            Claritas uses advanced AI to build custom courses tailored to your interests, 
            while automatically aligning every lesson to your state's specific educational standards.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/sign-in"
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-200 transition-all active:scale-95"
            >
              Generate Your Course
              <ArrowRight size={20} />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Feature Section: State Curriculum Alignment */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="glass p-8 rounded-[2.5rem] border-slate-100 shadow-xl relative">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">State Selector</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Curriculum Bridge</p>
                    </div>
                  </div>
                  <select 
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-3 mb-2">
                      <BrainCircuit className="text-indigo-600" size={18} />
                      <span className="text-sm font-bold text-indigo-900">Gemini Adaptation Logic</span>
                    </div>
                    <p className="text-sm text-indigo-700 font-medium italic">
                      "Re-mapping 'The Great Depression' lesson plan to meet {selectedState} {curriculumData[selectedState][0]}..."
                    </p>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    {curriculumData[selectedState].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm animate-fade-in">
                        <CheckCircle2 className="text-emerald-500" size={18} />
                        <span className="text-sm font-bold text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 p-4 rounded-2xl bg-slate-900 text-white text-sm font-mono overflow-hidden">
                  <div className="flex gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="text-emerald-400">// API response: status 200</div>
                  <div className="text-slate-300">"Aligned curriculum generated for {selectedState}"</div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="text-4xl font-black text-slate-900 mb-6 leading-tight">
                Curriculum that follows <br />
                <span className="text-emerald-600">your laws.</span>
              </h2>
              <p className="text-lg text-slate-600 font-medium mb-8 leading-relaxed">
                Most AI learning tools provide generic content. Claritas is different. 
                Our specialized bridge connects the Gemini API to every state’s educational standards 
                in real-time, ensuring what you learn is recognized by your local district.
              </p>
              <ul className="space-y-4">
                {[
                  '100% Alignment with Common Core & NGSS',
                  'Localized content for all 50 US States',
                  'Dynamic difficulty scaling',
                  'Teacher-verified pedagogy'
                ].map((text, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold text-slate-700">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Zap size={14} className="text-emerald-600" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / Stats Section */}
      <section className="py-20 bg-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-black mb-2">10k+</div>
              <div className="text-indigo-200 font-bold uppercase tracking-widest text-xs">Active Courses</div>
            </div>
            <div>
              <div className="text-4xl font-black mb-2">50/50</div>
              <div className="text-indigo-200 font-bold uppercase tracking-widest text-xs">States Covered</div>
            </div>
            <div>
              <div className="text-4xl font-black mb-2">98%</div>
              <div className="text-indigo-200 font-bold uppercase tracking-widest text-xs">Approval Rate</div>
            </div>
            <div>
              <div className="text-4xl font-black mb-2">2s</div>
              <div className="text-indigo-200 font-bold uppercase tracking-widest text-xs">Generation Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto glass p-12 md:p-20 rounded-[3rem] text-center border-indigo-100 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 text-indigo-100 opacity-20">
            <Globe size={200} strokeWidth={1} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 relative z-10">
            Ready to learn <br />without limits?
          </h2>
          <p className="text-slate-600 text-lg font-medium mb-10 max-w-lg mx-auto relative z-10">
            Join thousands of students who have discovered the power of personalized, 
            AI-driven education.
          </p>
          <Link 
            href='/sign-in'
            className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 hover:scale-105 transition-all shadow-xl shadow-indigo-200 relative z-10"
          >
            Start Your First Course
          </Link>
        </div>
      </section>

      <footer className="py-12 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Sparkles size={16} />
            </div>
            <span className="font-black text-xl text-slate-800 tracking-tighter">Claritas</span>
          </div>
          <div className="flex gap-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Contact</a>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            © 2025 Claritas Learning. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
