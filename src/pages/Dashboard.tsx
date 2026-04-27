import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Clock, Trophy, TrendingUp, Loader2, Building2, Briefcase,
  Calendar, ChevronRight, ChevronDown, AlertTriangle, CheckCircle2,
  Target, Video, X, Brain, MessageSquare, Zap, Shield, Star
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface InterviewResult {
  id: string;
  company: string;
  role: string;
  overall_score: number;
  total_duration: number;
  created_at: string;
  category_scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

const categoryIcons: Record<string, any> = {
  "Technical Knowledge": Brain,
  "Communication": MessageSquare,
  "Problem Solving": Zap,
  "Cultural Fit": Shield,
  "Confidence": Star,
};

const scoreColor = (score: number) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
};

const scoreBg = (score: number) => {
  if (score >= 80) return "from-green-500/20 to-emerald-500/20";
  if (score >= 60) return "from-yellow-500/20 to-orange-500/20";
  return "from-red-500/20 to-pink-500/20";
};

const Dashboard = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<InterviewResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchData = async () => {
      const { data } = await supabase
        .from("interview_results")
        .select("id, company, role, overall_score, total_duration, created_at, category_scores, strengths, weaknesses, improvements")
        .order("created_at", { ascending: false });
      setResults((data as InterviewResult[]) ?? []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (!user) {
    return (
      <main className="min-h-screen pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="glass-card p-12">
            <h2 className="font-heading font-semibold text-xl mb-2">Sign in to view your dashboard</h2>
            <p className="text-muted-foreground">Track your interview preparation progress and performance analytics.</p>
          </div>
        </div>
      </main>
    );
  }

  const totalInterviews = results.length;
  const bestScore = totalInterviews > 0 ? Math.max(...results.map(r => r.overall_score)) : 0;
  const avgScore = totalInterviews > 0 ? Math.round(results.reduce((s, r) => s + r.overall_score, 0) / totalInterviews) : 0;
  const totalMinutes = totalInterviews > 0 ? Math.round(results.reduce((s, r) => s + r.total_duration, 0) / 60) : 0;

  // Aggregate weaknesses across all interviews for "Areas to Improve" section
  const weaknessFrequency: Record<string, number> = {};
  results.forEach(r => {
    (r.weaknesses ?? []).forEach(w => {
      weaknessFrequency[w] = (weaknessFrequency[w] || 0) + 1;
    });
  });
  const topWeaknesses = Object.entries(weaknessFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Compute average category scores across all interviews for progress
  const categoryTotals: Record<string, { sum: number; count: number }> = {};
  results.forEach(r => {
    const scores = r.category_scores ?? {};
    Object.entries(scores).forEach(([cat, val]) => {
      if (!categoryTotals[cat]) categoryTotals[cat] = { sum: 0, count: 0 };
      categoryTotals[cat].sum += Number(val);
      categoryTotals[cat].count += 1;
    });
  });
  const avgCategoryScores = Object.entries(categoryTotals).map(([cat, { sum, count }]) => ({
    category: cat,
    avg: Math.round(sum / count),
  }));

  // Score trend (last 5 interviews, oldest first)
  const recentScores = results.slice(0, 5).reverse();

  const stats = [
    { icon: BarChart3, label: "Total Interviews", value: totalInterviews.toString() },
    { icon: Trophy, label: "Best Score", value: totalInterviews > 0 ? `${bestScore}` : "—" },
    { icon: TrendingUp, label: "Avg Score", value: totalInterviews > 0 ? `${avgScore}` : "—" },
    { icon: Clock, label: "Practice Time", value: totalInterviews > 0 ? `${totalMinutes}m` : "—" },
  ];

  return (
    <main className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground mb-8">Your interview preparation analytics</p>

          {loading ? (
            <div className="glass-card p-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading your data…</p>
            </div>
          ) : (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {stats.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-4 text-center"
                  >
                    <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-heading font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </motion.div>
                ))}
              </div>

              {results.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Complete your first mock interview to see analytics here.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* ─── Score Trend + Skill Progress ─── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Score Trend */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="glass-card p-6"
                    >
                      <h2 className="font-heading font-semibold text-base mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" /> Score Trend
                      </h2>
                      {recentScores.length > 1 ? (
                        <div className="flex items-end gap-2 h-32">
                          {recentScores.map((r, i) => {
                            const height = Math.max(r.overall_score, 8);
                            return (
                              <div key={r.id} className="flex-1 flex flex-col items-center gap-1">
                                <span className={`text-[10px] font-bold ${scoreColor(r.overall_score)}`}>
                                  {r.overall_score}
                                </span>
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: `${height}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.1 }}
                                  className="w-full rounded-t-md bg-gradient-to-t from-primary/60 to-primary/20 min-h-[4px]"
                                />
                                <span className="text-[9px] text-muted-foreground truncate max-w-full">
                                  {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                          Complete more interviews to see trends
                        </div>
                      )}
                    </motion.div>

                    {/* Skill Progress */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="glass-card p-6"
                    >
                      <h2 className="font-heading font-semibold text-base mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" /> Skill Progress
                      </h2>
                      {avgCategoryScores.length > 0 ? (
                        <div className="space-y-3">
                          {avgCategoryScores.map((c, i) => {
                            const Icon = categoryIcons[c.category] || Star;
                            return (
                              <motion.div
                                key={c.category}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.08 }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-medium">{c.category}</span>
                                  </div>
                                  <span className={`text-xs font-bold ${scoreColor(c.avg)}`}>{c.avg}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-muted">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${c.avg}%` }}
                                    transition={{ duration: 1, delay: 0.4 + i * 0.1 }}
                                    className="h-full rounded-full bg-primary"
                                  />
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                          No category data yet
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* ─── Areas to Improve ─── */}
                  {topWeaknesses.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="glass-card p-6"
                    >
                      <h2 className="font-heading font-semibold text-base mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" /> Top Areas to Improve
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {topWeaknesses.map(([weakness, count], i) => (
                          <motion.div
                            key={weakness}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45 + i * 0.06 }}
                            className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10"
                          >
                            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs leading-relaxed">{weakness}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Flagged in {count} interview{count > 1 ? "s" : ""}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* ─── Recent Interviews (expandable) ─── */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-card p-6"
                  >
                    <h2 className="font-heading font-semibold text-base mb-4 flex items-center gap-2">
                      <Video className="w-4 h-4 text-primary" /> Recent Interviews
                    </h2>
                    <div className="space-y-3">
                      {results.slice(0, 10).map((r, i) => {
                        const isExpanded = expandedId === r.id;
                        const catScores = r.category_scores ?? {};
                        return (
                          <motion.div
                            key={r.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.04 }}
                            className="rounded-xl bg-muted/20 border border-border/20 hover:border-primary/20 transition-colors overflow-hidden"
                          >
                            {/* Row header */}
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : r.id)}
                              className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${scoreBg(r.overall_score)} flex items-center justify-center flex-shrink-0`}>
                                  <span className={`text-sm font-heading font-bold ${scoreColor(r.overall_score)}`}>
                                    {r.overall_score}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {r.company} — <span className="text-muted-foreground">{r.role}</span>
                                  </p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(r.created_at).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {Math.round(r.total_duration / 60)}m
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                            </button>

                            {/* Expanded detail */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-5 space-y-4 border-t border-border/10 pt-4">
                                    {/* Category scores */}
                                    {Object.keys(catScores).length > 0 && (
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Category Scores</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                          {Object.entries(catScores).map(([cat, val]) => {
                                            const Icon = categoryIcons[cat] || Star;
                                            return (
                                              <div key={cat} className="text-center p-2 rounded-lg bg-muted/30">
                                                <Icon className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                                                <p className={`text-sm font-bold ${scoreColor(Number(val))}`}>{val}</p>
                                                <p className="text-[9px] text-muted-foreground">{cat}</p>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Strengths */}
                                    {(r.strengths ?? []).length > 0 && (
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-green-400" /> Strengths
                                        </p>
                                        <div className="space-y-1.5">
                                          {r.strengths.map((s, si) => (
                                            <div key={si} className="text-xs flex items-start gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                                              <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                                              <span>{s}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Weaknesses */}
                                    {(r.weaknesses ?? []).length > 0 && (
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3 text-amber-400" /> Areas to Improve
                                        </p>
                                        <div className="space-y-1.5">
                                          {r.weaknesses.map((w, wi) => (
                                            <div key={wi} className="text-xs flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                              <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                              <span>{w}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Improvements */}
                                    {(r.improvements ?? []).length > 0 && (
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium flex items-center gap-1">
                                          <TrendingUp className="w-3 h-3 text-primary" /> Improvement Steps
                                        </p>
                                        <div className="space-y-1.5">
                                          {r.improvements.map((imp, ii) => (
                                            <div key={ii} className="text-xs flex items-start gap-3 p-2 rounded-lg bg-muted/30 border border-border/10">
                                              <span className="w-5 h-5 rounded bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                {ii + 1}
                                              </span>
                                              <span>{imp}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </main>
  );
};

export default Dashboard;
