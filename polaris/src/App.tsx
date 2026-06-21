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
  const [utcTimeStr, setUtcTimeStr] = useState("15:03");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2, "0");
      const mm = String(now.getUTCMinutes()).padStart(2, "0");
      const ss = String(now.getUTCSeconds()).padStart(2, "0");
      setUtcTimeStr(`${hh}:${mm}:${ss}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Stats from DB for general dashboard telemetry
  const [dbStatus, setDbStatus] = useState<any>({ sessionCount: 0, status: "checking" });

  const fetchDBStatus = async () => {
    try {
      const res = await fetch("/api/db-status");
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      } else {
        throw new Error("Telemetry API failed");
      }
    } catch (e) {
      console.log("Telemetry check skipped, looking up client-side fallback storage:", e);
      try {
        const cached = localStorage.getItem("ai_interview_sessions");
        const count = cached ? JSON.parse(cached).length : 0;
        setDbStatus({ sessionCount: count, status: "local_only" });
      } catch (err) {
        setDbStatus({ sessionCount: 0, status: "error" });
      }
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
      console.warn("Using baseline level-tailored interview questions fallback:", error);
      
      const level = configuredSettings.experienceLevel || "Mid Level";
      const role = configuredSettings.role || "Software Engineer";
      const company = configuredSettings.company || "Target Company";
      const normRole = role.toLowerCase();
      let levelQuestions: Question[] = [];

      // 1. Culinary category (Chef, Cook, Prep, Baker, Culinary, Kitchen, Restaurant, Food)
      if (normRole.includes("chef") || normRole.includes("cook") || normRole.includes("baker") || normRole.includes("culinary") || normRole.includes("kitchen") || normRole.includes("restaurant") || normRole.includes("food") || normRole.includes("pastry")) {
        if (level === "Entry Level") {
          levelQuestions = [
            {
              id: "q_fallback_c_1",
              text: `Describe a high-pressure rush period in the kitchen where you ran into an ingredient shortage or ticket backlog. How did you handle the situation to ensure quality and speed?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_c_2",
              text: `Explain your core understanding of food sanitation procedures, temp logs, and standard kitchen station readiness for a junior culinary role at ${company}.`,
              type: "technical"
            },
            {
              id: "q_fallback_c_3",
              text: `Tell me about a time you had to work with a senior chef whose style of direction or plating was different from what you were taught. How did you adapt?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_c_4",
              text: `As an Entry Level practitioner at ${company}, what fundamental steps do you take to guarantee consistent prep work and avoid wasting raw stock?`,
              type: "technical"
            }
          ];
        } else if (level === "Senior Level") {
          levelQuestions = [
            {
              id: "q_fallback_c_1",
              text: `Recall a major service disaster or high-pressure banquet rush that you managed and resolved successfully as a Senior ${role}. What did you learn?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_c_2",
              text: `Walk me through your system for menu engineering, calculating food cost percentages, and planning prep sheets for a high-volume service at ${company}.`,
              type: "technical"
            },
            {
              id: "q_fallback_c_3",
              text: `Describe a situation where you had to influence the restaurant manager or owner to update food sourcing channels or switch suppliers in favor of quality.`,
              type: "behavioral"
            },
            {
              id: "q_fallback_c_4",
              text: `In a Senior role at ${company}, how do you design, test, and standardize new recipes across multiple shifts while keeping line cooks fully aligned?`,
              type: "technical"
            }
          ];
        } else if (level === "Lead / Staff") {
          levelQuestions = [
            {
              id: "q_fallback_c_1",
              text: `Tell us about an instance where you successfully structured and launched a complete menu redesign, aligning creative culinary goals with operational restaurant metrics.`,
              type: "behavioral"
            },
            {
              id: "q_fallback_c_2",
              text: `How do you devise long-term kitchen staffing models, manage waste reduction frameworks, and deal with supply chain disruptions under strict financial metrics?`,
              type: "technical"
            },
            {
              id: "q_fallback_c_3",
              text: `How do you mentor junior cooks? Give a specific instance where you delegated an essential menu dish to a struggling cook, guiding them to success.`,
              type: "behavioral"
            },
            {
              id: "q_fallback_c_4",
              text: `Discuss a time when a major promotional rollout or event catering you sponsored was headed towards failure. How did you step in to correct course?`,
              type: "technical"
            }
          ];
        } else {
          // Mid Level
          levelQuestions = [
            {
              id: "q_fallback_c_1",
              text: `Describe a specific section of the menu (e.g., entrees, pastry) you were tasked to manage or execute independently. What prep decisions did you make?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_c_2",
              text: `What are your strategies for maintaining station efficiency, speed of service, and accurate ticket timing during peak weekend covers?`,
              type: "technical"
            },
            {
              id: "q_fallback_c_3",
              text: `Tell me about a time you disagreed with a coworker's station setup or prep standards. How did you resolve the conflict?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_c_4",
              text: `As a Mid Level professional at ${company}, how do you monitor physical inventory, ensure freshness, and preempt food waste?`,
              type: "technical"
            }
          ];
        }
      }
      // 2. Design / PX / UX (Design, Art,UX, UI, Artist, Creative, Illustrator, Animator, Graphics, Web Designer)
      else if (normRole.includes("design") || normRole.includes("art") || normRole.includes("ux") || normRole.includes("ui") || normRole.includes("creative") || normRole.includes("graphics") || normRole.includes("illustrator") || normRole.includes("copywriter")) {
        if (level === "Entry Level") {
          levelQuestions = [
            {
              id: "q_fallback_d_1",
              text: `Describe a fundamental design project or school assignment where your initial visual concept received negative feedback. How did you iterate on it?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_d_2",
              text: `Can you explain your baseline workflow using design utilities (like Figma, Creative Suite) and how you organize asset layers for team hand-off?`,
              type: "technical"
            },
            {
              id: "q_fallback_d_3",
              text: `Tell me about a project where you collaborated with someone who had a totally different aesthetic viewpoint. How did you strike a compromise?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_d_4",
              text: `As an Entry Level designer at ${company}, what checks do you run to verify details like accessibility contrast ratios, grid lines, and vector clean layouts?`,
              type: "technical"
            }
          ];
        } else if (level === "Senior Level") {
          levelQuestions = [
            {
              id: "q_fallback_d_1",
              text: `Discuss a major design campaign or product interface you designed where user research directly clashed with executive stylistic preferences. How did you balance them?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_d_2",
              text: `Walk us through your philosophy, naming hierarchy, and component guidelines when designing and packaging a complex design system for high-scale products at ${company}.`,
              type: "technical"
            },
            {
              id: "q_fallback_d_3",
              text: `Describe a time when you had to convince leadership to spend substantial cycles refining micro-interactions or motion fluidity instead of shipping flat frames.`,
              type: "behavioral"
            },
            {
              id: "q_fallback_d_4",
              text: `In a Senior role at ${company}, how do you set up visual instrumentation audits and track design QA to ensure pixel-perfect production fidelity?`,
              type: "technical"
            }
          ];
        } else if (level === "Lead / Staff") {
          levelQuestions = [
            {
              id: "q_fallback_d_1",
              text: `Tell us about an event where you successfully directed and aligned multiple brand and product teams on a major cohesive brand identity shift.`,
              type: "behavioral"
            },
            {
              id: "q_fallback_d_2",
              text: `How do you structure long-term design visions, guide multi-platform product languages, and quantify the direct ROI of design polish for business stakeholders?`,
              type: "technical"
            },
            {
              id: "q_fallback_d_3",
              text: `How do you build a flourishing creative culture? Outline an experience where you helped a junior creative who was struggling with creative burnout or design blocks.`,
              type: "behavioral"
            },
            {
              id: "q_fallback_d_4",
              text: `Discuss a time when high-stakes user conversion figures plummeted after a redesign you sponsored. How did you lead the post-mortem and reverse the decline?`,
              type: "technical"
            }
          ];
        } else {
          // Mid Level
          levelQuestions = [
            {
              id: "q_fallback_d_1",
              text: `Describe a standalone app screen or core marketing campaign asset you were asked to design independently. What layout decisions did you prioritize?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_d_2",
              text: `What are your strategies for creating responsive components that scale gracefully from mobile viewports to large-format desktop screens at ${company}?`,
              type: "technical"
            },
            {
              id: "q_fallback_d_3",
              text: `Tell us about a design review where another designer's feedback was highly critical of your typography choices. How did you finalize a solution?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_d_4",
              text: `As a Mid Level designer at ${company}, how do you ensure that all asset libraries, rasterizations, and assets are fully optimized to minimize load latencies?`,
              type: "technical"
            }
          ];
        }
      }
      // 3. Education / Teaching (Teacher, Educator, Professor, Tutor, Instructor, School, Academy)
      else if (normRole.includes("teach") || normRole.includes("educat") || normRole.includes("professor") || normRole.includes("tutor") || normRole.includes("instructor") || normRole.includes("school") || normRole.includes("train")) {
        if (level === "Entry Level") {
          levelQuestions = [
            {
              id: "q_fallback_e_1",
              text: `Describe a classroom scenario or tutoring session where a student struggled to grasp a foundational topic. How did you adjust your explanation on the spot?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_e_2",
              text: `Can you explain your approach to managing student engagement and maintaining a structured, focus-supportive classroom environment?`,
              type: "technical"
            },
            {
              id: "q_fallback_e_3",
              text: `Tell me about a time you worked on a curriculum plan with a senior educator who had highly traditional styles. How did you align?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_e_4",
              text: `As an Entry Level educator at ${company}, how do you construct clear lesson pacing guides and double-check key quiz metrics for student progress?`,
              type: "technical"
            }
          ];
        } else if (level === "Senior Level") {
          levelQuestions = [
            {
              id: "q_fallback_e_1",
              text: `Discuss a severe classroom management problem or behavioral issue you resolved while keeping a positive and safe learning climate.`,
              type: "behavioral"
            },
            {
              id: "q_fallback_e_2",
              text: `Walk us through your curriculum mapping strategies, emphasizing how you align course lessons to complex standards, state boards, or learning directions.`,
              type: "technical"
            },
            {
              id: "q_fallback_e_3",
              text: `Describe a situation where you had to obtain funding or administration approval for an innovative but controversial technology program or classroom setup.`,
              type: "behavioral"
            },
            {
              id: "q_fallback_e_4",
              text: `In a Senior educational role at ${company}, how do you evaluate student cohort metrics and set up remedial actions to boost cohort success?`,
              type: "technical"
            }
          ];
        } else if (level === "Lead / Staff") {
          levelQuestions = [
            {
              id: "q_fallback_e_1",
              text: `Tell us about an event where you successfully launched an academy-wide or school-district-wide teacher development and retraining standard.`,
              type: "behavioral"
            },
            {
              id: "q_fallback_e_2",
              text: `How do you lead long-term instructional program directions, handle school budgeting, and manage complex diverse educational policies?`,
              type: "technical"
            },
            {
              id: "q_fallback_e_3",
              text: `How do you cultivate professional educators? Tell us a story of a time you helped a fellow teacher who was struggling with severe burn-out or class control.`,
              type: "behavioral"
            },
            {
              id: "q_fallback_e_4",
              text: `Discuss a high-stakes educational pivot or program rollout that faced fierce community or student backlash. How did you lead the resolution?`,
              type: "technical"
            }
          ];
        } else {
          // Mid Level
          levelQuestions = [
            {
              id: "q_fallback_e_1",
              text: `Describe a specific unit or specialized study course you were asked to manage or teach independently. What lesson plans did you build?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_e_2",
              text: `What are your strategies for creating differentiated assignments to help both struggling students and high-achievers succeed in the same classroom?`,
              type: "technical"
            },
            {
              id: "q_fallback_e_3",
              text: `Tell us about a parent-teacher or student-administration review where your grading or testing method was highly scrutinized. How did you resolve the conflict?`,
              type: "behavioral"
            },
            {
              id: "q_fallback_e_4",
              text: `As a Mid Level educator at ${company}, how do you incorporate digital learning aids, interactive tablets, or quiz software effectively without distracting?`,
              type: "technical"
            }
          ];
        }
      }
      // 4. Default: Software / Full Stack / Technology Engineering vs General Professional
      else {
        const isTech = (() => {
          const nr = (role || "").toLowerCase();
          return nr.includes("software") || nr.includes("developer") || nr.includes("engineer") || nr.includes("programmer") || nr.includes("coder") || nr.includes("tech") || nr.includes("devops") || nr.includes("fullstack") || nr.includes("frontend") || nr.includes("backend") || nr.includes("cloud") || nr.includes("data scientist") || nr.includes("data engineer") || nr.includes("sysadmin") || nr.includes("architect");
        })();

        if (isTech) {
          if (level === "Entry Level") {
            levelQuestions = [
              {
                id: "q_entry1",
                text: `Describe a basic coding assignment or academic project where you ran into a compilation error or logic bug. How did you break down the debugging process to solve it?`,
                type: "behavioral"
              },
              {
                id: "q_entry2",
                text: `Explain your understanding of memory management or the differences between synchronous and asynchronous processes within a ${role} workflow.`,
                type: "technical"
              },
              {
                id: "q_entry3",
                text: `Tell me about a time you had to work with a team member who possessed more experience than you, or had a different communication style. How did you adapt your learning curve?`,
                type: "behavioral"
              },
              {
                id: "q_entry4",
                text: `As an Entry Level candidate at ${company}, what fundamental source code reviews and unit-testing standards do you follow to ensure your daily updates remain production-safe?`,
                type: "technical"
              }
            ];
          } else if (level === "Senior Level") {
            levelQuestions = [
              {
                id: "q_senior1",
                text: `Describe a major production outage, resource leaking bottleneck, or severe system degradation you diagnosed and resolved under high pressure as a Senior ${role}.`,
                type: "behavioral"
              },
              {
                id: "q_senior2",
                text: `Walk me through your architectural blueprint design pattern for a distributed, fault-tolerant service handling 50,050 requests per minute. How do you balance latency vs datastore persistence?`,
                type: "technical"
              },
              {
                id: "q_senior3",
                text: `Describe a situation where you had to influence senior managers, product owners, or peers to approve a substantial refactoring of legacy code instead of launching immediate feature additions.`,
                type: "behavioral"
              },
              {
                id: "q_senior4",
                text: `How do you establish high-quality code instrumentation, telemetry metrics, and tracing across distributed service boundaries for ${company}'s engineering standard?`,
                type: "technical"
              }
            ];
          } else if (level === "Lead / Staff") {
            levelQuestions = [
              {
                id: "q_staff1",
                text: `Tell me about an instance where you successfully aligned three separate engineering teams around a highly contentious architectural shift or platform migration strategy.`,
                type: "behavioral"
              },
              {
                id: "q_staff2",
                text: `How do you design for absolute business-critical system reliability, security token authentications, and global database partition recovery (CAP theorem limits) when modernizing a core ${role} codebase?`,
                type: "technical"
              },
              {
                id: "q_staff3",
                text: `How do you mentor and cultivate staff technical talent? Discuss a situation where you delegated a critical system component to a developer who was struggling, ensuring their ultimate success.`,
                type: "behavioral"
              },
              {
                id: "q_staff4",
                text: `Discuss a time when a major engineering project you sponsored or led was heading towards failure. How did you intervene, communicate the technical risk with stakeholders, and realign execution?`,
                type: "technical"
              }
            ];
          } else {
            // Default / Mid Level
            levelQuestions = [
              {
                id: "q_mid1",
                text: `Describe a modular feature you were tasked to implement independently as a ${role}. What technical decisions did you make, and how did you verify its production performance?`,
                type: "behavioral"
              },
              {
                id: "q_mid2",
                text: `What are your typical strategies for API versioning and handling asynchronous tasks safely without causing race conditions or deadlocks in your databases?`,
                type: "technical"
              },
              {
                id: "q_mid3",
                text: `Tell me about a scenario where you disagreed with a fellow developer's review comments or pull request changes. How did you gather consensus to resolve it?`,
                type: "behavioral"
              },
              {
                id: "q_mid4",
                text: `As a Mid Level professional at ${company}, talk about how you identify and preempt memory leaks, slow database queries, or bloated payload packages.`,
                type: "technical"
              }
            ];
          }
        } else {
          // Dynamic General Professional questions based on target role and experience level
          const normRole = role || "Professional";
          if (level === "Entry Level") {
            levelQuestions = [
              {
                id: "q_dyn_1",
                text: `Describe a challenge or mistake you encountered in your work or academic assignments as a junior ${normRole}. How did you handle the situation to resolve it?`,
                type: "behavioral"
              },
              {
                id: "q_dyn_2",
                text: `Explain your core understanding of the primary workflow steps, safety standards, and essential procedures required to succeed in this entry-level ${normRole} role at ${company}.`,
                type: "technical"
              },
              {
                id: "q_dyn_3",
                text: `Tell me about a time you had to collaborate on a task with a more senior team member or mentor who had a different working style. How did you adapt?`,
                type: "behavioral"
              },
              {
                id: "q_dyn_4",
                text: `As an Entry Level practitioner at ${company}, what quality control and review steps do you take to ensure your deliverables are accurate, consistent, and error-free?`,
                type: "technical"
              }
            ];
          } else if (level === "Senior Level") {
            levelQuestions = [
              {
                id: "q_dyn_1",
                text: `Recall a complex high-pressure challenge or major process block that you managed and resolved successfully as a Senior ${normRole}. What was your resolution strategy?`,
                type: "behavioral"
              },
              {
                id: "q_dyn_2",
                text: `Walk me through your comprehensive framework, key metrics, and tools for designing and executing complex initiatives as a Senior ${normRole} at ${company}.`,
                type: "technical"
              },
              {
                id: "q_dyn_3",
                text: `Describe a situation where you had to persuade senior leadership or major stakeholders to prioritize a critical strategic optimization of resources or methods over a simpler, short-term fix.`,
                type: "behavioral"
              },
              {
                id: "q_dyn_4",
                text: `In a Senior role at ${company}, how do you evaluate quality parameters, track operational performance, and mentor newer team members to elevate execution?`,
                type: "technical"
              }
            ];
          } else if (level === "Lead / Staff") {
            levelQuestions = [
              {
                id: "q_dyn_1",
                text: `Tell us about an instance where you successfully guided, aligned, and structured multiple teams or departments around a highly contentious strategic change or major priority shift.`,
                type: "behavioral"
              },
              {
                id: "q_dyn_2",
                text: `How do you formulate long-term plan directions, design advanced workflow scaling models, and manage cross-product risk parameters under high-stakes performance objectives as a Lead ${normRole}?`,
                type: "technical"
              },
              {
                id: "q_dyn_3",
                text: `How do you cultivate professional leadership and capability within your department? Give a specific instance where you delegated an essential responsibility to a struggling teammate.`,
                type: "behavioral"
              },
              {
                id: "q_dyn_4",
                text: `Discuss a high-stakes project or programmatic rollout under your sponsorship that faced severe risk of failure. How did you intervene, realign key metrics, and steer it back?`,
                type: "technical"
              }
            ];
          } else {
            // Mid Level / Default
            levelQuestions = [
              {
                id: "q_dyn_1",
                text: `Describe a specialized project section or core deliverable you were tasked to manage or execute independently as a ${normRole}. What strategic choices did you make?`,
                type: "behavioral"
              },
              {
                id: "q_dyn_2",
                text: `What are your primary strategies for maintaining operational efficiency, managing typical daily bottlenecks, and ensuring high-quality output as a ${normRole} at ${company}?`,
                type: "technical"
              },
              {
                id: "q_dyn_3",
                text: `Tell me about a scenario where you disagreed with a coworker's standard practices or suggested workflow. How did you resolve the conflict productively?`,
                type: "behavioral"
              },
              {
                id: "q_dyn_4",
                text: `As a Mid Level professional at ${company}, how do you audit your deliverables, identify potential quality leaks, and proactively optimize execution workflows?`,
                type: "technical"
              }
            ];
          }
        }
      }

      setQuestions(levelQuestions);
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
                <span className="text-xl font-black text-white tracking-widest font-mono select-none">POLARIS (Prototype)</span>
                <span className="text-[10px] bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 px-1.5 py-0.5 rounded font-mono font-bold leading-none uppercase">AI MOCK</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mt-1">BY TEAM UNDERDOGS</span>
            </div>
          </div>

          {/* Core HUD diagnostics info */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>DB STATUS:</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>AI CHANNELS:</span>
              <span className="text-cyan-400 font-bold">{process.env.GEMINI_API_KEY ? "GEMINI FL" : "EMULATED"}</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-300 transition-all">
              <span>TIME (UTC):</span>
              <span className="text-white font-bold font-mono">{utcTimeStr}</span>
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
          <span>PROTOTYPE SIMULATION</span>
          <span className="flex gap-2">
            <span className="text-slate-750">SECURE SHELL</span> • 
            <span className="text-emerald-500 flex gap-1 items-center">● INFRASTRUCTURE COMPILING OK</span>
          </span>
        </div>
      </footer>

    </div>
  );
}
