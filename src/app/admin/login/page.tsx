"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Lock, User, Store, AlertCircle, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const [mode, setMode] = useState<"login" | "register">("login");

  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Register state
  const [regFullName, setRegFullName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setError("");
    setRegSuccess(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
        return;
      }

      const initRes = await fetch("/api/profiles/init", { method: "POST" });
      const initData = await initRes.json();

      // Brand-new owner with no linked profile yet → go straight to setup
      if (initData.needs_setup) {
        router.push("/admin/setup?from_signup=1");
        router.refresh();
        return;
      }

      // If business config hasn't been set up yet, send to setup wizard
      try {
        const configCheck = await fetch("/api/business-config");
        const configData = await configCheck.json();
        if (!configData.config?.setup_completed) {
          router.push("/admin/setup?from_signup=1");
          router.refresh();
          return;
        }
      } catch {
        // If check fails, proceed normally
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
          full_name: regFullName,
          is_owner: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      // Auto sign-in and redirect to CRM setup wizard
      const signInResult = await signIn("credentials", {
        username: regUsername,
        password: regPassword,
        redirect: false,
      });

      if (signInResult?.ok) {
        await fetch("/api/profiles/init", { method: "POST" });
        router.push("/admin/setup?from_signup=1");
      } else {
        // Fallback — show success card so user can log in manually
        setRegSuccess(true);
      }

      setRegFullName("");
      setRegUsername("");
      setRegEmail("");
      setRegPassword("");
      setRegConfirmPassword("");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MobileHub Delhi</h1>
          <p className="text-slate-500 mt-1 text-sm">CRM Dashboard</p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === "register"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">

          {/* ── LOGIN FORM ── */}
          {mode === "login" && (
            <>
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Welcome back</h2>
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-slate-700 text-sm font-medium">Username or Email</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username or email"
                      className="pl-9 border-slate-200 rounded-xl h-11 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:ring-violet-400"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-700 text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="pl-9 pr-10 border-slate-200 rounded-xl h-11 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:ring-violet-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </div>
                  ) : "Sign In"}
                </Button>
              </form>
            </>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === "register" && (
            <>
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Create your account</h2>

              {regSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100">
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Account created!</p>
                    <p className="text-sm text-slate-500 mt-1">You can now sign in with your credentials.</p>
                  </div>
                  <Button
                    onClick={() => switchMode("login")}
                    className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium"
                  >
                    Go to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-fullname" className="text-slate-700 text-sm font-medium">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="reg-fullname"
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="Your full name"
                        className="pl-9 border-slate-200 rounded-xl h-11 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:ring-violet-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-username" className="text-slate-700 text-sm font-medium">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="reg-username"
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="Choose a username"
                        className="pl-9 border-slate-200 rounded-xl h-11 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:ring-violet-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email" className="text-slate-700 text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="reg-email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="pl-9 border-slate-200 rounded-xl h-11 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:ring-violet-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="text-slate-700 text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="reg-password"
                        type={showRegPassword ? "text" : "password"}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="pl-9 pr-10 border-slate-200 rounded-xl h-11 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:ring-violet-400"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-confirm" className="text-slate-700 text-sm font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="reg-confirm"
                        type="password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="pl-9 border-slate-200 rounded-xl h-11 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:ring-violet-400"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium mt-2"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating account…
                      </div>
                    ) : "Create Account"}
                  </Button>

                  <p className="text-xs text-center text-slate-400 mt-2">
                    You&apos;ll be the <strong>owner &amp; super-admin</strong>. Add team members after setup.
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
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
