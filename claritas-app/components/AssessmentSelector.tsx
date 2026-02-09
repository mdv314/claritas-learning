
import React from 'react';
import { GradeLevel, KnownSubject, Subject } from '../types';

interface SubjectGradeSelectorProps {
  grade: GradeLevel;
  subject: Subject;
  customTopic?: string;
  onGradeChange: (grade: GradeLevel) => void;
  onSubjectChange: (subject: Subject) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const grades: { label: string; items: GradeLevel[] }[] = [
  {
    label: 'K-12',
    items: ['1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade',
      '6th Grade', '7th Grade', '8th Grade', 'High School'],
  },
  {
    label: 'Higher Education & Professional',
    items: ['College', 'Early Career', 'Mid Career', 'Senior/Expert'],
  },
];

const knownSubjects: KnownSubject[] = [
  'Mathematics', 'Geometry', 'Algebra', 'Science', 'Biology',
  'Physics', 'History', 'Literature', 'Computer Science'
];

const AssessmentSelector: React.FC<SubjectGradeSelectorProps> = ({
  grade, subject, customTopic, onGradeChange, onSubjectChange, onSubmit, isLoading
}) => {
  const isCustomTopic = customTopic && !knownSubjects.includes(customTopic as KnownSubject);
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto w-full border border-slate-100">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Start Your Assessment</h2>
      <p className="text-slate-600 mb-8 text-center leading-relaxed">
        Tell us about your learning level and the subject you'd like help with. 
        Our AI will generate a personalized self-assessment to find the perfect starting point for your course.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Experience Level</label>
          {grades.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">{group.label}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {group.items.map((g) => (
                  <button
                    key={g}
                    onClick={() => onGradeChange(g)}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      grade === g
                        ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>

          {isCustomTopic && (
            <div className="mb-4">
              <button
                onClick={() => onSubjectChange(customTopic)}
                className={`w-full py-3 px-4 rounded-lg text-sm font-bold transition-all ${
                  subject === customTopic
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {customTopic}
              </button>
              <p className="text-xs text-slate-400 mt-3 mb-1">Or choose a common subject:</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {knownSubjects.map((s) => (
              <button
                key={s}
                onClick={() => onSubjectChange(s)}
                className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  subject === s
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Generating Assessment...</span>
            </>
          ) : (
            <span>Begin Assessment</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default AssessmentSelector;
