import React, { useState, useEffect } from 'react';
import { InterviewSession } from '../types';
import { Calendar, Award, CheckCircle2, Star, Clock, Trash2, ArrowRight } from 'lucide-react';

interface HistoryDashboardProps {
  onBack: () => void;
  onSelectSession: (sess: InterviewSession) => void;
}

export default function HistoryDashboard({ onBack, onSelectSession }: HistoryDashboardProps) {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessionHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const list = await res.json();
      if (Array.isArray(list)) {
        localStorage.setItem("ai_interview_sessions", JSON.stringify(list));
        setSessions(list);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (e) {
      console.warn("Failed retrieving historical database logs from API, falling back to localStorage:", e);
      try {
        const cached = localStorage.getItem("ai_interview_sessions");
        if (cached) {
          setSessions(JSON.parse(cached));
        } else {
          setSessions([]);
        }
      } catch (err) {
        console.error("Failed parsing cached sessions:", err);
        setSessions([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionHistory();
  }, []);

  const clearSessions = async () => {
    if (!window.confirm("Confirm clearing all completed mock history? This is irreversible.")) return;
    try {
      localStorage.removeItem("ai_interview_sessions");
      setSessions([]);
      await fetch("/api/db/clear", { method: "POST" });
    } catch (e) {
      console.warn("Failed clearing database ledger on server, cleared local index successfully:", e);
    }
  };

  const getAvgOverallMetric = () => {
    if (sessions.length === 0) return 0;
    const sum = sessions.reduce((acc, s) => acc + s.overallScore, 0);
    return Math.round(sum / sessions.length);
  };

  return (
    <div id="history-root" className="w-full max-w-5xl mx-auto space-y-6">
      
      {/* Header card with DB statistics */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="text-xs font-mono text-cyan-400 font-bold uppercase mb-1">PROGRES TRACKER SYSTEM</div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Interview History Database</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Logs from your local simulated PostgreSQL answers ledger.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-950/70 border border-slate-850 px-4 py-2.5 rounded-lg text-center">
            <div className="text-[9px] font-mono text-slate-500 uppercase">SESSIONS</div>
            <div className="text-white text-lg font-mono font-bold mt-0.5">{sessions.length} Qty</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-850 px-4 py-2.5 rounded-lg text-center">
            <div className="text-[9px] font-mono text-slate-500 uppercase">AVG RATING</div>
            <div className="text-cyan-400 text-lg font-mono font-bold mt-0.5">{getAvgOverallMetric()}%</div>
          </div>

          <button
            type="button"
            onClick={clearSessions}
            disabled={sessions.length === 0}
            className="p-3 text-rose-400 hover:text-rose-350 border border-slate-800 hover:border-rose-500/30 rounded-lg bg-slate-950/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            title="Clear all sessions list"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid listing */}
      {isLoading ? (
        <div className="p-20 text-center text-slate-500 font-mono text-xs uppercase animate-pulse">
          Querying local session ledger...
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-850 p-20 rounded-xl text-center text-slate-400 space-y-4">
          <Award className="w-10 h-10 text-slate-650 mx-auto" />
          <div>
            <p className="text-white font-bold text-sm">No historical sessions recorded yet!</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Complete your first mock session with live physical and verbal tracking to store results.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2 bg-cyan-500 text-slate-950 rounded font-mono text-xs uppercase font-bold cursor-pointer"
          >
            CONFIGURE NEW SESSION
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((sess, idx) => {
            const dateStr = new Date(sess.date).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return (
              <div 
                key={sess.sessionId}
                id={`session-card-${sess.sessionId}`}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-md relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/5 border border-cyan-400/10 py-0.5 px-2 rounded">
                      {sess.settings?.company || 'TIER-1 CORE'}
                    </span>
                    <span className="text-slate-500 font-mono text-[10px]">{dateStr}</span>
                  </div>

                  <h3 className="text-white font-bold text-base leading-tight mt-1">{sess.settings?.role}</h3>
                  <p className="text-slate-400 text-xs mt-1">Experience Level: {sess.settings?.experienceLevel}</p>
                  
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-850 pt-2.5">
                    <span>Analyzed response nodes</span>
                    <span className="text-cyan-400 font-mono font-semibold">{sess.questions?.length} behavioral questions</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-4">
                  {/* Rating display */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-mono text-[10px] uppercase">SCORE</span>
                    <span className="text-xl font-bold font-mono text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-850">
                      {sess.overallScore}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectSession(sess)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-cyan-400 hover:text-cyan-300 font-mono text-xs font-semibold rounded-lg border border-cyan-500/10 cursor-pointer"
                  >
                    REVIEW LOGS
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sessions.length > 0 && (
        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 text-xs font-mono font-bold uppercase rounded-lg cursor-pointer"
          >
            ← BACK TO CONTROLLER
          </button>
        </div>
      )}

    </div>
  );
}
