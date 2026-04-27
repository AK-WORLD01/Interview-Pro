import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Mic, MicOff, Play, Square, Loader2, CheckCircle2,
  Clock, ChevronRight, RotateCcw, Sparkles, Target, TrendingUp,
  AlertTriangle, Award, Zap, Brain, MessageSquare, Shield, Star,
  VideoOff, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

interface InterviewQuestion {
  question: string;
  category: string;
  difficulty: string;
}

interface EvalResult {
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  category_scores: Record<string, number>;
}

const categoryIcons: Record<string, any> = {
  "Technical Knowledge": Brain,
  "Communication": MessageSquare,
  "Problem Solving": Zap,
  "Cultural Fit": Shield,
  "Confidence": Star,
};

const difficultyColor: Record<string, string> = {
  easy: "bg-green-500/10 text-green-400 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  hard: "bg-red-500/10 text-red-400 border-red-500/20",
};

const scoreGrade = (score: number) => {
  if (score >= 90) return { label: "Outstanding", color: "text-green-400", bg: "from-green-500/20 to-emerald-500/20" };
  if (score >= 75) return { label: "Great", color: "text-blue-400", bg: "from-blue-500/20 to-cyan-500/20" };
  if (score >= 60) return { label: "Good", color: "text-yellow-400", bg: "from-yellow-500/20 to-orange-500/20" };
  return { label: "Needs Work", color: "text-red-400", bg: "from-red-500/20 to-pink-500/20" };
};

const containerVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1, duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function getSupportedMimeType(): string {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

const MockInterview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const [step, setStep] = useState<"setup" | "questions" | "interview" | "evaluating" | "results">("setup");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [answers, setAnswers] = useState<{ question: string; answer: string; duration: number }[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [timer, setTimer] = useState(0);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  // Cleanup helpers
  const stopMediaTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stopRecognition = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMediaTracks();
      stopRecognition();
    };
  }, [stopMediaTracks, stopRecognition]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recording) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [recording]);

  const generateQuestions = async () => {
    if (!user) { toast({ title: "Please sign in first", variant: "destructive" }); return; }
    if (!company.trim() || !role.trim()) return;
    setLoadingQ(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { company, role },
      });
      if (error) throw error;
      setQuestions(data?.questions ?? []);
      setStep("questions");
    } catch (err: any) {
      toast({ title: "Failed to generate questions", description: err.message, variant: "destructive" });
    } finally {
      setLoadingQ(false);
    }
  };

  const startInterview = async () => {
    setCameraError(null);
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStep("interview");
      setCurrentQ(0);
      setAnswers([]);
    } catch (err: any) {
      let msg = "Please allow camera and microphone access.";
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "No camera or microphone found. Please connect a device and try again.";
      } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Camera/microphone permission denied. Please allow access in your browser settings.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        msg = "Camera is in use by another application. Please close it and try again.";
      }
      setCameraError(msg);
      toast({ title: "Camera access failed", description: msg, variant: "destructive" });
    } finally {
      setCameraLoading(false);
    }
  };

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) {
      toast({ title: "No camera stream", description: "Please restart the interview.", variant: "destructive" });
      return;
    }

    // Validate audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      toast({ title: "No microphone detected", description: "Audio is required for transcription.", variant: "destructive" });
      return;
    }

    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    try {
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mr = new MediaRecorder(stream, options);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start();
      mediaRecorderRef.current = mr;
    } catch (err: any) {
      toast({ title: "Recording failed", description: "Your browser doesn't support video recording.", variant: "destructive" });
      return;
    }

    setRecording(true);
    setStartTime(Date.now());
    setTimer(0);
    setTranscript("");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (e: any) => {
          let text = "";
          for (let i = 0; i < e.results.length; i++) {
            text += e.results[i][0].transcript;
          }
          setTranscript(text);
        };
        recognition.onerror = (e: any) => {
          if (e.error !== "aborted" && e.error !== "no-speech") {
            console.warn("Speech recognition error:", e.error);
          }
        };
        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        console.warn("Speech recognition unavailable");
      }
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    try { mediaRecorderRef.current?.stop(); } catch {}
    mediaRecorderRef.current = null;
    stopRecognition();
    setRecording(false);
    const duration = Math.round((Date.now() - startTime) / 1000);
    const newAnswer = { question: questions[currentQ].question, answer: transcript, duration };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    if (currentQ < questions.length - 1) {
      setCurrentQ(c => c + 1);
      setTranscript("");
    } else {
      evaluateInterview(updatedAnswers);
    }
  }, [currentQ, questions, transcript, answers, startTime, stopRecognition]);

  const evaluateInterview = async (allAnswers: typeof answers) => {
    setStep("evaluating");
    stopMediaTracks();
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-interview", {
        body: { company, role, answers: allAnswers },
      });
      if (error) throw error;
      setEvalResult(data);
      setStep("results");

      // Save results to database
      if (user && data) {
        const totalDuration = allAnswers.reduce((sum, a) => sum + a.duration, 0);
        await supabase.from("interview_results").insert({
          user_id: user.id,
          company,
          role,
          overall_score: data.overall_score ?? 0,
          category_scores: data.category_scores ?? {},
          strengths: data.strengths ?? [],
          weaknesses: data.weaknesses ?? [],
          improvements: data.improvements ?? [],
          total_duration: totalDuration,
          answers: allAnswers as any,
        });
      }
    } catch (err: any) {
      toast({ title: "Evaluation failed", description: err.message, variant: "destructive" });
      setStep("setup");
    }
  };

  const resetInterview = () => {
    stopMediaTracks();
    stopRecognition();
    setStep("setup");
    setEvalResult(null);
    setQuestions([]);
    setCompany("");
    setRole("");
    setAnswers([]);
    setCurrentQ(0);
    setTranscript("");
    setCameraError(null);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const progressPercent = questions.length > 0 ? ((currentQ + (recording ? 0.5 : 0)) / questions.length) * 100 : 0;

  return (
    <main className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header with step indicator */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/10">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold">Mock Interview</h1>
              <p className="text-muted-foreground text-sm">AI-powered practice with real-time feedback</p>
            </div>
          </div>

          {/* Step progress */}
          <div className="flex items-center gap-2 mt-6">
            {["Setup", "Questions", "Interview", "Results"].map((label, i) => {
              const steps = ["setup", "questions", "interview", "results"];
              const stepIndex = steps.indexOf(step === "evaluating" ? "results" : step);
              const isActive = i === stepIndex;
              const isComplete = i < stepIndex;
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                    isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" :
                    isComplete ? "bg-primary/15 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {isComplete ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-4 text-center">{i + 1}</span>}
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {i < 3 && <div className={`flex-1 h-0.5 rounded-full transition-colors duration-300 ${isComplete ? "bg-primary/40" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ─── SETUP ─── */}
          {step === "setup" && (
            <motion.div key="setup" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
              <motion.div variants={itemVariants} className="glass-card p-8 md:p-10">
                <div className="text-center mb-8">
                  <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 mb-4">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="font-heading font-bold text-2xl mb-2">Prepare Your Interview</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Tell us where you're applying and we'll generate tailored questions using AI
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-lg mx-auto">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Company</label>
                    <Input
                      placeholder="e.g. Google, Meta, Stripe"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      className="h-12 bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Role</label>
                    <Input
                      placeholder="e.g. Software Engineer"
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      className="h-12 bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
                      onKeyDown={e => e.key === "Enter" && generateQuestions()}
                    />
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={generateQuestions}
                    disabled={!company.trim() || !role.trim() || loadingQ}
                    size="lg"
                    className="h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                  >
                    {loadingQ ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating questions...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Generate Interview <ChevronRight className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>
                </div>

                {/* Tips */}
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: Video, title: "Camera Ready", desc: "Ensure good lighting and a clean background" },
                    { icon: Mic, title: "Clear Audio", desc: "Use a quiet room for best transcription" },
                    { icon: Target, title: "Stay Focused", desc: "Answer each question within 2-3 minutes" },
                  ].map(tip => (
                    <motion.div key={tip.title} variants={itemVariants} className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/30">
                      <tip.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{tip.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tip.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ─── QUESTIONS PREVIEW ─── */}
          {step === "questions" && (
            <motion.div key="questions" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
              <motion.div variants={itemVariants} className="glass-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-heading font-bold text-xl">Your Interview Questions</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {questions.length} questions for <span className="text-primary font-medium">{role}</span> at <span className="text-primary font-medium">{company}</span>
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep("setup")} className="text-muted-foreground hover:text-foreground">
                    <RotateCcw className="w-4 h-4 mr-1" /> Redo
                  </Button>
                </div>

                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <motion.div
                      key={i}
                      variants={itemVariants}
                      className="group flex items-start gap-4 p-4 rounded-xl bg-muted/20 border border-border/20 hover:border-primary/20 hover:bg-muted/40 transition-all duration-200"
                    >
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-secondary/15 text-primary text-sm font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-relaxed">{q.question}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/10">
                            {q.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${difficultyColor[q.difficulty?.toLowerCase()] || difficultyColor.medium}`}>
                            {q.difficulty}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Camera error banner */}
              {cameraError && (
                <motion.div variants={itemVariants} className="glass-card p-5 border-l-2 border-l-destructive">
                  <div className="flex items-start gap-3">
                    <VideoOff className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Camera Error</p>
                      <p className="text-xs text-muted-foreground mt-1">{cameraError}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={startInterview} className="flex-shrink-0">
                      <RefreshCw className="w-3 h-3 mr-1" /> Retry
                    </Button>
                  </div>
                </motion.div>
              )}

              <motion.div variants={itemVariants}>
                <Button
                  onClick={startInterview}
                  disabled={cameraLoading}
                  size="lg"
                  className="w-full h-14 rounded-xl text-base bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                >
                  {cameraLoading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Initializing Camera...</>
                  ) : (
                    <><Video className="w-5 h-5 mr-2" /> Start Mock Interview</>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ─── INTERVIEW ─── */}
          {step === "interview" && (
            <motion.div key="interview" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Video panel */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="glass-card overflow-hidden">
                    <div className="relative aspect-video bg-black/50">
                      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />

                      {/* Recording indicator */}
                      {recording && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 backdrop-blur-sm"
                        >
                          <div className="w-2 h-2 rounded-full bg-primary-foreground recording-pulse" />
                          <span className="text-xs text-primary-foreground font-mono font-medium">{formatTime(timer)}</span>
                        </motion.div>
                      )}

                      {/* Question number overlay */}
                      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/30">
                        <span className="text-xs font-medium">Q{currentQ + 1}/{questions.length}</span>
                      </div>

                      {/* Voice bars overlay */}
                      {recording && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
                          {[...Array(12)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-primary/80 rounded-full"
                              style={{ animation: `voice-bar 0.6s ease-in-out ${i * 0.08}s infinite` }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      {!recording ? (
                        <Button
                          onClick={startRecording}
                          size="lg"
                          className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                        >
                          <Play className="w-5 h-5 mr-2" /> Start Answering
                        </Button>
                      ) : (
                        <Button
                          onClick={stopRecording}
                          size="lg"
                          variant="outline"
                          className="w-full h-12 rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive"
                        >
                          <Square className="w-4 h-4 mr-2" />
                          {currentQ < questions.length - 1 ? "Stop & Next Question" : "Stop & Finish Interview"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right sidebar */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Current question */}
                  <motion.div variants={itemVariants} className="glass-card p-5 border-l-2 border-l-primary">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
                      Question {currentQ + 1} of {questions.length}
                    </p>
                    <p className="font-medium text-sm leading-relaxed">{questions[currentQ]?.question}</p>
                    <div className="flex gap-2 mt-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary">
                        {questions[currentQ]?.category}
                      </span>
                    </div>
                  </motion.div>

                  {/* Transcript */}
                  <motion.div variants={itemVariants} className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      {recording ? (
                        <Mic className="w-4 h-4 text-primary animate-pulse" />
                      ) : (
                        <MicOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live Transcript</span>
                    </div>
                    <div className="min-h-[120px] max-h-[200px] overflow-y-auto text-sm text-foreground/80 leading-relaxed">
                      {transcript || (
                        <span className="text-muted-foreground italic">
                          {recording ? "Listening... start speaking" : "Press 'Start Answering' to begin"}
                        </span>
                      )}
                      {recording && transcript && (
                        <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle" style={{ animation: "typing 1s infinite" }} />
                      )}
                    </div>
                  </motion.div>

                  {/* Progress */}
                  <motion.div variants={itemVariants} className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</span>
                      <span className="text-xs text-primary font-medium">{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-1.5 mb-4" />
                    <div className="grid grid-cols-5 gap-2">
                      {questions.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-colors duration-300 ${
                          i < currentQ ? "bg-primary" :
                          i === currentQ ? "bg-primary/50 animate-pulse" :
                          "bg-muted"
                        }`} />
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── EVALUATING ─── */}
          {step === "evaluating" && (
            <motion.div key="evaluating" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="glass-card p-16 text-center">
              <div className="relative inline-block mb-6">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <div className="absolute inset-0 w-16 h-16 rounded-full bg-primary/10 animate-ping" />
              </div>
              <h2 className="font-heading font-bold text-2xl mb-2">Analyzing Your Performance</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Our AI is reviewing your responses, evaluating communication skills, and generating personalized feedback...
              </p>
              <div className="mt-8 flex justify-center gap-3">
                {["Technical", "Communication", "Problem Solving"].map((label, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.3 }}
                    className="px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground"
                  >
                    Analyzing {label}...
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── RESULTS ─── */}
          {step === "results" && evalResult && (
            <motion.div key="results" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
              {/* Score hero */}
              <motion.div variants={itemVariants} className={`glass-card p-8 text-center bg-gradient-to-br ${scoreGrade(evalResult.overall_score).bg}`}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="relative inline-flex items-center justify-center w-32 h-32 mb-4"
                >
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-muted/30" />
                    <motion.circle
                      cx="60" cy="60" r="52" fill="none" strokeWidth="8"
                      strokeLinecap="round"
                      className="stroke-primary"
                      strokeDasharray={2 * Math.PI * 52}
                      initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - evalResult.overall_score / 100) }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="text-4xl font-heading font-bold text-primary"
                    >
                      {evalResult.overall_score}
                    </motion.span>
                    <span className="text-xs text-muted-foreground">/ 100</span>
                  </div>
                </motion.div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Award className={`w-5 h-5 ${scoreGrade(evalResult.overall_score).color}`} />
                  <h2 className={`font-heading font-bold text-xl ${scoreGrade(evalResult.overall_score).color}`}>
                    {scoreGrade(evalResult.overall_score).label}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">{role} at {company}</p>
              </motion.div>

              {/* Category scores */}
              {Object.keys(evalResult.category_scores).length > 0 && (
                <motion.div variants={itemVariants} className="glass-card p-6">
                  <h3 className="font-heading font-semibold text-lg mb-5 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" /> Category Breakdown
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {Object.entries(evalResult.category_scores).map(([cat, score], i) => {
                      const Icon = categoryIcons[cat] || Star;
                      return (
                        <motion.div
                          key={cat}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.1 }}
                          className="text-center p-4 rounded-xl bg-muted/20 border border-border/20"
                        >
                          <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                          <p className="text-2xl font-heading font-bold text-primary">{score}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{cat}</p>
                          <div className="mt-2 w-full h-1 rounded-full bg-muted">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${score}%` }}
                              transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                              className="h-full rounded-full bg-primary"
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div variants={itemVariants} className="glass-card p-6">
                  <h3 className="font-heading font-semibold text-base mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" /> Strengths
                  </h3>
                  <ul className="space-y-3">
                    {evalResult.strengths.map((s, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="text-sm flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{s}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div variants={itemVariants} className="glass-card p-6">
                  <h3 className="font-heading font-semibold text-base mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" /> Areas to Improve
                  </h3>
                  <ul className="space-y-3">
                    {evalResult.weaknesses.map((w, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="text-sm flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <span>{w}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </div>

              {/* Improvement roadmap */}
              <motion.div variants={itemVariants} className="glass-card p-6">
                <h3 className="font-heading font-semibold text-lg mb-5 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Improvement Roadmap
                </h3>
                <div className="space-y-3">
                  {evalResult.improvements.map((imp, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 border border-border/20 hover:border-primary/20 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/15 to-secondary/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-sm leading-relaxed">{imp}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Restart */}
              <motion.div variants={itemVariants}>
                <Button
                  onClick={resetInterview}
                  size="lg"
                  className="w-full h-14 rounded-xl text-base bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                >
                  <RotateCcw className="w-5 h-5 mr-2" /> Start New Interview
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default MockInterview;
