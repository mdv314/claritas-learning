'use client'
import React from 'react';
import { AuthModeProvider, useAuthMode } from "./AuthModeContext";
import LoginForm from '@/components/LoginForm';
import SignUpForm from '@/components/SignUpForm';


const SignInPage: React.FC = () => {
  return (
    <AuthModeProvider>
      <SignInContent />
    </AuthModeProvider>
  )
}

const SignInContent: React.FC = () => {
  const { mode } = useAuthMode();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-200 via-slate-50 to-emerald-100">

      {/* Background Orbs */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>

      <div className="w-full max-w-md animate-fade-in relative z-10 pt-20">
          {mode === 'login' ? (
            <LoginForm />
          ) : (
            <SignUpForm />
          )}
        
        <p className="text-center text-slate-400 text-[10px] uppercase tracking-widest mt-8 font-bold leading-relaxed">
          &copy; 2025 Claritas Learning Inc. <br/>
          Trusted by 10,000+ educators worldwide.
        </p>
      </div>
    </div>
  );
};

export default SignInPage;