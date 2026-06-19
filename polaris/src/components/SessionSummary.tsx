import React, { useState } from 'react';
import { Question, InterviewSettings } from '../types';
import { 
  Sparkles, Award, ShieldAlert, CheckCircle2, AlertCircle, ChevronDown, 
  ChevronUp, Play, BookOpen, Map, RefreshCw, BarChart2, Star
} from 'lucide-react';

interface SessionSummaryProps {
  settings: InterviewSettings;
  overallScore: number;
  questions: Question[];
  onTriggerRoadmap: () => void;
  onRestart: () => void;
}

export default function SessionSummary({ settings, overallScore, questions, onTriggerRoadmap, onRestart }: SessionSummaryProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(0);

  // Combine overall scores averages from Module 6
  const getAverageFusionScore = (item: string) => {
    let sum = 0;
    let counted = 0;
    questions.forEach(q => {
      if (q.scores && (q.scores as any)[item] !== undefined) {
        sum += (q.scores as any)[item];
        counted++;
      }
    });
    return counted > 0 ? Math.round(sum / counted) : 75;
  };

  const confidenceScore = getAverageFusionScore("confidenceScore");
  const engagementScore = getAverageFusionScore("engagementScore");
  const professionalismScore = getAverageFusionScore("professionalismScore");
  const nervousnessScore = getAverageFusionScore("nervousnessScore");
  const communicationScore = getAverageFusionScore("communicationScore");

  const getScoreColor = (score: number, inverse = false) => {
    if (inverse) {
      if (score > 55) return 'text-rose-400';
      if (score > 35) return 'text-amber-400';
      return 'text-emerald-400';
    }
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-cyan-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div id="session-summary-dashboard" className="w-full max-w-6xl mx-auto space-y-6">
      
      {/* 1. Header Banner & Fusion Score Indicator */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Abstract design nodes */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Big visual dynamic meter */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-8 relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/25 rounded-full text-cyan-400 text-xs font-mono mb-4">
            <Award className="w-3.5 h-3.5" />
            COMPOSITE RATING
          </div>
          
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Svg dynamic outline circular loader */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-95">
              <circle 
                cx="72" cy="72" r="64" 
                className="stroke-slate-800 fill-none" 
                strokeWidth="8"
              />
              <circle 
                cx="72" cy="72" r="64" 
                className="stroke-cyan-500 fill-none transition-all duration-1000" 
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 64}`}
                strokeDashoffset={`${2 * Math.PI * 64 * (1 - overallScore / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="text-center">
              <span className="text-5xl font-extrabold text-white tracking-tight">{overallScore}</span>
              <span className="text-slate-500 text-xs font-mono block mt-1">/ 100 IDX</span>
            </div>
          </div>

          <p className="text-xs font-mono text-slate-400 mt-4 uppercase">
            {overallScore >= 85 ? 'DISTINGUISHED PRACTITIONER' : 
             overallScore >= 70 ? 'COMPETENT DELIVERER' : 'NEEDS ROADMAP ASSISTANCE'}
          </p>
        </div>

        {/* Module 6 Feature Fusion Scores */}
        <div className="md:col-span-8 space-y-4">
          <div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block mb-1">MODULE 6 FUSION RESULT</span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Physio-Vocal Evaluation Fusion</h2>
            <p className="text-slate-400 text-sm mt-1">
              Polaris synchronized your posture, eye coordinates, audio pacing variance, and content transcript semantics to estimate professional capabilities.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            
            <div className="bg-slate-950/50 border border-slate-850 p-3 rounded-lg text-center">
              <div className="text-slate-500 text-[10px] font-mono uppercase">Confidence</div>
              <div className={`text-xl font-bold font-mono mt-1 ${getScoreColor(confidenceScore)}`}>{confidenceScore}%</div>
            </div>

            <div className="bg-slate-950/50 border border-slate-850 p-3 rounded-lg text-center">
              <div className="text-slate-500 text-[10px] font-mono uppercase">Professionalism</div>
              <div className={`text-xl font-bold font-mono mt-1 ${getScoreColor(professionalismScore)}`}>{professionalismScore}%</div>
            </div>

            <div className="bg-slate-950/50 border border-slate-850 p-3 rounded-lg text-center">
              <div className="text-slate-500 text-[10px] font-mono uppercase">Engagement</div>
              <div className={`text-xl font-bold font-mono mt-1 ${getScoreColor(engagementScore)}`}>{engagementScore}%</div>
            </div>

            <div className="bg-slate-950/50 border border-slate-850 p-3 rounded-lg text-center">
              <div className="text-slate-500 text-[10px] font-mono uppercase">Communication</div>
              <div className={`text-xl font-bold font-mono mt-1 ${getScoreColor(communicationScore)}`}>{communicationScore}%</div>
            </div>

            <div className="bg-slate-950/50 border border-slate-850 p-3 rounded-lg text-center col-span-2 sm:col-span-1">
              <div className="text-slate-500 text-[10px] font-mono uppercase">Nervousness</div>
              <div className={`text-xl font-bold font-mono mt-1 ${getScoreColor(nervousnessScore, true)}`}>{nervousnessScore}%</div>
            </div>

          </div>
        </div>

      </div>

      {/* 2. Action triggers */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-950 border border-slate-850 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg">
            <BookOpen className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-white text-xs font-mono font-bold uppercase">PERSONALIZE ROADMAP COMPILER ACTIVATE</div>
            <div className="text-slate-400 text-xs">Transform your weakness metrics and custom goals into a weekly syllabus.</div>
          </div>
        </div>
        <button
          id="btn-trigger-roadmap"
          onClick={onTriggerRoadmap}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold font-mono text-xs uppercase tracking-wider rounded-lg transition-transform active:scale-[0.98] cursor-pointer flex items-center gap-2"
        >
          <Map className="w-3.5 h-3.5" />
          COMPILE ROADMAP TIMELINE
        </button>
      </div>

      {/* 3. Detailed Per-Question Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Question response log selection */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-xs font-mono text-slate-500 block uppercase tracking-wider">RESPONSE DETAIL SELECTOR</span>
          {questions.map((q, idx) => {
            const hasScores = !!q.scores;
            return (
              <button
                key={idx}
                id={`btn-select-summary-q-${idx}`}
                onClick={() => setSelectedIdx(idx)}
                className={`w-full text-left p-4 rounded-lg border transition-all flex justify-between items-start ${
                  selectedIdx === idx 
                    ? 'bg-slate-900 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                    : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                }`}
              >
                <div className="space-y-1 pr-2">
                  <div className="text-[10px] font-mono text-cyan-400 uppercase">QUESTION {idx + 1} • {q.type}</div>
                  <div className="text-white text-xs font-medium truncate max-w-xs">"{q.text}"</div>
                </div>
                {hasScores && (
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                    {q.scores?.overallScore}
                  </span>
                )}
              </button>
            );
          })}

          <button
            id="btn-summary-restart"
            onClick={onRestart}
            className="w-full py-2.5 border border-slate-800 hover:border-slate-700 text-slate-300 font-mono text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer pt-3"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            RESTART NEW SESSION
          </button>
        </div>

        {/* Right Side: Specific evaluation dashboard info */}
        <div className="lg:col-span-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-xl p-6 shadow-xl leading-relaxed">
          {selectedIdx !== null ? (
            (() => {
              const q = questions[selectedIdx];
              const sc = q.scores;
              if (!sc) return (
                <div className="text-center py-20 text-slate-500 flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-slate-600 animate-spin" />
                  <p className="text-xs font-mono">SELECTION TRANSCRIPT SEMANTICS OFFLINE OR EVALUATION OMITTED</p>
                </div>
              );

              return (
                <div className="space-y-6">
                  {/* Title */}
                  <div className="border-b border-slate-800/60 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 uppercase">Detailed Analysis</span>
                      <h3 className="text-white font-bold max-w-prose">"{q.text}"</h3>
                    </div>
                    <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 text-right">
                      <div className="text-[10px] font-mono text-slate-500">ANSWER GRADE</div>
                      <div className="text-cyan-400 font-mono font-bold text-sm">{sc.overallScore} / 100</div>
                    </div>
                  </div>

                  {/* Transcript box */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Candidate Transcription:</span>
                    <p className="bg-slate-950/80 p-4 rounded border border-slate-850 text-slate-300 text-sm italic font-sans whitespace-pre-wrap">
                      "{q.fullTranscript || 'No speech recorded.'}"
                    </p>
                  </div>

                  {/* Modules detail list */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* MediaPipe Video stats (Module 3) */}
                    <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-lg">
                      <span className="text-[10px] font-mono text-cyan-400 block uppercase tracking-wider mb-2 font-bold">MODULE 3 Pose Indicators</span>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Shoulder alignment</span>
                          <span className="text-slate-300">{sc.postureScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Gaze eye tracking</span>
                          <span className="text-slate-300">{sc.eyeContactScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Hand self-touch</span>
                          <span className="text-slate-300">{sc.handControlScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Leaning Restless</span>
                          <span className="text-slate-300">{sc.movementScore}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Whisper Prosody Metrics (Module 4) */}
                    <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-lg">
                      <span className="text-[10px] font-mono text-cyan-400 block uppercase tracking-wider mb-2 font-bold">MODULE 4 Audio prosody</span>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Speech cadence rate</span>
                          <span className="text-slate-300">{sc.paceScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Vocal resonance stability</span>
                          <span className="text-slate-300">{sc.confidenceScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Vocal articulation</span>
                          <span className="text-slate-300">{sc.clarityScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Hesitancy pauses</span>
                          <span className="text-slate-300">{sc.pauseScore}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Gemini Semantics Evaluate (Module 5) */}
                    <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-lg">
                      <span className="text-[10px] font-mono text-cyan-400 block uppercase tracking-wider mb-2 font-bold">MODULE 5 content core</span>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">STAR alignment</span>
                          <span className="text-slate-300">{sc.starScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Core value & relevancy</span>
                          <span className="text-slate-300">{sc.contentScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Filler clear rating</span>
                          <span className="text-slate-300">{sc.fillerWordScore}%</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* STAR Breakdown Structure Evaluation */}
                  <div className="space-y-2 border-t border-slate-800/40 pt-4">
                    <span className="text-[11px] font-mono text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-purple-400" />
                      STAR Narrative Construct Audit
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      
                      <div className="bg-slate-950/40 p-3 rounded border border-slate-850/60">
                        <div className="font-bold text-slate-400 mb-1">SITUATION (S)</div>
                        <p className="text-slate-300 italic">"{sc.starFeedback.situation}"</p>
                      </div>

                      <div className="bg-slate-950/40 p-3 rounded border border-slate-850/60">
                        <div className="font-bold text-slate-400 mb-1">TASK (T)</div>
                        <p className="text-slate-300 italic">"{sc.starFeedback.task}"</p>
                      </div>

                      <div className="bg-slate-950/40 p-3 rounded border border-slate-850/60">
                        <div className="font-bold text-slate-400 mb-1">ACTION (A)</div>
                        <p className="text-slate-300 italic">"{sc.starFeedback.action}"</p>
                      </div>

                      <div className="bg-slate-950/40 p-3 rounded border border-slate-850/60">
                        <div className="font-bold text-slate-400 mb-1">RESULT (R)</div>
                        <p className="text-slate-300 italic">"{sc.starFeedback.result}"</p>
                      </div>

                    </div>
                  </div>

                  {/* Filler words and constructive feedback tips */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 border-t border-slate-800/40 pt-4">
                    
                    <div className="sm:col-span-5 space-y-2">
                      <span className="text-[10px] font-mono text-amber-400 block uppercase font-bold">Filler Words Captured</span>
                      <div className="flex flex-wrap gap-1.5">
                        {sc.fillerWordsFound && sc.fillerWordsFound.length > 0 ? (
                          sc.fillerWordsFound.map((wd, i) => (
                            <span key={i} className="bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10px] px-2 py-0.5 rounded">
                              "{wd}"
                            </span>
                          ))
                        ) : (
                          <span className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3" /> NIL FILLERS
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Repetitive placeholder phrasing can dilute authority markers of technical messages.
                      </p>
                    </div>

                    <div className="sm:col-span-7 space-y-2">
                      <span className="text-[10px] font-mono text-emerald-400 block uppercase font-bold">Target Improvement Tips</span>
                      <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                        {sc.tips && sc.tips.map((tip, i) => (
                          <li key={i} className="marker:text-emerald-400 pr-1">{tip}</li>
                        ))}
                      </ul>
                    </div>

                  </div>

                </div>
              );
            })()
          ) : (
            <div className="text-center py-24 text-slate-500">
              Select a question on the left to review modular posture, delivery, and grammar logs.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
