
import React, { useState } from 'react';
import { Question, UserAnswer } from '../types';

interface AssessmentQuizProps {
  questions: Question[];
  onComplete: (answers: UserAnswer[]) => void;
}

const AssessmentQuiz: React.FC<AssessmentQuizProps> = ({ questions, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);

  const currentQuestion = questions[currentIndex];

  const handleNext = () => {
    if (selectedOption === null) return;

    const newAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      selectedOption: selectedOption,
      isCorrect: selectedOption === currentQuestion.correctAnswer
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(newAnswers);
    }
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto w-full border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm font-bold text-indigo-600 uppercase tracking-wider">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
          currentQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
          currentQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {currentQuestion.difficulty}
        </span>
      </div>

      <div className="w-full bg-slate-100 h-2 rounded-full mb-8 overflow-hidden">
        <div 
          className="bg-indigo-600 h-full transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        />
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-8 leading-snug">
        {currentQuestion.question}
      </h3>

      <div className="space-y-4 mb-10">
        {currentQuestion.options.map((option) => (
          <button
            key={option}
            onClick={() => setSelectedOption(option)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              selectedOption === option 
                ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm' 
                : 'border-slate-100 hover:border-slate-300 bg-white text-slate-700'
            }`}
          >
            <div className="flex items-center">
              <div className={`w-5 h-5 rounded-full border-2 mr-4 flex-shrink-0 flex items-center justify-center ${
                selectedOption === option ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
              }`}>
                {selectedOption === option && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className="font-medium">{option}</span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={selectedOption === null}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {currentIndex === questions.length - 1 ? "Finish Assessment" : "Next Question"}
      </button>
    </div>
  );
};

export default AssessmentQuiz;
