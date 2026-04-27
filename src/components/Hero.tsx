import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Brain, Mic, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Search, title: "AI Job Search", desc: "Find live roles with AI-powered intelligence" },
  { icon: Brain, title: "Smart Questions", desc: "Get interview questions tailored to your target role" },
  { icon: Mic, title: "Mock Interviews", desc: "Practice with webcam, speech-to-text & AI scoring" },
];

export const Hero = () => (
  <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
    {/* Background effects */}
    <div className="absolute inset-0 bg-[var(--gradient-hero)]" />
    <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" />
    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/5 blur-3xl animate-float" style={{ animationDelay: "3s" }} />

    <div className="container mx-auto px-4 relative z-10">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-sm text-primary mb-8">
            <Sparkles className="w-4 h-4" />
            AI-Powered Interview Preparation
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight mb-6">
            Ace your next
            <br />
            <span className="gradient-text">interview</span> with AI
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Real-time job search, AI-generated interview questions, and mock interviews with instant AI feedback — all powered by live data.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/job-search">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 text-base glow-effect">
                Start Preparing <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/mock-interview">
              <Button size="lg" variant="outline" className="px-8 text-base">
                Try Mock Interview
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="glass-card p-6 text-left group hover:glow-effect transition-shadow duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);
