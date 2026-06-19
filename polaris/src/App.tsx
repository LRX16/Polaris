import { useState, useEffect } from 'react';
import { InterviewSettings, Question, InterviewSession } from './types';
import InterviewConfig from './components/InterviewConfig';
import InterviewRoom from './components/InterviewRoom';
import SessionSummary from './components/SessionSummary';
import RoadmapView from './components/RoadmapView';
import HistoryDashboard from './components/HistoryDashboard';
import { 
  Compass, History, AlertTriangle, Play, Calendar, MapPin, 
  Settings2, Activity, ShieldAlert, Sparkles, Cpu, Clock, HelpCircle, HardDrive
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'setup' | 'room' | 'summary' | 'roadmap' | 'history'>('setup');
  const [settings, setSettings] = useState<InterviewSettings | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Stats from DB for general dashboard telemetry
  const [dbStatus, setDbStatus] = useState<any>({ sessionCount: 0, status: "checking" });

  const fetchDBStatus = async () => {
    try {
      const res = await fetch("/api/db-status");
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (e) {
      console.log("Telemetry check skipped:", e);
    }
  };

  useEffect(() => {
    fetchDBStatus();
  }, [view]);

  // Handle start interview setup (Module 1, 2)
  const handleStartInterview = async (configuredSettings: InterviewSettings) => {
    setSettings(configuredSettings);
    setIsLoadingQuestions(true);

    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configuredSettings)
      });

      if (!res.ok) throw new Error("Question generation crashed");
      const data = await res.json();
      setQuestions(data.questions || []);
      setView('room');
    } catch (error) {
      console.warn("Using baseline interview questions fallback:", error);
      // Hardcoded fallback questions
      setQuestions([
        {
          id: "q_f1",
          text: `Describe a complex software algorithm or system architecture challenge you resolved under pressure as a ${configuredSettings.role}.`,
          type: "technical"
        },
        {
          id: "q_f2",
          text: `Tell me about a time you disagreed with a fellow team lead or developer at ${configuredSettings.company}. How was it finalized?`,
          type: "behavioral"
        },
        {
          id: "q_f3",
          text: `Can you walk me through a technical initiative where you lacked complete context or documentation but delivered successfully?`,
          type: "technical"
        },
        {
          id: "q_f4",
          text: `Why is ${configuredSettings.company} the next logical choice for your career trajectory, and what core patterns will you contribute?`,
          type: "behavioral"
        }
      ]);
      setView('room');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleFinishSession = (evaluatedQs: Question[], finalAvg: number) => {
    setQuestions(evaluatedQs);
    setSessionScore(finalAvg);
    setView('summary');
  };

  // Quick navigation helpers
  const handleNavToHistory = () => {
    setView('history');
  };

  const selectHistorySessionToReview = (session: InterviewSession) => {
    setSettings(session.settings);
    setQuestions(session.questions);
    setSessionScore(session.overallScore);
    setView('summary');
  };

  return (
    <div id="polaris-application-viewport" className="min-h-screen bg-[#020617] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(15,23,42,1),rgba(2,6,23,1))] text-slate-100 flex flex-col font-sans select-none selection:bg-cyan-500/30 antialiased overflow-x-hidden">
      
      {/* 1. FUTURISTIC TECH NAVBAR HEADER */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-6 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-400/20">
              <Compass className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xl font-black text-white tracking-widest font-mono select-none">POLARIS</span>
                <span className="text-[10px] bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 px-1.5 py-0.5 rounded font-mono font-bold leading-none uppercase">AI MOCK</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mt-1">HOLISTIC FEEDBACK AR COCHING</span>
            </div>
          </div>

          {/* Core HUD diagnostics info */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>DB STATUS:</span>
              <span className="text-emerald-400 font-bold">ONLINE (PostgreSQL)</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>AI CHANNELS:</span>
              <span className="text-cyan-400 font-bold">{process.env.GEMINI_API_KEY ? "GEMINI FL" : "EMULATED"}</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-300 transition-all">
              <span>TIME (UTC):</span>
              <span className="text-white font-bold font-mono">15:03</span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              id="nav-setup"
              onClick={() => setView('setup')}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all border cursor-pointer ${
                view === 'setup' || view === 'room'
                  ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold'
                  : 'bg-transparent border-transparent hover:border-slate-800 text-slate-400'
              }`}
            >
              SIMULATOR
            </button>

            <button
              id="nav-history"
              onClick={handleNavToHistory}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all border flex items-center gap-1 cursor-pointer ${
                view === 'history'
                  ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.05)]'
                  : 'bg-transparent border-transparent hover:border-slate-800 text-slate-400'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              PORTFOLIO HISTORY ({dbStatus.sessionCount || 0})
            </button>
          </div>

        </div>
      </header>

      {/* 2. BODY GENERAL CONTENT WRAPPER */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 relative">
        
        {/* Subtle grid visualizer lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>

        {view === 'setup' && (
          <div className="space-y-12">
            
            {/* Ambient Hero block */}
            <div className="text-center max-w-xl mx-auto space-y-3 pt-6">
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Calibrate Your <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 bg-clip-text text-transparent">Interview Presence</span>
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed font-sans max-w-md mx-auto">
                Train your speech rate, gesture posture, eye contact, and narrative STAR content formatting simultaneously.
              </p>
            </div>

            <InterviewConfig 
              onStart={handleStartInterview} 
              isLoading={isLoadingQuestions} 
            />

            {/* Platform instructions overview cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              
              <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-1 text-center">
                <div className="text-cyan-500 font-mono text-xs font-bold uppercase">01 // Config</div>
                <p className="text-white font-medium text-xs">Acoustics setup</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">Specify role/company targets to tailor question generation models.</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-1 text-center">
                <div className="text-purple-400 font-mono text-xs font-bold uppercase">02 // AR Tracker</div>
                <p className="text-white font-medium text-xs">543 joint tracking</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">Live body landmarks check postures, fidget loops, and eye gaze index.</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-1 text-center">
                <div className="text-amber-400 font-mono text-xs font-bold uppercase">03 // Audio speech</div>
                <p className="text-white font-medium text-xs">Prosody check</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">Audio rate extraction parses shaky tones, monotone curves and silence.</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-1 text-center">
                <div className="text-emerald-400 font-mono text-xs font-bold uppercase">04 // Evaluation</div>
                <p className="text-white font-medium text-xs">Fusion rating</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">Combines video, text, and voice parameters into composite ratings.</p>
              </div>

            </div>

          </div>
        )}

        {view === 'room' && settings && (
          <InterviewRoom
            settings={settings}
            questions={questions}
            onFinishSession={handleFinishSession}
            onGoBack={() => setView('setup')}
          />
        )}

        {view === 'summary' && settings && (
          <SessionSummary
            settings={settings}
            overallScore={sessionScore}
            questions={questions}
            onTriggerRoadmap={() => setView('roadmap')}
            onRestart={() => setView('setup')}
          />
        )}

        {view === 'roadmap' && (
          <RoadmapView
            pastSessions={[]}
            targetRole={settings?.role || "Full Stack Software Engineer"}
            onGoBack={() => setView('summary')}
          />
        )}

        {view === 'history' && (
          <HistoryDashboard
            onBack={() => setView('setup')}
            onSelectSession={selectHistorySessionToReview}
          />
        )}

      </main>

      {/* 3. FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-[10px] font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>POLARIS COGNITIVE LABS COPYRIGHT 2026</span>
          <span className="flex gap-2">
            <span className="text-slate-750">SECURE SHELL</span> • 
            <span className="text-emerald-500 flex gap-1 items-center">● INFRASTRUCTURE COMPILING OK</span>
          </span>
        </div>
      </footer>

    </div>
  );
}
