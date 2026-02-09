
import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
}

const steps = ["Setup", "Assessment", "Results"];

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  return (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
                index <= currentStep 
                  ? 'bg-indigo-600 border-indigo-600 text-white' 
                  : 'bg-white border-slate-300 text-slate-400'
              }`}
            >
              {index + 1}
            </div>
            <span className={`text-xs mt-2 font-medium ${index <= currentStep ? 'text-indigo-600' : 'text-slate-400'}`}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`h-0.5 w-16 mb-4 transition-all duration-300 ${index < currentStep ? 'bg-indigo-600' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator;
