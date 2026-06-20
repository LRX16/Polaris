import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Local JSON Database representing the requested PostgreSQL schema
const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Initial database template matching requested SQL structures
interface DBStructure {
  sessions: any[];
  roadmaps: any[];
}

function readDB(): DBStructure {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Failed to read DB, resetting:", error);
  }
  return { sessions: [], roadmaps: [] };
}

function writeDB(data: DBStructure) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write to DB:", error);
  }
}

// Lazy Gemini Initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// Ensure database setup status is retrievable
app.get("/api/db-status", (req, res) => {
  const db = readDB();
  res.json({
    status: "online",
    dialect: "postgresql_emulated",
    sessionCount: db.sessions.length,
    roadmapCount: db.roadmaps.length,
    dbPath: DB_PATH,
  });
});

// GET list of sessions
app.get("/api/sessions", (req, res) => {
  const db = readDB();
  res.json(db.sessions);
});

// POST save a complete session (Module 8)
app.post("/api/sessions/add", (req, res) => {
  const db = readDB();
  const newSession = {
    sessionId: req.body.sessionId || `session_${Date.now()}`,
    date: req.body.date || new Date().toISOString(),
    settings: req.body.settings,
    overallScore: req.body.overallScore || 75,
    questions: req.body.questions || [],
  };
  db.sessions.unshift(newSession); // Newest first
  writeDB(db);
  res.json({ success: true, session: newSession });
});

// GET saved roadmaps
app.get("/api/roadmaps", (req, res) => {
  const db = readDB();
  res.json(db.roadmaps);
});

// POST save generated roadmap (Module 9)
app.post("/api/roadmaps/add", (req, res) => {
  const db = readDB();
  const newRoadmap = req.body;
  db.roadmaps.unshift(newRoadmap);
  writeDB(db);
  res.json({ success: true, roadmap: newRoadmap });
});

// CLEAR DB
app.post("/api/db/clear", (req, res) => {
  writeDB({ sessions: [], roadmaps: [] });
  res.json({ success: true });
});

