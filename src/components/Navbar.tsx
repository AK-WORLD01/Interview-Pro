import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Menu, X, Sparkles, LogOut } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/ui/button";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/job-search", label: "Job Search" },
  { to: "/mock-interview", label: "Mock Interview" },
  { to: "/skills-analysis", label: "Skills Analysis" },
  { to: "/dashboard", label: "Dashboard" },
];

export const Navbar = () => {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const openAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthOpen(true);
    setMobileOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-lg">InterviewX AI</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} className="rounded-full">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{user.email}</span>
                <Button variant="ghost" size="icon" onClick={signOut} className="rounded-full">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openAuth("login")}>Log in</Button>
                <Button size="sm" onClick={() => openAuth("register")} className="bg-primary text-primary-foreground hover:bg-primary/90">Sign up</Button>
              </div>
            )}

            <Button variant="ghost" size="icon" className="md:hidden rounded-full" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t border-border"
            >
              <div className="p-4 flex flex-col gap-2">
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      location.pathname === link.to ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {user ? (
                  <Button variant="ghost" size="sm" onClick={() => { signOut(); setMobileOpen(false); }}>
                    <LogOut className="w-4 h-4 mr-2" /> Sign out
                  </Button>
                ) : (
                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => openAuth("login")}>Log in</Button>
                    <Button size="sm" className="flex-1 bg-primary text-primary-foreground" onClick={() => openAuth("register")}>Sign up</Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} mode={authMode} onModeChange={setAuthMode} />
    </>
  );
};
