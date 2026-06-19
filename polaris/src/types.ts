export interface InterviewSettings {
  name: string;
  role: string;
  experienceLevel: string;
  company: string;
  language: string;
}

export interface Question {
  id: string;
  text: string;
  type: 'behavioral' | 'technical' | 'follow-up';
  fullTranscript?: string;
  scores?: AnswerScores;
}

export interface AnswerScores {
  // Video Metrics (Module 3)
  postureScore: number;
  eyeContactScore: number;
  handControlScore: number;
  movementScore: number;

  // Audio Metrics (Module 4)
  paceScore: number;
  confidenceScore: number;
  clarityScore: number;
  pauseScore: number;

  // Content Evaluation (Module 5)
  contentScore: number;
  starScore: number;
  fillerWordScore: number;
  
  // Feature Fusion (Module 6)
  overallScore: number;
  engagementScore: number;
  professionalismScore: number;
  nervousnessScore: number;
  communicationScore: number;

  // STAR structure detailed feedback
  starFeedback: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  fillerWordsFound: string[];
  tips: string[];
}

export interface InterviewSession {
  sessionId: string;
  date: string;
  settings: InterviewSettings;
  overallScore: number;
  questions: Question[];
}

export interface RoadmapTask {
  week: string;
  topic: string;
  duration: string;
  description: string;
  actionItems: string[];
}

export interface CareerRoadmap {
  roadmapId: string;
  generatedAt: string;
  role: string;
  missingSkills: string[];
  weaknessPatterns: string[];
  tasks: RoadmapTask[];
}