// API endpoint to generate questions (Module 2)
app.post("/api/interview/start", async (req, res) => {
  const { role, experienceLevel, company, language, name } = req.body;
  const level = experienceLevel || "Mid Level";
  const targetCompany = company || "Target Company";

  const sysPrompt = `You are an elite, highly rigorous technical/professional interviewer at ${targetCompany}.
Your goal is to generate exactly 4 deep and highly tailored interview questions specifically designed for a ${level} candidate applying for a ${role || "Software Engineer"} position.
The language of the interview must be in ${language || "English"}.

IMPORTANT: Ensure the question difficulty, scope, and technical depth are meticulously matched to the '${level}' profile in the context of a ${role} role:
- Entry Level: Focus on basic task execution, entry-level workflows, learning agility, following best practices/safety standards, and receiving feedback.
- Mid Level: Focus on independent task delivery, managing medium-complexity processes, troubleshooting normal field-specific issues, and effective collaboration on team deliverables.
- Senior Level: Focus on designing advanced/complex solutions, handling high-pressure challenges, diagnosing critical problems/failures, mentoring other members, and making technical/procedural recommendations.
- Lead / Staff: Focus on organizational alignment, defining high-level technical/strategic roadmaps, managing grand-scale trade-offs, guiding team-wide standards, and executing business-critical decisions.

The questions must be structured specifically for the field of '${role}' at '${targetCompany}':
1. Question 1: Behavioral (STAR methodology oriented, focused on real-world experiences).
2. Question 2: Core Technical/Job-Specific Analytical (Domain knowledge, core concepts, or standard techniques relevant to ${role}).
3. Question 3: Behavioral (Team coordination, cultural fit, conflict resolution, or cross-functional collaboration in a high-performing team environment).
4. Question 4: Advanced Domain-Specific Question (Hardest industry-specific challenges, optimization of processes, modern tools, or advanced methodology).

You must respond in strict JSON format with a structure matching the responseSchema.`;

  const userPrompt = `Generate exactly 4 realistic, challenging and level-appropriate interview questions in ${language || "English"} for ${name || "the candidate"} matching a ${level} role as ${role} at ${targetCompany}.`;

  const client = getGeminiClient();
  if (!client) {
    console.log(`No Gemini API key found. Launching level-tailored offline question generator for level: ${level}, role: ${role}`);

    const normRole = (role || "").toLowerCase();
    let fallbackQuestions = [];

    // 1. Culinary category (Chef, Cook, Prep, Baker, Culinary, Kitchen, Restaurant, Food)
    if (normRole.includes("chef") || normRole.includes("cook") || normRole.includes("baker") || normRole.includes("culinary") || normRole.includes("kitchen") || normRole.includes("restaurant") || normRole.includes("food") || normRole.includes("pastry")) {
      if (level === "Entry Level") {
        fallbackQuestions = [
          {
            id: "q_fallback_c_1",
            text: `Describe a high-pressure rush period in the kitchen where you ran into an ingredient shortage or ticket backlog. How did you handle the situation to ensure quality and speed?`,
            type: "behavioral"
          },
          {
            id: "q_fallback_c_2",
            text: `Explain your core understanding of food sanitation procedures, temp logs, and standard kitchen station readiness for a junior culinary role at ${targetCompany}.`,
            type: "technical"
          },
          {
            id: "q_fallback_c_3",
            text: `Tell me about a time you had to work with a senior chef whose style of direction or plating was different from what you were taught. How did you adapt?`,
            type: "behavioral"
          },
          {
            id: "q_fallback_c_4",
            text: `As an Entry Level practitioner at ${targetCompany}, what fundamental steps do you take to guarantee consistent prep work and avoid wasting raw stock?`,
            type: "technical"
          }
        ];
      } else if (level === "Senior Level") {
        fallbackQuestions = [
          {
            id: "q_fallback_c_1",
            text: `Recall a major service disaster or high-pressure banquet rush that you managed and resolved successfully as a Senior ${role}. What did you learn?`,
            type: "behavioral"
          },
          {
            id: "q_fallback_c_2",
            text: `Walk me through your system for menu engineering, calculating food cost percentages, and planning prep sheets for a high-volume service at ${targetCompany}.`,
            type: "technical"
          },
          {
            id: "q_fallback_c_3",
            text: `Describe a situation where you had to influence the restaurant manager or owner to update food sourcing channels or switch suppliers in favor of quality.`,
            type: "behavioral"
          },
          {
            id: "q_fallback_c_4",
            text: `In a Senior role at ${targetCompany}, how do you design, test, and standardize new recipes across multiple shifts while keeping line cooks fully aligned?`,
            type: "technical"
          }
        ];
      } else if (level === "Lead / Staff") {
        fallbackQuestions = [
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
        fallbackQuestions = [
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
            text: `As a Mid Level professional at ${targetCompany}, how do you monitor physical inventory, ensure freshness, and preempt food waste?`,
            type: "technical"
          }
        ];
      }
    }
    // 2. Design / PX / UX (Design, Art,UX, UI, Artist, Creative, Illustrator, Animator, Graphics, Web Designer)
    else if (normRole.includes("design") || normRole.includes("art") || normRole.includes("ux") || normRole.includes("ui") || normRole.includes("creative") || normRole.includes("graphics") || normRole.includes("illustrator") || normRole.includes("copywriter")) {
      if (level === "Entry Level") {
        fallbackQuestions = [
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
            text: `As an Entry Level designer at ${targetCompany}, what checks do you run to verify details like accessibility contrast ratios, grid lines, and vector clean layouts?`,
            type: "technical"
          }
        ];
      } else if (level === "Senior Level") {
        fallbackQuestions = [
          {
            id: "q_fallback_d_1",
            text: `Discuss a major design campaign or product interface you designed where user research directly clashed with executive stylistic preferences. How did you balance them?`,
            type: "behavioral"
          },
          {
            id: "q_fallback_d_2",
            text: `Walk us through your philosophy, naming hierarchy, and component guidelines when designing and packaging a complex design system for high-scale products at ${targetCompany}.`,
            type: "technical"
          },
          {
            id: "q_fallback_d_3",
            text: `Describe a time when you had to convince leadership to spend substantial cycles refining micro-interactions or motion fluidity instead of shipping flat frames.`,
            type: "behavioral"
          },
          {
            id: "q_fallback_d_4",
            text: `In a Senior role at ${targetCompany}, how do you set up visual instrumentation audits and track design QA to ensure pixel-perfect production fidelity?`,
            type: "technical"
          }
        ];
      } else if (level === "Lead / Staff") {
        fallbackQuestions = [
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
        fallbackQuestions = [
          {
            id: "q_fallback_d_1",
            text: `Describe a standalone app screen or core marketing campaign asset you were asked to design independently. What layout decisions did you prioritize?`,
            type: "behavioral"
          },
          {
            id: "q_fallback_d_2",
            text: `What are your strategies for creating responsive components that scale gracefully from mobile viewports to large-format desktop screens at ${targetCompany}?`,
            type: "technical"
          },
          {
            id: "q_fallback_d_3",
            text: `Tell us about a design review where another designer's feedback was highly critical of your typography choices. How did you finalize a solution?`,
            type: "behavioral"
          },
          {
            id: "q_fallback_d_4",
            text: `As a Mid Level designer at ${targetCompany}, how do you ensure that all asset libraries, rasterizations, and assets are fully optimized to minimize load latencies?`,
            type: "technical"
          }
        ];
      }
    }
    // 3. Education / Teaching (Teacher, Educator, Professor, Tutor, Instructor, School, Academy)
    else if (normRole.includes("teach") || normRole.includes("educat") || normRole.includes("professor") || normRole.includes("tutor") || normRole.includes("instructor") || normRole.includes("school") || normRole.includes("train")) {
      if (level === "Entry Level") {
        fallbackQuestions = [
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
            text: `As an Entry Level educator at ${targetCompany}, how do you construct clear lesson pacing guides and double-check key quiz metrics for student progress?`,
            type: "technical"
          }
        ];
      } else if (level === "Senior Level") {
        fallbackQuestions = [
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
            text: `In a Senior educational role at ${targetCompany}, how do you evaluate student cohort metrics and set up remedial actions to boost cohort success?`,
            type: "technical"
          }
        ];
      } else if (level === "Lead / Staff") {
        fallbackQuestions = [
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
        fallbackQuestions = [
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
            text: `As a Mid Level educator at ${targetCompany}, how do you incorporate digital learning aids, interactive tablets, or quiz software effectively without distracting?`,
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
          fallbackQuestions = [
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
              text: `As an Entry Level candidate at ${targetCompany}, what fundamental source code reviews and unit-testing standards do you follow to ensure your daily updates remain production-safe?`,
              type: "technical"
            }
          ];
        } else if (level === "Senior Level") {
          fallbackQuestions = [
            {
              id: "q_senior1",
              text: `Describe a major production outage, resource leaking bottleneck, or severe system degradation you diagnosed and resolved under high pressure as a Senior ${role}.`,
              type: "behavioral"
            },
            {
              id: "q_senior2",
              text: `Walk me through your architectural blueprint design pattern for a distributed, fault-tolerant service handling 50,000 requests per minute. How do you balance latency vs datastore persistence?`,
              type: "technical"
            },
            {
              id: "q_senior3",
              text: `Describe a situation where you had to influence senior managers, product owners, or peers to approve a substantial refactoring of legacy code instead of launching immediate feature additions.`,
              type: "behavioral"
            },
            {
              id: "q_senior4",
              text: `How do you establish high-quality code instrumentation, telemetry metrics, and tracing across distributed service boundaries for ${targetCompany}'s engineering standard?`,
              type: "technical"
            }
          ];
        } else if (level === "Lead / Staff") {
          fallbackQuestions = [
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
          fallbackQuestions = [
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
              text: `As a Mid Level professional at ${targetCompany}, talk about how you identify and preempt memory leaks, slow database queries, or bloated payload packages.`,
              type: "technical"
            }
          ];
        }
      } else {
        // Dynamic General Professional questions based on target role and experience level
        const normRole = role || "Professional";
        if (level === "Entry Level") {
          fallbackQuestions = [
            {
              id: "q_dyn_1",
              text: `Describe a challenge or mistake you encountered in your work or academic assignments as a junior ${normRole}. How did you handle the situation to resolve it?`,
              type: "behavioral"
            },
            {
              id: "q_dyn_2",
              text: `Explain your core understanding of the primary workflow steps, safety standards, and essential procedures required to succeed in this entry-level ${normRole} role at ${targetCompany}.`,
              type: "technical"
            },
            {
              id: "q_dyn_3",
              text: `Tell me about a time you had to collaborate on a task with a more senior team member or mentor who had a different working style. How did you adapt?`,
              type: "behavioral"
            },
            {
              id: "q_dyn_4",
              text: `As an Entry Level practitioner at ${targetCompany}, what quality control and review steps do you take to ensure your deliverables are accurate, consistent, and error-free?`,
              type: "technical"
            }
          ];
        } else if (level === "Senior Level") {
          fallbackQuestions = [
            {
              id: "q_dyn_1",
              text: `Recall a complex high-pressure challenge or major process block that you managed and resolved successfully as a Senior ${normRole}. What was your resolution strategy?`,
              type: "behavioral"
            },
            {
              id: "q_dyn_2",
              text: `Walk me through your comprehensive framework, key metrics, and tools for designing and executing complex initiatives as a Senior ${normRole} at ${targetCompany}.`,
              type: "technical"
            },
            {
              id: "q_dyn_3",
              text: `Describe a situation where you had to persuade senior leadership or major stakeholders to prioritize a critical strategic optimization of resources or methods over a simpler, short-term fix.`,
              type: "behavioral"
            },
            {
              id: "q_dyn_4",
              text: `In a Senior role at ${targetCompany}, how do you evaluate quality parameters, track operational performance, and mentor newer team members to elevate execution?`,
              type: "technical"
            }
          ];
        } else if (level === "Lead / Staff") {
          fallbackQuestions = [
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
          fallbackQuestions = [
            {
              id: "q_dyn_1",
              text: `Describe a specialized project section or core deliverable you were tasked to manage or execute independently as a ${normRole}. What strategic choices did you make?`,
              type: "behavioral"
            },
            {
              id: "q_dyn_2",
              text: `What are your primary strategies for maintaining operational efficiency, managing typical daily bottlenecks, and ensuring high-quality output as a ${normRole} at ${targetCompany}?`,
              type: "technical"
            },
            {
              id: "q_dyn_3",
              text: `Tell me about a scenario where you disagreed with a coworker's standard practices or suggested workflow. How did you resolve the conflict productively?`,
              type: "behavioral"
            },
            {
              id: "q_dyn_4",
              text: `As a Mid Level professional at ${targetCompany}, how do you audit your deliverables, identify potential quality leaks, and proactively optimize execution workflows?`,
              type: "technical"
            }
          ];
        }
      }
    }

    return res.json({ questions: fallbackQuestions });
  }

  try {
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: sysPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["questions"],
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["text", "type"],
                properties: {
                  text: { type: Type.STRING, description: "The complete spelled-out voiced question." },
                  type: { type: Type.STRING, description: "Type of content: behavioral, technical, or follow-up." },
                },
              },
            },
          },
        },
      },
    });

    const body = JSON.parse(response.text?.trim() || "{}");
    const formattedQuestions = (body.questions || []).map((q: any, idx: number) => ({
      id: `q-${idx + 1}-${Date.now()}`,
      text: q.text,
      type: q.type || "behavioral",
    }));

    res.json({ questions: formattedQuestions });
  } catch (error: any) {
    console.error("Gemini Question Generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to analyze an individual answer transcript & fusion metrics (Modules 4, 5, 6)
app.post("/api/interview/analyze-answer", async (req, res) => {
  const { questionText, transcript, videoMetrics, audioMetrics, settings } = req.body;

  // Robust parsing helper to avoid NaN or undefined scores
  const getNum = (val: any, fallback: number): number => {
    if (typeof val === "number") {
      return isNaN(val) ? fallback : val;
    }
    if (typeof val === "string") {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
  };

  const forceRange = (val: number, fallback: number): number => {
    return isNaN(val) ? fallback : Math.max(0, Math.min(100, val));
  };

  // Safe parsed metrics objects
  const v = {
    postureScore: getNum(videoMetrics?.postureScore, 80),
    eyeContactScore: getNum(videoMetrics?.eyeContactScore, 78),
    handControlScore: getNum(videoMetrics?.handControlScore, 82),
    movementScore: getNum(videoMetrics?.movementScore, 85),
  };

  const a = {
    paceScore: getNum(audioMetrics?.paceScore, 82),
    confidenceScore: getNum(audioMetrics?.confidenceScore, 75),
    clarityScore: getNum(audioMetrics?.clarityScore, 85),
    pauseScore: getNum(audioMetrics?.pauseScore, 80),
  };

  const sysPrompt = `You are an elite communication coach and interview content evaluator.
Your job is to analyze an interview answer transcript in response to the question: "${questionText}".
You must rate the response on:
1. STAR structure alignment (Situation, Task, Action, Result)
2. Value of content and professional relevance
3. Use of common filler words ("um", "like", "actually", "basically", etc.)

Provide structured ratings (0-100 scale), brief human constructive notes for Situation, Task, Action, and Result, list filler words detected, and provide 3 targeted tip bullets for improvement.

Respond in strict JSON format.`;

  const userPrompt = `Candidate details: Applying for ${settings?.experienceLevel || "Mid Level"} ${settings?.role || "Software Engineer"}.
Question: "${questionText}"
Transcript: "${transcript || ""}"`;

  const client = getGeminiClient();
  
  // Standard base evaluation defaults dynamically calculated based on transcript contents
  const normTrans = (transcript || "").toLowerCase();
  
  // 1. Detect filler words
  const fillers = ["like", "um", "uh", "actually", "basically", "literally", "you know", "sort of", "kind of"];
  const foundFillers: string[] = [];
  let fillerCount = 0;
  
  fillers.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = normTrans.match(regex);
    if (matches && matches.length > 0) {
      if (!foundFillers.includes(word)) {
        foundFillers.push(word);
      }
      fillerCount += matches.length;
    }
  });

  const fillerWordScore = Math.max(40, 100 - fillerCount * 6);

  // 2. STAR alignment check
  const situationKeywords = ["situation", "context", "background", "team", "project", "company", "role", "work", "initially", "when", "encountered", "issue", "problem", "challenge"];
  const taskKeywords = ["task", "goal", "responsibility", "target", "objective", "required", "assessed", "mandate", "duty", "duties", "assigned"];
  const actionKeywords = ["action", "built", "implemented", "resolved", "solved", "designed", "wrote", "developed", "executed", "configured", "analyzed", "refactored", "debugged", "created", "led"];
  const resultKeywords = ["result", "outcome", "metric", "percent", "impact", "delivered", "metrics", "increase", "reduction", "growth", "saved", "%", "improved", "optimized", "scale"];

  const hasSituation = situationKeywords.some(kw => normTrans.includes(kw));
  const hasTask = taskKeywords.some(kw => normTrans.includes(kw));
  const hasAction = actionKeywords.some(kw => normTrans.includes(kw));
  const hasResult = resultKeywords.some(kw => normTrans.includes(kw));

  let starScore = 40;
  if (hasSituation) starScore += 15;
  if (hasTask) starScore += 15;
  if (hasAction) starScore += 15;
  if (hasResult) starScore += 15;
  if (normTrans.length > 200) starScore += 10;
  starScore = Math.min(100, starScore);

  // 3. Content value & relevance
  let contentScore = 50;
  const transLength = normTrans.trim().length;
  if (transLength > 300) contentScore += 30;
  else if (transLength > 150) contentScore += 20;
  else if (transLength > 50) contentScore += 10;

  const professionalKeywords = ["code", "system", "scale", "performance", "team", "align", "process", "quality", "customer", "architecture", "database", "api", "communication", "collaborate", "solve", "handle", "manage"];
  let richMatches = 0;
  professionalKeywords.forEach(kw => {
    if (normTrans.includes(kw)) richMatches++;
  });
  contentScore += Math.min(20, richMatches * 3);
  contentScore = Math.min(100, contentScore);

  const roleStr = settings?.role || "Software Engineer";
  const lvlStr = settings?.experienceLevel || "Mid Level";
  const compStr = settings?.company || "Target Company";

  const dynamicStarFeedback = {
    situation: hasSituation 
      ? `Successfully detailed the backdrop and operational parameters of your work as a ${lvlStr} ${roleStr} at ${compStr}.`
      : `The situation backdrop is a bit sparse. Consider describing your project background, team setup, and role at ${compStr} in more detail.`,
    task: hasTask
      ? `Clearly highlighted the specific objectives, assignments, and architectural requirements expected of you.`
      : `Objective objectives are slightly vague. Clearly state the exact target and problem statement assigned to you.`,
    action: hasAction
      ? `Exemplary breakdown of personal codebase enhancements, communication strategy, and task execution.`
      : `Needs a stronger showcase of hands-on execution. Detail the specific steps, code libraries, or designs YOU contributed.`,
    result: hasResult
      ? `Provided strong, quantitative milestones, showing direct team value and performance outcomes.`
      : `Missing quantifiable results. To improve impact, explicitly mention metrics, throughput times, latency reduction, or team performance.`
  };

  const dynamicTips: string[] = [];
  if (!hasSituation) {
    dynamicTips.push(`Open your reply with a solid 2-sentence context about the project, division, or technical stack environment.`);
  } else {
    dynamicTips.push(`Enrich the situation background with more details about team dynamics or code-level complexity.`);
  }

  if (!hasResult) {
    dynamicTips.push(`Support technical achievements with concrete percentage indicators (e.g. latency, throughput, load times).`);
  } else {
    dynamicTips.push(`Quantify the business level impact or cost reductions of the final output.`);
  }

  if (fillerCount > 1) {
    dynamicTips.push(`Reduce use of filler phrases like ${foundFillers.map(f => `'${f}'`).join(', ')} to boost technical authority.`);
  } else {
    dynamicTips.push(`Continue practicing deliberate pauses to split ideas clearly instead of filler phrases.`);
  }

  const baseContentEval = {
    contentScore,
    starScore,
    fillerWordScore,
    starFeedback: dynamicStarFeedback,
    fillerWordsFound: foundFillers.length > 0 ? foundFillers : ["like"],
    tips: dynamicTips.slice(0, 3)
  };

  let contentEval = { ...baseContentEval };

  if (client && transcript && transcript.trim().length > 3) {
    try {
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: sysPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["contentScore", "starScore", "fillerWordScore", "starFeedback", "fillerWordsFound", "tips"],
            properties: {
              contentScore: { type: Type.INTEGER, description: "Score 0-100 representing standard relevance & depth." },
              starScore: { type: Type.INTEGER, description: "Score 0-100 indicating STAR methodology application." },
              fillerWordScore: { type: Type.INTEGER, description: "Score 0-100 reflecting low filler word density." },
              starFeedback: {
                type: Type.OBJECT,
                required: ["situation", "task", "action", "result"],
                properties: {
                  situation: { type: Type.STRING },
                  task: { type: Type.STRING },
                  action: { type: Type.STRING },
                  result: { type: Type.STRING },
                },
              },
              fillerWordsFound: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of detected placeholder filler words.",
              },
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 3 actionable suggestions.",
              },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      
      // Resilient deep merge to avoid NaN or missing attributes
      contentEval = {
        contentScore: getNum(parsed.contentScore, baseContentEval.contentScore),
        starScore: getNum(parsed.starScore, baseContentEval.starScore),
        fillerWordScore: getNum(parsed.fillerWordScore, baseContentEval.fillerWordScore),
        starFeedback: {
          situation: parsed.starFeedback?.situation || baseContentEval.starFeedback.situation,
          task: parsed.starFeedback?.task || baseContentEval.starFeedback.task,
          action: parsed.starFeedback?.action || baseContentEval.starFeedback.action,
          result: parsed.starFeedback?.result || baseContentEval.starFeedback.result,
        },
        fillerWordsFound: Array.isArray(parsed.fillerWordsFound) ? parsed.fillerWordsFound : baseContentEval.fillerWordsFound,
        tips: Array.isArray(parsed.tips) && parsed.tips.length > 0 ? parsed.tips : baseContentEval.tips,
      };
    } catch (err) {
      console.error("Gemini Transcript Evaluation Error, using resilient fallback:", err);
      // Ensure we keep initial baseContentEval on error
      contentEval = { ...baseContentEval };
    }
  }

  // --- MODULE 6: FEATURE FUSION ---
  // Inputs: Video Scores (v) + Voice Scores (a) + Transcript Scores (contentEval)
  const videoAvg = (v.postureScore + v.eyeContactScore + v.handControlScore + v.movementScore) / 4;
  const audioAvg = (a.paceScore + a.confidenceScore + a.clarityScore + a.pauseScore) / 4;
  const contentAvg = (contentEval.contentScore + contentEval.starScore + contentEval.fillerWordScore) / 3;

  // Fusion weighting math
  const confidenceScore = forceRange(Math.round(audioAvg * 0.4 + v.eyeContactScore * 0.3 + contentEval.contentScore * 0.3), 75);
  const engagementScore = forceRange(Math.round(v.movementScore * 0.3 + a.paceScore * 0.3 + contentEval.starScore * 0.4), 78);
  const professionalismScore = forceRange(Math.round(v.postureScore * 0.3 + v.handControlScore * 0.3 + contentAvg * 0.4), 80);
  const nervousnessScore = forceRange(Math.round(
    100 - (v.handControlScore * 0.3 + a.confidenceScore * 0.4 + a.pauseScore * 0.3)
  ), 25);
  const communicationScore = forceRange(Math.round(contentAvg * 0.5 + a.clarityScore * 0.3 + a.paceScore * 0.2), 82);

  const overallScore = forceRange(Math.round(confidenceScore * 0.3 + professionalismScore * 0.4 + communicationScore * 0.3), 78);

  const finalScores = {
    ...v,
    ...a,
    ...contentEval,
    overallScore,
    engagementScore,
    professionalismScore,
    nervousnessScore,
    communicationScore,
  };

  res.json(finalScores);
});

