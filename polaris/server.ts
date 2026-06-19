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
  const sysPrompt = `You are a professional hiring manager and elite technical interviewer at ${company || "a top tier tech company"}.
Your goal is to generate exactly 4 high-quality interview questions tailored for a ${experienceLevel || "Mid"} level ${role || "Software Engineer"}.
The language of the interview must be in ${language || "English"}.
The questions must be structured as:
1. Question 1: Behavioral (STAR methodology oriented).
2. Question 2: Technical/Analytical (Problem-solving, core concepts, or system architecture relevant to ${role}).
3. Question 3: Behavioral (Role and culture fit, handling conflict, cross-functional collaboration).
4. Question 4: Advanced Role-Specific Question (Domain challenges, specific frameworks or optimizations).

You must respond in strict JSON format.`;

  const userPrompt = `Generate 4 interview questions in ${language || "English"} for candidate ${name || "Applicant"} applying for a ${experienceLevel} ${role} role at ${company || "Target Company"}.`;

  const client = getGeminiClient();
  if (!client) {
    // Elegant system fallbacks for quick performance and workspace offline modes
    console.log("No Gemini API key found or default value loaded. Activating fallback generator.");
    const fallbacks = [
      {
        id: "q1",
        text: `Tell me about a challenging project as a ${role} where you faced unexpected obstacles. What did you do, and what was the outcome?`,
        type: "behavioral",
      },
      {
        id: "q2",
        text: `What are your core engineering patterns for optimizing high-load architecture when designing systems for ${role}?`,
        type: "technical",
      },
      {
        id: "q3",
        text: `Describe a scenario where you disagreed on code architecture or project direction with a principal colleague. How did you resolve it?`,
        type: "behavioral",
      },
      {
        id: "q4",
        text: `Based on your experience as a ${experienceLevel} practitioner, how do you handle security vulnerabilities and resource memory leaks in production?`,
        type: "follow-up",
      },
    ];
    return res.json({ questions: fallbacks });
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

  // Defaults fallback scores if metrics are blank (for robust integration)
  const v = videoMetrics || { postureScore: 80, eyeContactScore: 78, handControlScore: 82, movementScore: 85 };
  const a = audioMetrics || { paceScore: 82, confidenceScore: 75, clarityScore: 85, pauseScore: 80 };

  const sysPrompt = `You are an elite communication coach and interview content evaluator.
Your job is to analyze an interview answer transcript in response to the question: "${questionText}".
You must rate the response on:
1. STAR structure alignment (Situation, Task, Action, Result)
2. Value of content and professional relevance
3. Use of common filler words ("um", "like", "actually", "basically", etc.)

Provide structured ratings (0-100 scale), brief human constructive notes for Situation, Task, Action, and Result, list filler words detected, and provide 3 targeted tip bullets for improvement.

Respond in strict JSON format.`;

  const userPrompt = `Candidate details: Applying for ${settings?.experienceLevel} ${settings?.role}.
Question: "${questionText}"
Transcript: "${transcript || ""}"`;

  const client = getGeminiClient();
  let contentEval = {
    contentScore: 75,
    starScore: 70,
    fillerWordScore: 85,
    starFeedback: {
      situation: "A good setup explaining the backdrop situation was provided.",
      task: "Clear responsibilities were mentioned briefly.",
      action: "Identified core steps but could detail code adjustments or personal code involvement more.",
      result: "Presented final metrics, though concrete delivery numbers would increase impact.",
    },
    fillerWordsFound: ["like", "um"],
    tips: [
      "Use more structural STAR cues like 'The specific goal was to...'",
      "Elaborate on quantitative results such as latency reductions or team hours saved.",
      "Vary sentence pacing to reduce natural audio pauses.",
    ],
  };

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
      contentEval = parsed;
    } catch (err) {
      console.error("Gemini Transcript Evaluation Error, using resilient fallback:", err);
    }
  }

  // --- MODULE 6: FEATURE FUSION ---
  // Inputs: Video Scores (v) + Voice Scores (a) + Transcript Scores (contentEval)
  const videoAvg = (v.postureScore + v.eyeContactScore + v.handControlScore + v.movementScore) / 4;
  const audioAvg = (a.paceScore + a.confidenceScore + a.clarityScore + a.pauseScore) / 4;
  const contentAvg = (contentEval.contentScore + contentEval.starScore + contentEval.fillerWordScore) / 3;

  // Fusion weighting math
  const confidenceScore = Math.round(audioAvg * 0.4 + v.eyeContactScore * 0.3 + contentEval.contentScore * 0.3);
  const engagementScore = Math.round(v.movementScore * 0.3 + a.paceScore * 0.3 + contentEval.starScore * 0.4);
  const professionalismScore = Math.round(v.postureScore * 0.3 + v.handControlScore * 0.3 + contentAvg * 0.4);
  const nervousnessScore = Math.round(
    100 - (v.handControlScore * 0.3 + a.confidenceScore * 0.4 + a.pauseScore * 0.3)
  );
  const communicationScore = Math.round(contentAvg * 0.5 + a.clarityScore * 0.3 + a.paceScore * 0.2);

  const overallScore = Math.round(confidenceScore * 0.3 + professionalismScore * 0.4 + communicationScore * 0.3);

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
