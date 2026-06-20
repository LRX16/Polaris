import React, { useState, useEffect } from 'react';
import { CareerRoadmap, InterviewSession } from '../types';
import { 
  Sparkles, Calendar, CheckSquare, Target, ListChecks, HelpCircle, 
  MapPin, Clock, ArrowRight, Zap, RefreshCw, Layers
} from 'lucide-react';

interface RoadmapViewProps {
  pastSessions: InterviewSession[];
  targetRole: string;
  onGoBack: () => void;
}

export default function RoadmapView({ pastSessions, targetRole, onGoBack }: RoadmapViewProps) {
  const [currentGoals, setCurrentGoals] = useState('Build bulletproof technical articulation of high complexity algorithms and eliminate monotone physical fidgets.');
  const [customWeaknesses, setCustomWeaknesses] = useState('Slouches in chair, repetitive like/um filler words, rushed results inside behavioral questions.');
  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Fetch already saved roadmaps first or generate an initial one
  const handleFetchOrGenerate = async (forceRebuild = false) => {
    setIsLoading(true);

    // Sum history summary statistics if any
    let historySummary = "No history recorded yet.";
    if (pastSessions.length > 0) {
      const avg = Math.round(pastSessions.reduce((acc, s) => acc + s.overallScore, 0) / pastSessions.length);
      historySummary = `Candidate has completed ${pastSessions.length} sessions, with an average score of ${avg}/100. Key challenges include pacing and posture adjustments.`;
    }

    try {
      if (!forceRebuild) {
        // Try getting existing
        try {
          const listRes = await fetch("/api/roadmaps");
          if (listRes.ok) {
            const listData = await listRes.json();
            if (Array.isArray(listData) && listData.length > 0) {
              setRoadmap(listData[0]);
              localStorage.setItem("ai_interview_roadmaps", JSON.stringify(listData));
              setIsLoading(false);
              return;
            }
          }
        } catch (apiErr) {
          console.warn("Failed retrieving roadmaps from API, trying cache...", apiErr);
          try {
            const cached = localStorage.getItem("ai_interview_roadmaps");
            if (cached) {
              const listData = JSON.parse(cached);
              if (Array.isArray(listData) && listData.length > 0) {
                setRoadmap(listData[0]);
                setIsLoading(false);
                return;
              }
            }
          } catch (cacheErr) {
            console.error("Failed reading cached roadmaps:", cacheErr);
          }
        }
      }

      // Generate new via Express Gemini service
      const res = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: targetRole || "Full Stack Software Engineer",
          currentGoals,
          weaknesses: customWeaknesses,
          historySummary,
        }),
      });

      if (!res.ok) throw new Error("Roadmap request failed");
      const data: CareerRoadmap = await res.json();
      setRoadmap(data);

      // Save to cache
      try {
        const cached = localStorage.getItem("ai_interview_roadmaps");
        const existing = cached ? JSON.parse(cached) : [];
        const updated = [data, ...existing];
        localStorage.setItem("ai_interview_roadmaps", JSON.stringify(updated));
      } catch (cacheSaveErr) {
        console.warn("Could not save roadmap to cache:", cacheSaveErr);
      }

    } catch (err) {
      console.warn("Using resilient localized roadmap builder:", err);
      // Fallback
      const fallbackRoadmap = {
        roadmapId: `rd_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        role: targetRole || "Full Stack Software Engineer",
        missingSkills: ["STAR Results phrasing", "Calm hand positioning index", "Constant eye focus lock"],
        weaknessPatterns: ["Nervous fidget speed loops", "Incomplete Situation backdrop detail", "Filler word recurrence"],
        tasks: [
          {
            week: "Week 1",
            topic: "Physical Calibration & Frame Stability",
            duration: "4 hours",
            description: "Correct physical alignment angles to establish a highly professional frame projection.",
            actionItems: [
              "Raise computer camera exactly aligned with nose bridges.",
              "Conduct 2 trial recordings keeping wrists fully resting on tables.",
              "Benchmark and eliminate excessive upper body swaying."
            ]
          },
          {
            week: "Week 2",
            topic: "Vocal Melody and Pausing Precision",
            duration: "5 hours",
            description: "Control speech WPM rate and swap filler words for deliberate short breathing gaps.",
            actionItems: [
              "Record 3 technical summaries limiting velocity under 140 WPM.",
              "Incorporate brief silent intervals between complex code points.",
              "Avoid pre-emptive 'So basically' starter loops."
            ]
          },
          {
            week: "Week 3",
            topic: "Advanced STAR Narrative Sculpting",
            duration: "7 hours",
            description: "Build robust modular Situation, Task, Action and Result statements for key resume milestones.",
            actionItems: [
              "Refactor three project examples explicitly detail personal key technical decisions.",
              "Calculate 2 quantified business or performance outcomes for each.",
              "Re-evaluate answer content drafts through content evaluator metrics."
            ]
          },
          {
            week: "Week 4",
            topic: "Pressure Simulated Mock Series",
            duration: "8 hours",
            description: "Complete full mock testing maintaining locked scores across posture, voice and semantical lines.",
            actionItems: [
              "Run two complete 4-question interviews under active simulated alerts.",
              "Check that composite overall scores exceed 85 bounds.",
              "Synthesize and extract summaries to prove baseline preparedness."
            ]
          }
        ]
      };
      setRoadmap(fallbackRoadmap);

      // Save fallback to cache as well so it is persisted
      try {
        const cached = localStorage.getItem("ai_interview_roadmaps");
        const existing = cached ? JSON.parse(cached) : [];
        const updated = [fallbackRoadmap, ...existing];
        localStorage.setItem("ai_interview_roadmaps", JSON.stringify(updated));
      } catch (cacheSaveErr) {
        console.warn("Could not save roadmap to cache:", cacheSaveErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleFetchOrGenerate();
  }, []);

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div id="roadmap-root-container" className="w-full max-w-5xl mx-auto space-y-6">
      
      {/* 1. Controller Config Box */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 opacity-60"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-800/60 pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-purple-400 font-bold uppercase mb-1">
              <Layers className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
              MODULE 9 ROADMAP ENGINE ACTIVE
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Syllabus Boost Planner</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Personalized roadmap built from your weakness patterns and target roles.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoBack}
            className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono uppercase rounded transition-all cursor-pointer"
          >
            ← BACK TO ROOM
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-cyan-500" />
              Target Focus Goals
            </label>
            <textarea
              id="roadmap-target-goals"
              value={currentGoals}
              onChange={(e) => setCurrentGoals(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-slate-300 placeholder-slate-650 font-mono text-xs h-20 outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <AlertSquare className="w-3.5 h-3.5 text-rose-500" />
              Custom Weaknesses To Correct
            </label>
            <textarea
              id="roadmap-custom-weakness"
              value={customWeaknesses}
              onChange={(e) => setCustomWeaknesses(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-slate-300 placeholder-slate-650 font-mono text-xs h-20 outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            id="btn-rebuild-roadmap"
            onClick={() => handleFetchOrGenerate(true)}
            disabled={isLoading || !currentGoals.trim() || !customWeaknesses.trim()}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 font-bold font-mono text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                SYNTHESIZING TIMELINE TASK GRIDS...
              </>
            ) : (
              <>
                RE-COMPILE SYLLABUS ROADMAP
                <Zap className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Visual Roadmap Display */}
      {isLoading ? (
        <div id="roadmap-loading" className="bg-slate-900/60 border border-slate-850 p-24 text-center text-slate-500 rounded-xl space-y-4">
          <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin mx-auto" />
          <p className="text-sm font-mono tracking-widest uppercase">GENERATING ADVANCED MULTI-WEEK SYLLABUS PLAN VIA GEMINI...</p>
        </div>
      ) : roadmap ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Diagnostic overview card */}
          <div className="md:col-span-4 space-y-4">
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <span className="text-xs font-mono text-slate-500 block uppercase border-b border-slate-800 pb-2">Target Career Profiling</span>
              
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Role Focus:</span>
                <span className="text-emerald-400 font-mono text-sm font-semibold">{roadmap.role}</span>
              </div>

              <div>
                <span className="text-[10px] font-mono text-rose-400 block uppercase">Identified Weakness Loops:</span>
                <ul className="space-y-1 mt-1 font-mono text-xs text-slate-300">
                  {roadmap.weaknessPatterns?.map((pt, i) => (
                    <li key={i} className="flex gap-2 items-start text-slate-300">
                      <span className="text-rose-500 select-none">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-[10px] font-mono text-cyan-400 block uppercase">Identified Missing Skills:</span>
                <ul className="space-y-1 mt-1 font-mono text-xs text-slate-300">
                  {roadmap.missingSkills?.map((ms, i) => (
                    <li key={i} className="flex gap-2 items-start text-slate-300">
                      <span className="text-cyan-400 select-none">•</span>
                      <span>{ms}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-slate-950 p-4 border border-slate-850 rounded-lg text-slate-500 text-xs font-mono">
              <div className="flex gap-2 items-center text-slate-400 font-bold mb-1">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-500" />
                HOW TO PRACTICE
              </div>
              Select a checklist item from any week plan on the right, toggle to active, and repeat mock speech rehearsals until your physical feedback stays green!
            </div>

          </div>

          {/* Week list timeline */}
          <div className="md:col-span-8 space-y-6 relative border-l-2 border-slate-800/80 pl-6 ml-2 md:ml-0">
            {roadmap.tasks?.map((task, idx) => (
              <div key={idx} className="relative bg-slate-900/40 backdrop-blur-md rounded-xl p-6 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md">
                
                {/* Visual marker dot on the line */}
                <div className="absolute -left-10 top-7 w-7 h-7 rounded-full bg-slate-950 border-2 border-purple-500 text-purple-400 flex items-center justify-center font-mono text-[10px] font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                  W{idx + 1}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-mono text-purple-400 block uppercase tracking-widest">{task.week} SYLLABUS</span>
                    <h4 className="text-white font-bold text-lg">{task.topic}</h4>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-950 rounded text-slate-400 text-xs font-mono border border-slate-850">
                    <Clock className="w-3 h-3" />
                    {task.duration}
                  </div>
                </div>

                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                  {task.description}
                </p>

                <div className="space-y-2.5 border-t border-slate-800/40 pt-4">
                  <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider mb-2">PRACTICE TIMELINE CHECKLIST:</span>
                  {task.actionItems?.map((item, itemIdx) => {
                    const checkId = `task-${idx}-${itemIdx}`;
                    const isChecked = !!checkedItems[checkId];

                    return (
                      <div 
                        key={itemIdx} 
                        onClick={() => toggleCheck(checkId)}
                        className={`flex items-start gap-3 p-2.5 rounded border transition-all cursor-pointer ${
                          isChecked 
                            ? 'bg-purple-950/20 border-purple-500/30 text-purple-200' 
                            : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 text-slate-350'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center font-bold ${
                          isChecked ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-800'
                        }`}>
                          {isChecked && "✓"}
                        </div>
                        <span className="text-xs leading-relaxed font-sans">{item}</span>
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>

        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-850 p-12 text-center text-slate-400 rounded-xl">
          Roadmap unavailable or failed compilation. Call compilation builder.
        </div>
      )}

    </div>
  );
}

// Inline alert backup helper icon
function AlertSquare({ className }: { className?: string }) {
  return (
    <span className={className}>⚠</span>
  );
}
