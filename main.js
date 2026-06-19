'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PolarisSetup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    role: '',
    experienceLevel: 'mid',
    language: 'english',
    industry: 'tech',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Polaris Session Initialized:', formData);
    
    // Save setup parameters to sessionStorage so the interview page can read it client-side
    window.sessionStorage.setItem('polaris_config', JSON.stringify(formData));
    
    // Redirect to the new blank interview screen
    router.push('/interview'); 
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header Section */}
        <div className="text-center">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Polaris
          </h1>
          <p className="mt-3 text-sm text-slate-400 tracking-wide uppercase">
            AI Multimodal Interview Mentor
          </p>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-slate-900/60 border border-slate-800 p-8 rounded-2xl backdrop-blur-xl shadow-2xl">
          <div className="space-y-5">
            {/* Target Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-300">
                Target Role / Job Title
              </label>
              <input
                type="text"
                name="role"
                id="role"
                required
                value={formData.role}
                onChange={handleChange}
                placeholder="e.g. Software Engineer, Product Manager"
                className="mt-1 block w-full rounded-lg bg-slate-950 border border-slate-800 px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
              />
            </div>

            {/* Experience Level */}
            <div>
              <label htmlFor="experienceLevel" className="block text-sm font-medium text-slate-300">
                Experience Level
              </label>
              <select
                name="experienceLevel"
                id="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg bg-slate-950 border border-slate-800 px-4 py-2.5 text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
              >
                <option value="intern">Intern / Entry-level</option>
                <option value="mid">Mid-level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Managerial</option>
              </select>
            </div>

            {/* Industry */}
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-slate-300">
                Industry
              </label>
              <select
                name="industry"
                id="industry"
                value={formData.industry}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg bg-slate-950 border border-slate-800 px-4 py-2.5 text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
              >
                <option value="tech">Technology & SaaS</option>
                <option value="finance">Finance & Banking</option>
                <option value="healthcare">Healthcare & Biotech</option>
                <option value="education">Education & Non-profit</option>
                <option value="consulting">Management Consulting</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-slate-300">
                Interview Language
              </label>
              <select
                name="language"
                id="language"
                value={formData.language}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg bg-slate-950 border border-slate-800 px-4 py-2.5 text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
              >
                <option value="english">English</option>
                <option value="indonesian">Indonesian</option>
                <option value="spanish">Spanish</option>
                <option value="mandarin">Mandarin</option>
              </select>
            </div>
          </div>

          {/* Start / Submit Button */}
          <button
            type="submit"
            className="w-full mt-4 flex justify-center items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition active:scale-[0.98]"
          >
            Start Polaris Session
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </form>
        
        <p className="text-center text-xs text-slate-600">
          Polaris processes your video and audio data locally in your browser.
        </p>
      </div>
    </div>
  );
}
