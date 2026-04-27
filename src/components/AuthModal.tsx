import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "login" | "register";
  onModeChange: (m: "login" | "register") => void;
}

export const AuthModal = ({ open, onOpenChange, mode, onModeChange }: Props) => {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password, name);

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: mode === "login" ? "Welcome back!" : "Account created! Check your email to confirm." });
      onOpenChange(false);
      setEmail(""); setPassword(""); setName("");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </DialogTitle>
        </DialogHeader>
        <motion.form onSubmit={handleSubmit} className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {mode === "register" && (
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} className="pl-10" required />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required minLength={6} />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => onModeChange(mode === "login" ? "register" : "login")} className="text-primary hover:underline">
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
};
