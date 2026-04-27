import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, X, Plus, Loader2, Target, TrendingUp,
  AlertTriangle, CheckCircle2, BookOpen, Clock, Zap, Brain,
  Sparkles, ChevronRight, BarChart3, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SkillItem {
  name: string;
  level: string;
}

interface MissingSkill {
  name: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

interface OutdatedSkill {
  name: string;
  replacement: string;
}

interface RoadmapItem {
  skill: string;
  timeline: string;
  resources: string;
}

interface AnalysisResult {
  extracted_skills: {
    technical: SkillItem[];
    soft_skills: string[];
    tools: string[];
    frameworks: string[];
  };
  match_percentage: number;
  missing_skills: MissingSkill[];
  outdated_skills: OutdatedSkill[];
  resume_suggestions: string[];
  learning_roadmap: RoadmapItem[];
  interview_readiness: number;
  weak_sections: string[];
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const levelColors: Record<string, string> = {
  beginner: "bg-red-500/10 text-red-400",
  intermediate: "bg-yellow-500/10 text-yellow-400",
  advanced: "bg-blue-500/10 text-blue-400",
  expert: "bg-green-500/10 text-green-400",
};

const containerVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.08, duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const SkillsAnalysis = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"input" | "analyzing" | "results">("input");
  const [file, setFile] = useState<File | null>(null);
  const [manualSkills, setManualSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(selected.type)) {
      toast({ title: "Invalid file", description: "Please upload PDF, DOC, or DOCX", variant: "destructive" });
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    setFile(selected);
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !manualSkills.includes(trimmed)) {
      setManualSkills(prev => [...prev, trimmed]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setManualSkills(prev => prev.filter(s => s !== skill));
  };

  const extractTextFromFile = async (f: File): Promise<string> => {
    // For now we read text content — PDF binary parsing would need server-side
    // We'll send the raw text and let the AI handle it
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        // For PDFs the raw text won't be great, but the AI can still work with it
        resolve(text || "");
      };
      reader.onerror = () => resolve("");
      reader.readAsText(f);
    });
  };

  const analyze = async () => {
    if (!user) {
      toast({ title: "Please sign in first", variant: "destructive" });
      return;
    }
    if (!file && manualSkills.length === 0) {
      toast({ title: "Add skills or upload a resume", variant: "destructive" });
      return;
    }

    setLoading(true);
    setStep("analyzing");

    try {
      let resumeText = "";
      if (file) {
        // Upload to storage
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(filePath, file);
        if (uploadError) {
          console.error("Upload error:", uploadError);
        }
        resumeText = await extractTextFromFile(file);
      }

      const { data, error } = await supabase.functions.invoke("analyze-skills", {
        body: {
          resumeText,
          manualSkills,
          targetRole: targetRole || "Software Engineer",
          targetCompany: targetCompany || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      setStep("results");
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
      setStep("input");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-blue-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <main className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/10">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold">Skills Gap Analysis</h1>
              <p className="text-muted-foreground text-sm">Upload your resume or enter skills for AI-powered career intelligence</p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ─── INPUT ─── */}
          {step === "input" && (
            <motion.div key="input" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
              {/* Target role */}
              <motion.div variants={itemVariants} className="glass-card p-6">
                <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" /> Target Position
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Role</label>
                    <Input
                      placeholder="e.g. Senior Frontend Engineer"
                      value={targetRole}
                      onChange={e => setTargetRole(e.target.value)}
                      className="h-11 bg-muted/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company (optional)</label>
                    <Input
                      placeholder="e.g. Google, Meta"
                      value={targetCompany}
                      onChange={e => setTargetCompany(e.target.value)}
                      className="h-11 bg-muted/50 border-border/50"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Resume upload */}
              <motion.div variants={itemVariants} className="glass-card p-6">
                <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Resume Upload
                </h2>

                {!file ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border/50 rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
                  >
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium mb-1">Drop your resume here or click to browse</p>
                    <p className="text-xs text-muted-foreground">PDF, DOC, DOCX — Max 10MB</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </motion.div>

              {/* Manual skills */}
              <motion.div variants={itemVariants} className="glass-card p-6">
                <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> Add Skills Manually
                </h2>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="e.g. React, TypeScript, AWS..."
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addSkill()}
                    className="h-11 bg-muted/50 border-border/50"
                  />
                  <Button onClick={addSkill} variant="outline" className="h-11 px-4">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {manualSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {manualSkills.map(skill => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium border border-primary/10"
                      >
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="hover:text-destructive transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Submit */}
              <motion.div variants={itemVariants}>
                <Button
                  onClick={analyze}
                  disabled={(!file && manualSkills.length === 0) || loading}
                  size="lg"
                  className="w-full h-14 rounded-xl text-base bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                >
                  <Sparkles className="w-5 h-5 mr-2" /> Analyze Skills <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ─── ANALYZING ─── */}
          {step === "analyzing" && (
            <motion.div key="analyzing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-16 text-center">
              <div className="relative inline-block mb-6">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <div className="absolute inset-0 w-16 h-16 rounded-full bg-primary/10 animate-ping" />
              </div>
              <h2 className="font-heading font-bold text-2xl mb-2">Analyzing Your Profile</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                AI is extracting skills, computing gaps, and building your personalized roadmap...
              </p>
              <div className="mt-8 flex justify-center gap-3 flex-wrap">
                {["Parsing Resume", "Matching Skills", "Building Roadmap"].map((label, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.4 }}
                    className="px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground"
                  >
                    {label}...
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── RESULTS ─── */}
          {step === "results" && result && (
            <motion.div key="results" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
              {/* Score cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div variants={itemVariants} className="glass-card p-6 text-center">
                  <BarChart3 className="w-6 h-6 text-primary mx-auto mb-3" />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Skill Match</p>
                  <div className="relative inline-flex items-center justify-center w-28 h-28 mb-2">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-muted/30" />
                      <motion.circle
                        cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round"
                        className="stroke-primary"
                        strokeDasharray={2 * Math.PI * 52}
                        initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - result.match_percentage / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                      />
                    </svg>
                    <span className={`absolute text-3xl font-heading font-bold ${scoreColor(result.match_percentage)}`}>
                      {result.match_percentage}%
                    </span>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="glass-card p-6 text-center">
                  <Target className="w-6 h-6 text-primary mx-auto mb-3" />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Interview Readiness</p>
                  <div className="relative inline-flex items-center justify-center w-28 h-28 mb-2">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-muted/30" />
                      <motion.circle
                        cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round"
                        className="stroke-secondary"
                        strokeDasharray={2 * Math.PI * 52}
                        initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - result.interview_readiness / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                      />
                    </svg>
                    <span className={`absolute text-3xl font-heading font-bold ${scoreColor(result.interview_readiness)}`}>
                      {result.interview_readiness}%
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Extracted Skills */}
              <motion.div variants={itemVariants} className="glass-card p-6">
                <h3 className="font-heading font-semibold text-lg mb-5 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" /> Your Skills Profile
                </h3>
                <div className="space-y-4">
                  {result.extracted_skills.technical.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Technical Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {result.extracted_skills.technical.map(s => (
                          <span key={s.name} className={`px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent ${levelColors[s.level] || levelColors.intermediate}`}>
                            {s.name} · {s.level}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.extracted_skills.frameworks.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Frameworks</p>
                      <div className="flex flex-wrap gap-2">
                        {result.extracted_skills.frameworks.map(f => (
                          <span key={f} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.extracted_skills.tools.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Tools</p>
                      <div className="flex flex-wrap gap-2">
                        {result.extracted_skills.tools.map(t => (
                          <span key={t} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.extracted_skills.soft_skills.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Soft Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {result.extracted_skills.soft_skills.map(s => (
                          <span key={s} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary/10 text-secondary">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Missing Skills */}
              {result.missing_skills.length > 0 && (
                <motion.div variants={itemVariants} className="glass-card p-6">
                  <h3 className="font-heading font-semibold text-lg mb-5 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" /> Missing Skills
                  </h3>
                  <div className="space-y-3">
                    {result.missing_skills.map((skill, i) => (
                      <motion.div
                        key={skill.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.08 }}
                        className="flex items-start gap-3 p-4 rounded-xl bg-muted/20 border border-border/20"
                      >
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${priorityColors[skill.priority]}`}>
                          {skill.priority}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{skill.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{skill.reason}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Outdated Skills */}
              {result.outdated_skills.length > 0 && (
                <motion.div variants={itemVariants} className="glass-card p-6">
                  <h3 className="font-heading font-semibold text-lg mb-5 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" /> Outdated Skills
                  </h3>
                  <div className="space-y-2">
                    {result.outdated_skills.map(s => (
                      <div key={s.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                        <span className="text-sm line-through text-muted-foreground">{s.name}</span>
                        <ArrowUpRight className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">{s.replacement}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Resume Suggestions + Weak Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.resume_suggestions.length > 0 && (
                  <motion.div variants={itemVariants} className="glass-card p-6">
                    <h3 className="font-heading font-semibold text-base mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" /> Resume Tips
                    </h3>
                    <ul className="space-y-3">
                      {result.resume_suggestions.map((s, i) => (
                        <li key={i} className="text-sm flex items-start gap-2 p-2 rounded-lg bg-primary/5">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {result.weak_sections.length > 0 && (
                  <motion.div variants={itemVariants} className="glass-card p-6">
                    <h3 className="font-heading font-semibold text-base mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400" /> Weak Sections
                    </h3>
                    <ul className="space-y-3">
                      {result.weak_sections.map((s, i) => (
                        <li key={i} className="text-sm flex items-start gap-2 p-2 rounded-lg bg-amber-500/5">
                          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </div>

              {/* Learning Roadmap */}
              {result.learning_roadmap.length > 0 && (
                <motion.div variants={itemVariants} className="glass-card p-6">
                  <h3 className="font-heading font-semibold text-lg mb-5 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" /> Learning Roadmap
                  </h3>
                  <div className="space-y-3">
                    {result.learning_roadmap.map((item, i) => (
                      <motion.div
                        key={item.skill}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.08 }}
                        className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 border border-border/20 hover:border-primary/20 transition-colors"
                      >
                        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/15 to-secondary/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium">{item.skill}</p>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {item.timeline}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-start gap-1">
                            <BookOpen className="w-3 h-3 mt-0.5 flex-shrink-0" /> {item.resources}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Restart */}
              <motion.div variants={itemVariants}>
                <Button
                  onClick={() => { setStep("input"); setResult(null); setFile(null); }}
                  size="lg"
                  className="w-full h-14 rounded-xl text-base bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                >
                  <Sparkles className="w-5 h-5 mr-2" /> New Analysis
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default SkillsAnalysis;
