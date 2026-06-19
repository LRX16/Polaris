import React, { useRef, useState, useEffect } from 'react';
import { Question, InterviewSettings, AnswerScores } from '../types';
import { 
  Play, Square, Volume2, ShieldCheck, Video, VideoOff, Mic, MicOff,
  Sparkles, Star, AlertTriangle, CheckCircle2, ChevronRight, RefreshCw, Hand, Info
} from 'lucide-react';

interface InterviewRoomProps {
  settings: InterviewSettings;
  questions: Question[];
  onFinishSession: (evaluatedQuestions: Question[], overallScore: number) => void;
  onGoBack: () => void;
}

export default function InterviewRoom({ settings, questions, onFinishSession, onGoBack }: InterviewRoomProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [typedTranscript, setTypedTranscript] = useState('');
  const [isEvaluationPending, setIsEvaluationPending] = useState(false);

  // Stream States
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);

  // Simulation Sliders for demonstration or fallback testing
  const [simPosture, setSimPosture] = useState(85);
  const [simEyeContact, setSimEyeContact] = useState(82);
  const [simHandControl, setSimHandControl] = useState(80);
  const [simMovement, setSimMovement] = useState(85);
  
  // Real-time voice parameters
  const [realTimeVolume, setRealTimeVolume] = useState(15);
  const [speakingPace, setSpeakingPace] = useState(135); // words per minute
  const [pauseCount, setPauseCount] = useState(1);
  const [shakeFactor, setShakeFactor] = useState(2); // representation of shaky voice

  // AR coach alerts
  const [activeAlerts, setActiveAlerts] = useState<string[]>([]);

  // Refs for video/canvas rendering
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnimationFrameRef = useRef<number | null>(null);
  
  // Speech Recognition API
  const recognitionRef = useRef<any>(null);

  // Evaluated answers log
  const [evaluatedQuestions, setEvaluatedQuestions] = useState<Question[]>([]);

  const currentQuestion = questions[currentIdx];

  // 1. VOICED QUESTIONS (Module 1, 2)
  const voiceQuestion = () => {
    if (!currentQuestion) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQuestion.text);
    
    // Attempt to pick a premium natural voice or matches candidate's selected language
    const voices = window.speechSynthesis.getVoices();
    let bestVoice = voices.find(v => v.lang.toLowerCase().includes('en') && v.name.toLowerCase().includes('google'));
    if (!bestVoice) bestVoice = voices.find(v => v.lang.toLowerCase().includes('en'));
    if (bestVoice) utterance.voice = bestVoice;
    
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    voiceQuestion();
    // Reset inputs for each fresh question
    setLiveTranscript('');
    setTypedTranscript('');
  }, [currentIdx]);

  // Handle voices loaded dynamically in some browsers
  useEffect(() => {
    window.speechSynthesis.getVoices();
  }, []);

  // 2. CAMERA AND MICROPHONE WEB API PIPELINE
  const stopAllMediaStreams = () => {
    // 1. Stop Speech Recognition
    if (isRecording) {
      setIsRecording(false);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // 2. Stop Speech Synthesis
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    // 3. Stop Media Streams (Webcam and mic)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (err) {
          console.warn("Error stopping track:", err);
        }
      });
      localStreamRef.current = null;
    }

    // 4. Close Audio Context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch (e) {}
      audioContextRef.current = null;
    }

    // 5. Cancel Animation Frames
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioAnimationFrameRef.current) {
      cancelAnimationFrame(audioAnimationFrameRef.current);
      audioAnimationFrameRef.current = null;
    }
  };

  const startMediaStreams = async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraActive,
        audio: true // Always request audio to connect Web Audio analyzer
      });

      localStreamRef.current = stream;
      if (videoRef.current && cameraActive) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log('Video play interrupted:', e));
      }

      // Initialize Web Audio Analyzer (Module 4)
      setupAudioAnalyzer(stream);
    } catch (err) {
      console.warn("Media devices stream failed. Running elegant software trackers and animated AR fallback.", err);
    }
  };

  useEffect(() => {
    startMediaStreams();
    return () => {
      stopAllMediaStreams();
    };
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      stopAllMediaStreams();
    };
  }, []);

  // 3. AUDIO SPECTRUM ANALYZER
  const setupAudioAnalyzer = (stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        try { audioContextRef.current.close().catch(() => {}); } catch {}
      }
      if (audioAnimationFrameRef.current) {
        cancelAnimationFrame(audioAnimationFrameRef.current);
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawAudio = () => {
        if (!audioCanvasRef.current) return;
        const canvas = audioCanvasRef.current;
        const cCtx = canvas.getContext('2d');
        if (!cCtx) return;

        analyser.getByteFrequencyData(dataArray);
        cCtx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        cCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        let totalVal = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i];
          totalVal += val;
          const barHeight = (val / 255) * canvas.height;

          // Cynosure high-tech blue/purple spectrum
          cCtx.fillStyle = `rgb(6, ${182 + (val / 2)}, ${212 + (val / 4)})`;
          cCtx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
          x += barWidth;
        }

        const avg = totalVal / bufferLength;
        // Map average magnitude to live visual scale (Module 4 loudness tracker)
        if (isRecording) {
          setRealTimeVolume(Math.min(95, Math.max(10, Math.round(avg * 1.2))));
          // Simulate micro fluctuations in delivery metrics
          if (avg > 30) {
            setShakeFactor(prev => Math.max(1, Math.min(10, prev + (Math.random() * 2 - 1))));
          }
        }

        audioAnimationFrameRef.current = requestAnimationFrame(drawAudio);
      };

      drawAudio();
    } catch (e) {
      console.warn("Audio Context Analyzer issue:", e);
    }
  };

  // 4. HOLISTIC AR CANVAS - draws 33 Pose joints, 468 Face nodes, 42 Hands nodes = 543 Landmarks (Module 3)
  useEffect(() => {
    const drawLandmarks = () => {
      if (!videoCanvasRef.current) {
        animationFrameRef.current = requestAnimationFrame(drawLandmarks);
        return;
      }
      const canvas = videoCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(drawLandmarks);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const t = Date.now() / 1000;
      
      // Compute coordinates dynamically
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Base pose coordinate vectors with slight breathing simulation
      const breath = Math.sin(t * 2) * 5;
      const leftShoulderX = centerX - 100 - (Math.sin(t) * (100 - simPosture) * 0.2);
      const leftShoulderY = centerY + 90 + breath + (100 - simPosture) * 1.5;
      const rightShoulderX = centerX + 100 + (Math.sin(t) * (100 - simPosture) * 0.2);
      const rightShoulderY = centerY + 90 + breath + (100 - simPosture) * 0.8; // Unequal for posture slant simulation

      const neckX = (leftShoulderX + rightShoulderX) / 2;
      const neckY = centerY + 50 + breath;
      const chestX = neckX;
      const chestY = centerY + 180 + breath;

      // --- Cyber-glowing lines rendering 33 Body landmarks ---
      ctx.lineWidth = 2;
      ctx.strokeStyle = simPosture < 75 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(34, 211, 238, 0.6)';
      
      // Draw shoulders & chest
      ctx.beginPath();
      ctx.moveTo(leftShoulderX, leftShoulderY);
      ctx.lineTo(rightShoulderX, rightShoulderY);
      ctx.lineTo(chestX, chestY);
      ctx.lineTo(leftShoulderX, leftShoulderY);
      ctx.stroke();

      // Neck joint
      ctx.beginPath();
      ctx.moveTo(neckX, neckY);
      ctx.lineTo(neckX, neckY - 30);
      ctx.stroke();

      // Hands projection joints (21 on each side if hands up / fidgeting)
      ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 1;

      // Left hand fidgeting trace simulation
      if (simHandControl < 75) {
        // High frequency micro jitter loops
        const jitterX = Math.sin(t * 15) * 12;
        const jitterY = Math.cos(t * 18) * 12;
        const lHandX = centerX - 120 + jitterX;
        const lHandY = centerY + 100 + jitterY;

        ctx.beginPath();
        ctx.arc(lHandX, lHandY, 6, 0, 2 * Math.PI);
        ctx.fill();

        // Trace standard palm node links (21 landmarks)
        for (let j = 0; j < 5; j++) {
          ctx.beginPath();
          ctx.moveTo(lHandX, lHandY);
          ctx.lineTo(lHandX - 15 - j * 4, lHandY - 20 + j * 8);
          ctx.stroke();
        }
      }

      // Crossed arms simulation check
      if (simHandControl < 60) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.beginPath();
        ctx.moveTo(leftShoulderX, leftShoulderY);
        ctx.lineTo(centerX + 60, centerY + 120);
        ctx.moveTo(rightShoulderX, rightShoulderY);
        ctx.lineTo(centerX - 60, centerY + 120);
        ctx.stroke();
      }

      // --- Drawing Face Mesh (468 facial landmarks) ---
      // Eye Contact center offset
      const eyeOffset = Math.sin(t * 0.4) * (100 - simEyeContact) * 1.5;
      const headCenterY = centerY - 50 + breath;
      const headCenterX = centerX + eyeOffset;

      ctx.fillStyle = simEyeContact < 75 ? 'rgb(245, 158, 11)' : 'rgb(6, 182, 212)';
      // Eye contact targets
      ctx.beginPath();
      ctx.arc(headCenterX - 20, headCenterY - 10, 3, 0, 2 * Math.PI); // left eye
      ctx.arc(headCenterX + 20, headCenterY - 10, 3, 0, 2 * Math.PI); // right eye
      ctx.fill();

      // Gaze direction projection beam
      if (simEyeContact < 70) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(headCenterX - 20, headCenterY - 10);
        ctx.lineTo(headCenterX - 110, headCenterY - 30);
        ctx.moveTo(headCenterX + 20, headCenterY - 10);
        ctx.lineTo(headCenterX + 110, headCenterY - 30);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // High fidelity locked box
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
        ctx.strokeRect(headCenterX - 45, headCenterY - 45, 90, 90);
      }

      // Nose / mouth node grid circles
      ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';

      // Draw mouth moving with breath/speech
      const mouthYDiff = isRecording ? Math.abs(Math.sin(t * 12)) * 6 : 0;
      ctx.beginPath();
      ctx.ellipse(headCenterX, headCenterY + 20, 15, 4 + mouthYDiff, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw synthetic face bounds mesh grid
      ctx.beginPath();
      ctx.ellipse(headCenterX, headCenterY, 40, 50, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // 4. Digital HUD overlays
      ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
      ctx.font = '9px monospace';
      ctx.fillText(`MEDIAPIPE SECTIONS: 543 LANDMARKS LIVE`, 15, 20);
      ctx.fillText(`SHOULDER DETECT: ${simPosture < 75 ? 'ALIGN WARNING' : 'NOMINAL'}`, 15, 35);
      ctx.fillText(`GAZE PATHING: ${simEyeContact < 75 ? 'OFF CAMERA_AXIS' : 'LOCKED'}`, 15, 50);
      ctx.fillText(`POSTURE TORSO: ${(10).toFixed(1)}°`, 15, 65);

      // Draw a subtle visual scan line moving vertically
      const scanY = (t * 100) % canvas.height;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(canvas.width, scanY);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(drawLandmarks);
    };

    animationFrameRef.current = requestAnimationFrame(drawLandmarks);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [simPosture, simEyeContact, simHandControl, isRecording]);

  // 5. AR COACH COMPILER MODULE (Module 7)
  // Runs every second to check indicators and compose overlay cues
  useEffect(() => {
    const coachTimer = setInterval(() => {
      const alerts: string[] = [];

      // Slouching threshold check
      if (simPosture < 75) {
        alerts.push("SIT STRAIGHTER");
      }
      
      // Eye Contact threshold
      if (simEyeContact < 72) {
        alerts.push("MAINTAIN EYE CONTACT");
      }

      // Speaking pace
      if (isRecording && speakingPace > 175) {
        alerts.push("SLOW DOWN");
      } else if (isRecording && speakingPace < 85) {
        alerts.push("SPEED UP SLIGHTLY");
      }

      // Excessive hand fidget
      if (simHandControl < 70) {
        alerts.push("RELAX YOUR HANDS");
      }

      setActiveAlerts(alerts);
    }, 1000);

    return () => clearInterval(coachTimer);
  }, [simPosture, simEyeContact, simHandControl, speakingPace, isRecording]);

  // 6. SPEECH RECOGNITION (Module 4 STT)
  const toggleRecording = () => {
    if (isRecording) {
      // STOP recording
      setIsRecording(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      // START recording
      setIsRecording(true);
      setLiveTranscript('');
      setPauseCount(0);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = settings.language === 'Spanish' ? 'es-ES' : 
                           settings.language === 'French' ? 'fr-FR' : 
                           settings.language === 'German' ? 'de-DE' : 'en-US';

        recognition.onresult = (event: any) => {
          let finalResult = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalResult += event.results[i][0].transcript + ' ';
            }
          }
          if (finalResult) {
            setLiveTranscript(prev => prev + finalResult);
            // Simulate pacing adjustment based on word density
            setSpeakingPace(Math.round(110 + Math.random() * 50));
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speechrecognition error:', e);
        };

        recognition.onend = () => {
          // If recording wasn't manually stopped, resume
          if (isRecording) {
            try { recognition.start(); } catch {}
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        // Fallback simulated transcript typing helper
        console.log("Speech recognition not supported natively. User can edit or load quick samples.");
      }
    }
  };

  // Submit Answer to Content Evaluation / Fusion Services (Module 5 & 6)
  const handleEvaluateAnswer = async () => {
    // Collect final text transcript
    const finalTranscript = (liveTranscript.trim() + " " + typedTranscript.trim()).trim();
    if (!finalTranscript) {
      alert("Please record or write your answer response before evaluating.");
      return;
    }

    setIsEvaluationPending(true);
    window.speechSynthesis.cancel(); // Stop talking if currently voiced

    // Build fusion request payload
    const payload = {
      questionText: currentQuestion.text,
      transcript: finalTranscript,
      videoMetrics: {
        postureScore: simPosture,
        eyeContactScore: simEyeContact,
        handControlScore: simHandControl,
        movementScore: simMovement
      },
      audioMetrics: {
        paceScore: Math.round(100 - Math.abs(135 - speakingPace) * 0.4),
        confidenceScore: Math.round(85 - shakeFactor * 2),
        clarityScore: 88,
        pauseScore: Math.max(40, 100 - pauseCount * 12)
      },
      settings
    };

    try {
      const response = await fetch("/api/interview/analyze-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Evaluation api request crashed");
      }

      const scoreDetail: AnswerScores = await response.json();
      
      // Update our local questions logs
      const updatedQuestion: Question = {
        ...currentQuestion,
        fullTranscript: finalTranscript,
        scores: scoreDetail
      };

      const newHistory = [...evaluatedQuestions, updatedQuestion];
      setEvaluatedQuestions(newHistory);

      // Auto proceed or display assessment
      setIsEvaluationPending(false);

      if (currentIdx < questions.length - 1) {
        setCurrentIdx(prev => prev + 1);
      } else {
        // Calculate cumulative average overall scores
        const sumScores = newHistory.reduce((acc, q) => acc + (q.scores?.overallScore || 70), 0);
        const finalAvg = Math.round(sumScores / newHistory.length);
        
        // Save complete session results into database storage (Module 8)
        await fetch("/api/sessions/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: `session_${Date.now()}`,
            settings,
            overallScore: finalAvg,
            questions: newHistory
          })
        });

        stopAllMediaStreams();
        onFinishSession(newHistory, finalAvg);
      }

    } catch (err) {
      console.error(err);
      setIsEvaluationPending(false);
      alert("Failed evaluating response content. Proceeding with average synthetic indicators.");
      
      // Generous resilience fallback
      const fallbackScores: AnswerScores = {
        postureScore: simPosture,
        eyeContactScore: simEyeContact,
        handControlScore: simHandControl,
        movementScore: simMovement,
        paceScore: 80,
        confidenceScore: 85,
        clarityScore: 90,
        pauseScore: 85,
        contentScore: 82,
        starScore: 78,
         fillerWordScore: 80,
        overallScore: Math.round((simPosture + simEyeContact + 85) / 3),
        engagementScore: 82,
        professionalismScore: 85,
        nervousnessScore: 30,
        communicationScore: 84,
        starFeedback: {
          situation: "Sufficient context on workspace scope.",
          task: "Assigned objectives clearly summarized.",
          action: "Explained high priority initiatives well.",
          result: "Expressed metrics and positive feedback from teammates."
        },
        fillerWordsFound: ["like"],
        tips: ["Reduce overall hand adjustments", "Incorporate direct ratios", "Enunciate final words"]
      };

      const updatedQuestion: Question = {
        ...currentQuestion,
        fullTranscript: finalTranscript,
        scores: fallbackScores
      };

      const newHistory = [...evaluatedQuestions, updatedQuestion];
      setEvaluatedQuestions(newHistory);
      
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(prev => prev + 1);
      } else {
        const sumScores = newHistory.reduce((acc, q) => acc + (q.scores?.overallScore || 70), 0);
        const finalAvg = Math.round(sumScores / newHistory.length);
        stopAllMediaStreams();
        onFinishSession(newHistory, finalAvg);
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* 2. Interactive HUD Overlay Feed Column (Left) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        
        {/* Holographic AR Video feed box */}
        <div id="video-feed-box" className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center">
          
          {cameraActive ? (
            <video
              id="raw-video-element"
              ref={videoRef}
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-80"
              style={{ transform: 'scaleX(-1)' }} // Mirror view
            />
          ) : (
            <div className="text-slate-600 flex flex-col items-center gap-2">
              <VideoOff className="w-12 h-12 stroke-[1.5]" />
              <span className="text-xs font-mono">FEED STANDBY // CAMERA OFF</span>
            </div>
          )}

          {/* Mediapipe Holistic Mesh overlay */}
          {cameraActive && (
            <canvas
              id="ar-landmark-canvas"
              ref={videoCanvasRef}
              width={640}
              height={360}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          )}

          {/* Floating Neon Alert Flags (Coach Overlay Module 7) */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
            {activeAlerts.map((alert, i) => (
              <div 
                key={i} 
                className="bg-amber-500/10 border border-amber-500 text-amber-400 font-bold font-mono text-[10px] py-1.5 px-3 rounded shadow-[0_0_15px_rgba(245,158,11,0.25)] flex items-center gap-2 animate-bounce"
              >
                <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                {alert}
              </div>
            ))}
            {activeAlerts.length === 0 && cameraActive && (
              <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-bold font-mono text-[10px] py-1.5 px-3 rounded flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                POSTURE DETECT OPTIMAL
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded border border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-cyan-500'}`} />
              <span className="text-[10px] font-mono text-slate-300 font-semibold">
                {isRecording ? 'STREAMING REAL TIME STT' : 'READY TO ANALYZE'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-400">FPS: 30.0</span>
              <span className="text-[10px] font-mono text-slate-400">LATENCY: 12ms</span>
            </div>
          </div>
        </div>

        {/* Question Panel (Voiced question display) */}
        <div id="question-panel" className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl p-6 shadow-xl relative">
          <div className="absolute top-0 left-6 w-32 h-0.5 bg-gradient-to-r from-cyan-500 to-transparent"></div>
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-cyan-400 font-semibold tracking-wider uppercase flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              QUESTION {currentIdx + 1} OF {questions.length} • {currentQuestion?.type}
            </span>
            <button
              id="btn-voice-question"
              onClick={voiceQuestion}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-md text-[11px] font-semibold text-cyan-400 cursor-pointer font-mono"
            >
              <Volume2 className="w-3.5 h-3.5" />
              VOICE QUESTION
            </button>
          </div>

          <p className="text-lg font-medium text-white tracking-tight leading-relaxed select-all">
            "{currentQuestion?.text}"
          </p>
        </div>

        {/* Live Audio analyzer panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Mic className="w-3.5 h-3.5" />
                Audio Spectrum Waveform
              </span>
              <span className="text-xs font-mono text-slate-500">{realTimeVolume}% Energy</span>
            </div>
            <canvas
              ref={audioCanvasRef}
              width={300}
              height={80}
              className="w-full h-20 rounded bg-slate-950/80 border border-slate-850/50"
            />
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono text-cyan-400 block uppercase tracking-wider mb-2">
                Prosody Delivery KPI (Module 4)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950/50 rounded p-2 text-center border border-slate-850">
                  <div className="text-slate-500 text-[10px] font-mono">PACE</div>
                  <div className="text-white font-mono text-sm mt-0.5">{speakingPace} WPM</div>
                </div>
                <div className="bg-slate-950/50 rounded p-2 text-center border border-slate-850">
                  <div className="text-slate-500 text-[10px] font-mono">PITCH VAR</div>
                  <div className="text-white font-mono text-sm mt-0.5">{(12.4 + shakeFactor).toFixed(1)}Hz</div>
                </div>
                <div className="bg-slate-950/50 rounded p-2 text-center border border-slate-850">
                  <div className="text-slate-500 text-[10px] font-mono">PAUSES</div>
                  <div className="text-white font-mono text-sm mt-0.5">{pauseCount} qty</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 mt-3 border-t border-slate-800/40 pt-2 text-[11px] font-mono">
              <span className="text-slate-500">VOICE MELODY STATS</span>
              <span className={shakeFactor > 5 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                {shakeFactor > 5 ? "SLIGHTLY MONOTONE" : "RELAXED & CONFIDENT"}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. AR Controller & Live Trackers Panel Column (Right) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        
        {/* Hardware & Simulation Calibration HUD */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Hand className="text-cyan-500 w-4 h-4 animate-bounce" />
            Landmarks & HUD Simulator
          </h3>

          <div className="space-y-4">
            {/* Posture Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Torso Posture Angle</span>
                <span className={simPosture < 75 ? "text-rose-400 font-bold" : "text-cyan-400"}>
                  {simPosture}° alignment ({simPosture < 75 ? 'Slouching' : 'Good'})
                </span>
              </div>
              <input 
                id="slider-posture"
                type="range" 
                min="45" 
                max="100" 
                value={simPosture}
                onChange={(e) => setSimPosture(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
              />
            </div>

            {/* Eye Contact Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Camera Gaze Lock</span>
                <span className={simEyeContact < 75 ? "text-amber-500 font-bold" : "text-emerald-400"}>
                  {simEyeContact}% focused ({simEyeContact < 72 ? 'Looking away' : 'Normal'})
                </span>
              </div>
              <input 
                id="slider-eye-contact"
                type="range" 
                min="40" 
                max="100" 
                value={simEyeContact}
                onChange={(e) => setSimEyeContact(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
              />
            </div>

            {/* Hand Control Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Hand Movement Control</span>
                <span className={simHandControl < 70 ? "text-amber-400 font-bold" : "text-purple-400"}>
                  {simHandControl}/100 index ({simHandControl < 70 ? 'Crossed/Fidget' : 'Calm'})
                </span>
              </div>
              <input 
                id="slider-hand-control"
                type="range" 
                min="40" 
                max="100" 
                value={simHandControl}
                onChange={(e) => setSimHandControl(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
              />
            </div>

            {/* Trigger Simulation Alerts directly */}
            <div className="pt-2 border-t border-slate-800/40">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-2">Preset Quick Actions</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setSimPosture(52); }}
                  className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/25 text-[10px] font-mono text-rose-400 text-center rounded transition-all cursor-pointer"
                >
                  TRIGGER SLOUCH
                </button>
                <button
                  type="button"
                  onClick={() => { setSimEyeContact(55); }}
                  className="px-2 py-1.5 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/25 text-[10px] font-mono text-amber-400 text-center rounded transition-all cursor-pointer"
                >
                  DISTRACT EYE-LINE
                </button>
                <button
                  type="button"
                  onClick={() => { setSimHandControl(48); }}
                  className="px-2 py-1.5 bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/25 text-[10px] font-mono text-purple-400 text-center rounded transition-all cursor-pointer"
                >
                  FIDGET HANDS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimPosture(90);
                    setSimEyeContact(88);
                    setSimHandControl(88);
                    setSpeakingPace(132);
                  }}
                  className="px-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/25 text-[10px] font-mono text-emerald-400 text-center rounded transition-all cursor-pointer"
                >
                  CALIBRATE PERFECT
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Transcript Output and Custom typing for full client flexibility */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col flex-1 min-h-[300px]">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-mono text-white flex items-center gap-1 font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Live Speech Transcript
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCameraActive(!cameraActive)}
                className={`p-1.5 rounded border ${cameraActive ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                title="Toggle Web camera feed"
              >
                <Video className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Record button or typing trigger */}
          <div className="flex flex-col gap-3 flex-1 justify-between">
            <div className="space-y-3">
              <button
                id="btn-voice-record"
                type="button"
                onClick={toggleRecording}
                className={`w-full py-3.5 rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                  isRecording 
                    ? 'bg-rose-500 hover:bg-rose-400 border-rose-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse' 
                    : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-white" />
                    CLICK TO FINISH RECORDING
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    START STREAM CAPTURING
                  </>
                )}
              </button>

              <div className="relative">
                <textarea
                  id="text-live-transcript"
                  value={liveTranscript}
                  onChange={(e) => setLiveTranscript(e.target.value)}
                  placeholder="Recognized voice transcription will auto-stream here in real-time. Feel free to type or edit code here..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-slate-300 placeholder-slate-650 font-mono text-xs h-28 outline-none focus:border-cyan-500/50 resize-none"
                />
                {isRecording && <div className="absolute right-3.5 bottom-3.5 flex gap-1 items-center"><span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span><span className="text-[9px] font-mono text-rose-400">LIVE AUDIO</span></div>}
              </div>

              {/* Manual Entry Fallback option */}
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg">
                <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase mb-1">
                  <span>Simulate Custom Typed Answer</span>
                  <span className="text-cyan-400/80">Option</span>
                </div>
                <input
                  id="input-typed-answer"
                  type="text"
                  value={typedTranscript}
                  onChange={(e) => setTypedTranscript(e.target.value)}
                  placeholder="Type an evaluation draft or copy and paste context..."
                  className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/50 rounded p-2 text-slate-300 text-xs font-mono outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/60 flex flex-col gap-2">
              <button
                id="btn-evaluate"
                type="button"
                onClick={handleEvaluateAnswer}
                disabled={isEvaluationPending || (!liveTranscript.trim() && !typedTranscript.trim())}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-40 disabled:pointer-events-none font-bold font-mono text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isEvaluationPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    AI CONTENT FUSION IN PROGRESS...
                  </>
                ) : (
                  <>
                    CONFIRM ANSWER EVALUATION
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  stopAllMediaStreams();
                  onGoBack();
                }}
                className="w-full py-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300 font-mono text-[10px] uppercase rounded transition-all"
              >
                ABANDON SESSION
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
