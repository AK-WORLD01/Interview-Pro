import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Building2, MapPin, Briefcase, DollarSign, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface JobResult {
  title: string;
  company: string;
  location: string;
  salary_range: string;
  description: string;
  requirements: string[];
  posted_date: string;
  apply_url: string;
}

const JobSearch = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<JobResult[]>([]);
  const [searchDone, setSearchDone] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Please sign in to search jobs", variant: "destructive" });
      return;
    }
    setLoading(true);
    setSearchDone(false);
    try {
      const { data, error } = await supabase.functions.invoke("job-search", {
        body: { company, location, role },
      });
      if (error) throw error;
      setResults(data?.jobs ?? []);
      setSearchDone(true);
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">AI Job Search</h1>
          <p className="text-muted-foreground mb-8">Find live job opportunities powered by AI intelligence</p>

          <form onSubmit={handleSearch} className="glass-card p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="relative">
                <Building2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Company name" value={company} onChange={e => setCompany(e.target.value)} className="pl-10" required />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} className="pl-10" required />
              </div>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Job role" value={role} onChange={e => setRole(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching with AI...</> : <><Search className="w-4 h-4 mr-2" /> Search Jobs</>}
            </Button>
          </form>

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card p-6 animate-shimmer rounded-xl h-32" />
              ))}
            </div>
          )}

          <AnimatePresence>
            {searchDone && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {results.length === 0 ? (
                  <div className="glass-card p-8 text-center">
                    <p className="text-muted-foreground">No results found. Try different search terms.</p>
                  </div>
                ) : (
                  results.map((job, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="glass-card p-6 hover:glow-effect transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-heading font-semibold text-lg">{job.title}</h3>
                          <p className="text-muted-foreground text-sm">{job.company} · {job.location}</p>
                        </div>
                        {job.salary_range && (
                          <span className="flex items-center gap-1 text-sm text-primary">
                            <DollarSign className="w-3 h-3" /> {job.salary_range}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 mb-3">{job.description}</p>
                      {job.requirements.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {job.requirements.slice(0, 5).map((req, j) => (
                            <span key={j} className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">{req}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{job.posted_date}</span>
                        <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          View Details <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
};

export default JobSearch;
