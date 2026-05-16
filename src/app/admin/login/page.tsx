"use client";

import { useState, Suspense, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Eye, EyeOff, Lock, User, AlertCircle, Mail, CheckCircle, ArrowRight, Shield, Zap, BarChart3, Fingerprint, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { TypeAnimation } from "react-type-animation";
import CountUp from "react-countup";

// Animated number component with spring physics
function SpringNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [inView, setInView] = useState(false);
  return (
    <span ref={(el) => { if (el && !inView) { const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }); obs.observe(el); } }}>
      {inView ? <CountUp end={value} duration={2.5} suffix={suffix} /> : "0"}
    </span>
  );
}

// Floating particle grid background
function ParticleGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="particle-grid" />
      {/* Horizontal scan line */}
      <div className="scan-line" />
      {/* Floating nodes */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-indigo-500/30"
          style={{
            top: `${15 + i * 15}%`,
            left: `${10 + i * 14}%`,
          }}
          animate={{
            y: [0, -20, 10, 0],
            x: [0, 10, -10, 0],
            opacity: [0.3, 0.7, 0.4, 0.3],
            scale: [1, 1.5, 0.8, 1],
          }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
        />
      ))}
      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
        <motion.path
          d="M0,200 Q200,100 400,200 T800,200"
          stroke="url(#line-gradient)"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "loop" }}
        />
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Magnetic button effect
function MagneticButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-50, 50], [5, -5]);
  const rotateY = useTransform(x, [-50, 50], [-5, 5]);

  const handleMouse = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  }, [x, y]);

  return (
    <motion.div
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, perspective: 1000 }}
    >
      <Button className={className} {...props}>
        {children}
      </Button>
    </motion.div>
  );
}

