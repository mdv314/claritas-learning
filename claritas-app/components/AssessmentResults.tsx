import React from 'react';
import { CalibrationResult, Subject, GradeLevel } from '../types';

interface ResultSummaryProps {
  result: CalibrationResult;
  subject: Subject;
  grade: GradeLevel;
  onReset: () => void;
}

const AssessmentResults: React.FC<ResultSummaryProps> = ({ result, subject, grade, onReset }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl mx-auto w-full border border-slate-100">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full mb-4">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800">Calibration Complete</h2>
        <p className="text-slate-500 mt-2">Personalized Analysis for {grade} {subject}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Current Proficiency</h4>
          <div className="text-2xl font-black text-indigo-600">{result.masteryLevel}</div>
          <div className="mt-4 w-full bg-slate-200 h-3 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full" 
              style={{ width: `${result.score}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">Score: {Math.round(result.score)}%</p>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Strengths</h4>
          <ul className="space-y-2">
            {result.strengths.map((s, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-slate-700 text-sm font-medium">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-6 mb-10">
        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
          <h4 className="text-sm font-bold text-orange-800 uppercase tracking-widest mb-2">Areas for Growth</h4>
          <div className="flex flex-wrap gap-2">
            {result.weaknesses.map((w, idx) => (
              <span key={idx} className="bg-white text-orange-700 border border-orange-200 px-3 py-1 rounded-full text-xs font-bold">
                {w}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg">
          <h4 className="text-sm font-bold opacity-80 uppercase tracking-widest mb-2">Recommended Strategy</h4>
          <p className="text-lg font-medium leading-relaxed italic">
            "{result.recommendation}"
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button 
          className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md"
          onClick={() => alert("Redirecting to your custom course... (Placeholder)")}
        >
          Generate My Course
        </button>
        <button 
          className="flex-1 py-4 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all"
          onClick={onReset}
        >
          Retake Assessment
        </button>
      </div>
    </div>
  );
};

export default AssessmentResults;
