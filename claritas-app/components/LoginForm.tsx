import { useState } from "react";
import { 
    Mail, 
    Lock, 
    User, 
    ArrowRight, 
    Github, 
    Chrome, 
    Twitter, 
    Loader2, 
    AlertCircle
} from 'lucide-react';
import { LoginInfo } from "@/types";
import { loginUser } from "@/services/apiService";
import { useAuthMode } from "../app/sign-in/AuthModeContext";

export default function LoginForm() {
    const [loginData, setLoginData] = useState<LoginInfo>({email: '', password: ''})
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { mode, setMode } = useAuthMode();
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoginData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
          const result = await loginUser(loginData)
          console.log('Authentication successful:', { mode: 'login', email: result.user_id });
          const accessToken = "your-jwt-here";
          const expires = new Date();
          expires.setHours(expires.getHours() + 6);

          document.cookie = `access_token=${accessToken}; expires=${expires.toUTCString()}; HttpOnly; Secure; SameSite=Lax; path=/`;
          setSuccess(true);
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="glass rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-white/40">
          {/* Login Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                Welcome Back
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
                Empower your learning journey today.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50/50 backdrop-blur-sm border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-fade-in">
              <AlertCircle size={20} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-500 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input
                  type="email"
                  name="email"
                  required
                  value={loginData.email}
                  onChange={handleInputChange}
                  placeholder="alex@example.com"
                  className="w-full pl-12 pr-4 py-4 bg-white/40 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all backdrop-blur-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs uppercase tracking-widest font-bold text-slate-500">Password</label>
                <button type="button" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                    Forgot?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input
                  type="password"
                  name="password"
                  required
                  value={loginData.password}
                  onChange={handleInputChange}
                  placeholder="Please enter password."
                  className="w-full pl-12 pr-4 py-4 bg-white/40 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all backdrop-blur-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-4 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-indigo-200/50 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-6 shadow-lg shadow-indigo-100"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                <>
                  Sign In Now
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/60"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/40 backdrop-blur-sm px-4 text-slate-400 font-bold tracking-widest">social login</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <button className="flex justify-center items-center py-3.5 px-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm active:scale-95">
              <Chrome size={20} className="text-slate-600" />
            </button>
            <button className="flex justify-center items-center py-3.5 px-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm active:scale-95">
              <Github size={20} className="text-slate-600" />
            </button>
            <button className="flex justify-center items-center py-3.5 px-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm active:scale-95">
              <Twitter size={20} className="text-slate-600" />
            </button>
          </div>

          <div className="text-center">
            <p className="text-slate-500 text-sm font-semibold">
              New to Claritas?
              <button
                onClick={() => setMode("signup")}
                className="text-indigo-600 font-black hover:underline transition-all underline-offset-4 ml-1"
              >
                Create Account
              </button>
            </p>
          </div>
        </div>
    );
}