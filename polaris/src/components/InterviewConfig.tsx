import React, { useState } from 'react';
import { InterviewSettings } from '../types';
import { Cpu, Send, Briefcase, Landmark, Globe, User } from 'lucide-react';

interface InterviewConfigProps {
  onStart: (settings: InterviewSettings) => void;
  isLoading: boolean;
}

export default function InterviewConfig({ onStart, isLoading }: InterviewConfigProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Full Stack Software Engineer');
  const [experienceLevel, setExperienceLevel] = useState('Mid Level');
  const [company, setCompany] = useState('Google');
  const [language, setLanguage] = useState('English');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !company.trim()) return;
    onStart({
      name: name.trim(),
      role: role.trim(),
      experienceLevel,
      company: company.trim(),
      language,
    });
  };

  return (
    <div id="polaris-config-container" className="w-full max-w-2xl mx-auto bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 shadow-2xl relative overflow-hidden">
      {/* Visual neon elements */}
      <div className="absolute top-0 left-1/4 w-96 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
      
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-xs font-mono mb-3">
          <Cpu className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
          SYSTEM CONFIGURATION INITIALIZATION
        </div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Setup Mock Interview</h2>
        <p className="text-slate-400 text-sm mt-2">
          Configure Polaris AI to synthesize professional questions and track your delivery metrics.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Candidate Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-cyan-500" />
              Candidate Name
            </label>
            <div className="relative">
              <input
                id="input-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 rounded-lg py-3 px-4 text-white placeholder-slate-500 text-sm outline-none transition-all"
              />
            </div>
          </div>

          {/* Target Role */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-cyan-500" />
              Target Role
            </label>
            <input
              id="input-role"
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Frontend Engineer, Product Manager"
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 rounded-lg py-3 px-4 text-white placeholder-slate-500 text-sm outline-none transition-all"
            />
          </div>

          {/* Company */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5 text-cyan-500" />
              Target Company
            </label>
            <input
              id="input-company"
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Google, Amazon, OpenAI"
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 rounded-lg py-3 px-4 text-white placeholder-slate-500 text-sm outline-none transition-all"
            />
          </div>

          {/* Language */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-cyan-500" />
              Language
            </label>
            <select
              id="select-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 rounded-lg py-3 px-4 text-white text-sm outline-none transition-all appearance-none"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Mandarin">Mandarin (Chinese)</option>
              <option value="Indonesian">Indonesian</option>
            </select>
          </div>

          {/* Experience level */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              Experience Level
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
              {['Entry Level', 'Mid Level', 'Senior Level', 'Lead / Staff'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  id={`btn-lvl-${lvl.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => setExperienceLevel(lvl)}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-medium font-mono uppercase transition-all tracking-wide ${
                    experienceLevel === lvl
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

        </div>

        <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
          <div className="text-[11px] font-mono text-slate-500 flex flex-col">
            <span>EMULATING POSTGRES ACTIVE</span>
            <span>HOLISTIC MEDIAPIPE PIPELINE AR ON</span>
          </div>

          <button
            id="btn-generate-session"
            type="submit"
            disabled={isLoading || !name.trim() || !role.trim() || !company.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider rounded-lg transition-transform active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                SYNTHESIZING QUESTIONS...
              </>
            ) : (
              <>
                INITIALIZE SIMULATOR
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