// API endpoint to generate custom roadmap (Module 9)
app.post("/api/roadmap/generate", async (req, res) => {
  const { role, currentGoals, weaknesses, historySummary } = req.body;

  const sysPrompt = `You are a Chief Technology Coach, Interview Expert, and Career Strategist.
A candidate needs a highly customized week-by-week timeline plan (4-week roadmap) to elevate their interview skills and conquer weakness patterns.

Given their:
- Target Role
- Key Goals
- Custom Weaknesses Found (e.g. eye contact, filler words, technical articulation)
- Past session statistics

Synthesize a responsive custom roadmap containing:
1. Target Role focus
2. Identified Missing Skills
3. List of primary weaknesses
4. A highly structured 4-week task list where each week features a unique topic, estimated study duration, clear description, and exactly 3 concrete action items.

You must respond in strict JSON format.`;

  const userPrompt = `Generate a personalized interview skill booster roadmap for role: "${role || "Senior Cloud Engineer"}".
Goals: "${currentGoals || "Clear key tier-1 tech coding and high-level behavioral rounds"}"
Known Weaknesses: "${weaknesses || "Has slouching postures, excessive fidgets, says like/um quite often, skips STAR actions"}"
History stats: "${historySummary || "Average overall interview performance around 71/100"}"`;

  const client = getGeminiClient();
  let roadmapResult = {
    roadmapId: `rd_${Date.now()}`,
    generatedAt: new Date().toISOString(),
    role: role || "Senior Cloud Engineer",
    missingSkills: ["STAR articulation structure", "Physical feedback self-touch reduction", "Consistent direct eye line holding"],
    weaknessPatterns: ["Slouches under pressure", "Filler word usage under tension", "Rushing past action elaboration"],
    tasks: [
      {
        week: "Week 1",
        topic: "Physical Alignment & Micro-fidget Elimination",
        duration: "5 hours",
        description: "Focus on fixing critical slouching angles and stabilizing hand habits in front of camera lenses.",
        actionItems: [
          "Calibrate workspace heights so camera stays at direct eye level to boost alignment statistics model outputs.",
          "Perform 3 simulated posture exercises keeping shoulders aligned.",
          "Review live feedback widget outputs under dynamic mock loops.",
        ],
      },
      {
        week: "Week 2",
        topic: "Pacing & Filler Word Reduction",
        duration: "6 hours",
        description: "Eliminate repetitive pauses and filler phrasing while optimizing the pacing rate index.",
        actionItems: [
          "Practice taking deliberate breath pauses instead of fill words.",
          "Deliver short answer transcripts analyzing delivery rhythm markers.",
          "Set vocal guides between 120 and 150 words per minute during responses.",
        ],
      },
      {
        week: "Week 3",
        topic: "Mastering the STAR Narrative Action Block",
        duration: "8 hours",
        description: "Re-frame project explanations concentrating specifically on Actions and quantitative Results.",
        actionItems: [
          "Rewrite three major engineering scenarios focusing detailedly on specific individual tasks.",
          "Prepare specific key performance indicators for every outcome.",
          "Self-record and parse files utilizing system STAR trackers.",
        ],
      },
      {
        week: "Week 4",
        topic: "Advanced Live Pressure Integration",
        duration: "8 hours",
        description: "Simulate high pressure situations by fusing delivery style with technical confidence.",
        actionItems: [
          "Conduct complete mock series including composite voice and landmark indicators.",
          "Confirm overall scoring metrics cross past 85/100 thresholds.",
          "Extract and download summary charts for resume reference.",
        ],
      },
    ],
  };

  if (client) {
    try {
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: sysPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["role", "missingSkills", "weaknessPatterns", "tasks"],
            properties: {
              role: { type: Type.STRING },
              missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknessPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["week", "topic", "duration", "description", "actionItems"],
                  properties: {
                    week: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    description: { type: Type.STRING },
                    actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      roadmapResult = {
        roadmapId: `rd_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        ...parsed,
      };
    } catch (err) {
      console.error("Gemini Roadmap generation error, fallback generated:", err);
    }
  }

  // Save generated roadmap automatically to database
  const db = readDB();
  db.roadmaps.unshift(roadmapResult);
  writeDB(db);

  res.json(roadmapResult);
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Polaris Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
