'use client'
import React, { useEffect, useState } from "react"
import { CalibrationResult, GradeLevel, Question, Result, Subject, UserAnswer } from "@/types";
import { evaluateAssessment, generateAssessmentQuestions } from "@/services/apiService";
import AssessmentResults from "@/components/AssessmentResults";
import AssessmentSelector from "@/components/AssessmentSelector";
import StepIndicator from "@/components/StepIndicator";
import AssessmentQuiz from "@/components/AssessmentQuiz";

enum AppState {
    SETUP,
    QUIZ,
    LOADING_RESULTS,
    RESULTS
}

/* Temporarily taking fake inputs to create self assessment test, connect it with user creation and preferences */
const AssessmentPage: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.SETUP);
    const [grade, setGrade] = useState<GradeLevel>('4th Grade');   
    const [subject, setSubject] = useState<Subject>('Geometry');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null);
    const currentStep = appState;

    useEffect(() => {
      const topic = localStorage.getItem("course_topic");
      const notes = localStorage.getItem("course_notes");
      const materials = localStorage.getItem("course_materials");
    
      if (topic) {
        setSubject(topic as Subject);
      }
  
    }, []);

    const handleStartAssessment = async () => {
      setIsGenerating(true);
      try {
        const generatedQuestions = await generateAssessmentQuestions(grade, subject);
        if (generatedQuestions.length > 0) {
          setQuestions(generatedQuestions);
          console.log(generatedQuestions)
          setAppState(AppState.QUIZ);
        } else {
          alert("We had trouble generating questions. Please try again.");
        }
      } catch (error) {
        console.error(error);
        alert("Something went wrong. Please check your connection.");
      } finally {
        setIsGenerating(false);
      }
      };
    
      const handleQuizComplete = async (answers: UserAnswer[]) => {
        setAppState(AppState.LOADING_RESULTS);
        try {
          const results: Result[] = answers.map(ans => {
            const q = questions.find(question => question.id === ans.questionId);
            return {
              question: q?.question || '',
              answer: ans.selectedOption,
              isCorrect: ans.isCorrect
            };
          });
          
          console.log(results)
          const evaluation = await evaluateAssessment(grade, subject, results);
          setCalibrationResult(evaluation);
          setAppState(AppState.RESULTS);
        } catch (error) {
          console.error(error);
          alert("Failed to evaluate results.");
          setAppState(AppState.QUIZ);
        }
      };
    
      const reset = () => {
        setAppState(AppState.SETUP);
        setQuestions([]);
        setCalibrationResult(null);
      };
    
    
    return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-100 selection:text-indigo-700">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
            <p className="text-slate-500 font-medium">Calibrated Learning Assessments by Gemini AI</p>
            </div>

            <StepIndicator currentStep={currentStep} />

            <main className="transition-all duration-500 transform">

            {appState === AppState.QUIZ && (
                <AssessmentQuiz 
                questions={questions} 
                onComplete={handleQuizComplete} 
                />
            )}

            {appState === AppState.LOADING_RESULTS && (
                <div className="flex flex-col items-center justify-center space-y-6 py-20 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl mx-auto">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-8 h-8 text-indigo-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    </div>
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Analyzing Results...</h3>
                    <p className="text-slate-500">Gemini is calibrating your personalized learning journey.</p>
                </div>
                </div>
            )}

            {appState === AppState.RESULTS && calibrationResult && (
                <AssessmentResults 
                result={calibrationResult} 
                subject={subject} 
                grade={grade} 
                onReset={reset}
                />
            )}
            </main>

            <p className="text-center text-slate-400 text-[10px] uppercase tracking-widest mt-8 font-bold leading-relaxed">
            &copy; 2025 Claritas Learning Inc. <br/>
            Trusted by 10,000+ educators worldwide.
            </p>
        </div>
    </div>
    );
}

export default AssessmentPage;