// Glowing input wrapper
function GlowInput({ children }: { children: React.ReactNode }) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={`rounded-xl transition-all duration-300 ${focused ? "shadow-[0_0_20px_rgba(99,102,241,0.3),0_0_40px_rgba(99,102,241,0.1)] border-indigo-500/50" : ""}`}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/admin");
    }
  }, [status, router]);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [regFullName, setRegFullName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const switchMode = (m: "login" | "register") => { setMode(m); setError(""); setRegSuccess(false); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await signIn("credentials", { username, password, redirect: false });
      if (result?.error) { setError("Invalid username or password"); return; }
      const initRes = await fetch("/api/profiles/init", { method: "POST" });
      const initData = await initRes.json();
      if (initData.needs_setup) { router.push("/admin/setup?from_signup=1"); router.refresh(); return; }
      try {
        const configCheck = await fetch("/api/business-config");
        const configData = await configCheck.json();
        const config = configData.config;
        if (config && config.setup_completed === false && !config.display_name) { router.push("/admin/setup?from_signup=1"); router.refresh(); return; }
      } catch { /* proceed */ }
      router.push(callbackUrl);
      router.refresh();
    } catch { setError("Login failed. Please try again."); } finally { setIsLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (regPassword !== regConfirmPassword) { setError("Passwords do not match."); return; }
    if (regPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: regUsername, email: regEmail, password: regPassword, full_name: regFullName, is_owner: true }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed."); return; }
      const signInResult = await signIn("credentials", { username: regUsername, password: regPassword, redirect: false });
      if (signInResult?.ok) { await fetch("/api/profiles/init", { method: "POST" }); router.push("/admin/setup?from_signup=1"); }
      else { setRegSuccess(true); }
      setRegFullName(""); setRegUsername(""); setRegEmail(""); setRegPassword(""); setRegConfirmPassword("");
    } catch { setError("Registration failed. Please try again."); } finally { setIsLoading(false); }
  };

  const features = [
    { icon: BarChart3, title: "Real-time Analytics", desc: "Live metrics & predictive insights" },
    { icon: Zap, title: "AI-Powered Engine", desc: "Neural network recommendations" },
    { icon: Shield, title: "Zero-Trust Security", desc: "End-to-end encrypted operations" },
    { icon: Fingerprint, title: "Biometric Auth", desc: "Multi-factor authentication" },
    { icon: Globe, title: "Global Scale", desc: "Edge-deployed infrastructure" },
  ];

  // Stagger animation variants
  const containerVariants = {
    hidden: { opacity: 0 } as const,
    visible: { opacity: 1 } as const,
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 } as const,
    visible: { opacity: 1, y: 0 } as const,
  };

  return (
    <div className="min-h-screen flex overflow-hidden">
      {status === "loading" || status === "authenticated" ? (
        <div className="flex-1 flex items-center justify-center bg-[#050816]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 blur-xl animate-pulse" />
            </div>
            <p className="text-slate-400 text-sm font-mono tracking-wider">INITIALIZING…</p>
          </motion.div>
        </div>
      ) : (
        <>
          {/* ── LEFT PANEL ── */}
          <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[#050816]">
            <ParticleGrid />
            
            {/* Animated gradient mesh */}
            <div className="absolute inset-0">
              <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[100px] animate-pulse" />
              <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
              <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[80px] animate-pulse" style={{ animationDelay: "4s" }} />
            </div>

            {/* Hexagonal pattern */}
            <div className="absolute inset-0 hex-pattern opacity-[0.02]" />

            <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
              {/* Logo with glow */}
              <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex items-center"
              >
                <img src="/logo.png" alt="KarobarX logo" className="w-56 h-auto object-contain" />
              </motion.div>

              {/* Hero section */}
                <motion.div variants={containerVariants} initial="hidden" animate="visible" transition={{ staggerChildren: 0.1, delayChildren: 0.3 }} className="space-y-8">
                <motion.div variants={itemVariants} transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono text-indigo-300 tracking-wider">SYSTEM ONLINE</span>
                  </div>
                  <h1 className="text-4xl xl:text-5xl font-bold text-white leading-[1.1] tracking-tight">
                    Next-gen business
                    <br />
                    <span className="relative">
                      <TypeAnimation
                        sequence={[
                          "intelligence", 2000,
                          "automation", 2000,
                          "management", 2000,
                          "analytics", 2000,
                        ]}
                        wrapper="span"
                        speed={40}
                        className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 animated-gradient-text"
                        repeat={Infinity}
                      />
                      <div className="absolute -bottom-2 left-0 right-0 h-px bg-gradient-to-r from-indigo-500 via-purple-500 to-transparent" />
                    </span>
                  </h1>
                  <p className="mt-5 text-base text-slate-400 leading-relaxed max-w-md font-light">
                    Harness the power of artificial intelligence to transform your business operations. Built for scale, designed for speed.
                  </p>
                </motion.div>

                {/* Feature grid */}
                <motion.div variants={itemVariants} transition={{ duration: 0.6 }} className="grid grid-cols-1 gap-2.5">
                  {features.map((f, i) => (
                    <motion.div
                      key={f.title}
                      whileHover={{ x: 6, backgroundColor: "rgba(99,102,241,0.08)" }}
                      className="flex items-center gap-4 p-3 rounded-xl border border-white/[0.04] transition-colors group cursor-default"
                    >
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/[0.08] group-hover:border-indigo-500/30 transition-colors">
                        <f.icon className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white/90 font-medium text-sm">{f.title}</p>
                        <p className="text-slate-500 text-xs font-light">{f.desc}</p>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 group-hover:bg-indigo-400 transition-colors" style={{ animationDelay: `${i * 200}ms` }} />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* Stats with animated counters */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.8 }}
                className="flex items-center gap-8"
              >
                {[
                  { value: 10, suffix: "K+", label: "Active Users" },
                  { value: 99.9, suffix: "%", label: "Uptime SLA" },
                  { value: 50, suffix: "ms", label: "Avg Response" },
                ].map((stat, i) => (
                  <div key={i} className="relative">
                    <p className="text-2xl font-bold text-white font-mono tabular-nums">
                      <SpringNumber value={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="text-slate-500 text-[11px] font-medium tracking-wider uppercase">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-[#050816] relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute top-[-30%] right-[-20%] w-[500px] h-[500px] rounded-full bg-indigo-600/[0.07] blur-[120px]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] rounded-full bg-purple-600/[0.05] blur-[100px]" />
            
            {/* Noise texture */}
            <div className="absolute inset-0 noise-overlay opacity-[0.03]" />

            <motion.div
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full max-w-[420px] relative z-10"
            >
              {/* Mobile branding */}
              <div className="lg:hidden text-center mb-8">
                <img src="/logo.png" alt="KarobarX logo" className="w-52 h-auto object-contain mx-auto" />
              </div>

              {/* Tab switcher */}
              <div className="relative flex rounded-xl bg-white/[0.03] border border-white/[0.08] p-1 mb-8 overflow-hidden">
                <motion.div
                  className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600"
                  animate={{ left: mode === "login" ? "4px" : "50%", width: "calc(50% - 8px)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{ boxShadow: "0 4px 15px rgba(99,102,241,0.3)" }}
                />
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${mode === "login" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${mode === "register" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  Create Account
                </button>
              </div>

              {/* Form card */}
              <div className="rounded-2xl p-8 relative overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/40">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                
                <div className="relative z-10">
                  <AnimatePresence mode="wait">
                    {mode === "login" && (
                      <motion.div
                        key="login"
                        initial={{ opacity: 0, x: -30, filter: "blur(4px)" }}
                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, x: 30, filter: "blur(4px)" }}
                        transition={{ duration: 0.35 }}
                      >
                        <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
                        <p className="text-slate-500 text-sm mb-6 font-light">Access your command center</p>

                        <form onSubmit={handleLogin} className="space-y-5">
                          {error && (
                            <motion.div
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                            >
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              {error}
                            </motion.div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="username" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Username or Email</Label>
                            <GlowInput>
                              <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                <Input
                                  id="username"
                                  type="text"
                                  value={username}
                                  onChange={(e) => setUsername(e.target.value)}
                                  placeholder="Enter credentials"
                                  className="pl-10 bg-white/[0.03] border-white/[0.08] rounded-xl h-12 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-0 transition-all font-light"
                                  required
                                />
                              </div>
                            </GlowInput>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Password</Label>
                            <GlowInput>
                              <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                <Input
                                  id="password"
                                  type={showPassword ? "text" : "password"}
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  placeholder="Enter password"
                                  className="pl-10 pr-11 bg-white/[0.03] border-white/[0.08] rounded-xl h-12 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-0 transition-all font-light"
                                  required
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </GlowInput>
                          </div>

                          <MagneticButton
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-600 hover:via-purple-600 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 border-0 relative overflow-hidden group"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            {isLoading ? (
                              <span className="flex items-center gap-2 relative z-10">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Authenticating…
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 relative z-10">
                                Initialize Session
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                              </span>
                            )}
                          </MagneticButton>
                        </form>
                      </motion.div>
                    )}

                    {mode === "register" && (
                      <motion.div
                        key="register"
                        initial={{ opacity: 0, x: 30, filter: "blur(4px)" }}
                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, x: -30, filter: "blur(4px)" }}
                        transition={{ duration: 0.35 }}
                      >
                        <h2 className="text-xl font-bold text-white mb-1">Create your account</h2>
                        <p className="text-slate-500 text-sm mb-6 font-light">Deploy your business instance</p>

                        {regSuccess ? (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
                            <div className="relative inline-block">
                              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                              </div>
                              <div className="absolute -inset-2 rounded-full bg-emerald-500/10 blur-xl animate-pulse" />
                            </div>
                            <div>
                              <p className="font-bold text-white text-lg">Instance Created</p>
                              <p className="text-sm text-slate-500 mt-1">You can now access your dashboard.</p>
                            </div>
                            <Button onClick={() => switchMode("login")} className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold border-0">
                              Go to Sign In
                            </Button>
                          </motion.div>
                        ) : (
                          <form onSubmit={handleRegister} className="space-y-3.5">
                            {error && (
                              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />{error}
                              </motion.div>
                            )}

                            <div className="space-y-1.5">
                              <Label htmlFor="reg-fullname" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Full Name</Label>
                              <GlowInput>
                                <div className="relative">
                                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                  <Input id="reg-fullname" type="text" value={regFullName} onChange={(e) => setRegFullName(e.target.value)} placeholder="Your full name" className="pl-10 bg-white/[0.03] border-white/[0.08] rounded-xl h-11 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-0 transition-all font-light" required />
                                </div>
                              </GlowInput>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="reg-username" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Username</Label>
                              <GlowInput>
                                <div className="relative">
                                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                  <Input id="reg-username" type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="Choose a handle" className="pl-10 bg-white/[0.03] border-white/[0.08] rounded-xl h-11 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-0 transition-all font-light" required />
                                </div>
                              </GlowInput>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="reg-email" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Email</Label>
                              <GlowInput>
                                <div className="relative">
                                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                  <Input id="reg-email" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="your@email.com" className="pl-10 bg-white/[0.03] border-white/[0.08] rounded-xl h-11 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-0 transition-all font-light" required />
                                </div>
                              </GlowInput>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="reg-password" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Password</Label>
                              <GlowInput>
                                <div className="relative">
                                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                  <Input id="reg-password" type={showRegPassword ? "text" : "password"} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Min. 6 characters" className="pl-10 pr-11 bg-white/[0.03] border-white/[0.08] rounded-xl h-11 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-0 transition-all font-light" required />
                                  <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </GlowInput>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="reg-confirm" className="text-slate-400 text-xs font-medium uppercase tracking-wider">Confirm Password</Label>
                              <GlowInput>
                                <div className="relative">
                                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                  <Input id="reg-confirm" type="password" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} placeholder="Re-enter password" className="pl-10 bg-white/[0.03] border-white/[0.08] rounded-xl h-11 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-0 transition-all font-light" required />
                                </div>
                              </GlowInput>
                            </div>

                            <MagneticButton
                              type="submit"
                              disabled={isLoading}
                              className="w-full h-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-600 hover:via-purple-600 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-xl shadow-indigo-500/25 transition-all duration-300 border-0 relative overflow-hidden group mt-2"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                              {isLoading ? (
                                <span className="flex items-center gap-2 relative z-10">
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Deploying…
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 relative z-10">
                                  Deploy Instance
                                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                              )}
                            </MagneticButton>

                            <p className="text-xs text-center text-slate-600 mt-3">
                              You&apos;ll be the <strong className="text-slate-400">owner &amp; super-admin</strong>
                            </p>
                          </form>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Security badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex items-center justify-center gap-2 mt-6"
              >
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-slate-600 text-[11px] font-mono tracking-wider">AES-256 ENCRYPTED • SOC2 COMPLIANT</span>
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
