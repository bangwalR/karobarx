"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { AlertCircle, CheckCircle, Eye, EyeOff, KeyRound, Lock, Mail, RefreshCw, Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

type OtpState = {
  challengeId: string | null;
  expiresAt: string | null;
  code: string;
  sentTo: string;
};

const emptyOtpState: OtpState = {
  challengeId: null,
  expiresAt: null,
  code: "",
  sentTo: "",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const { status } = useSession();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginMethod, setLoginMethod] = useState<"otp" | "password">("otp");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginOtp, setLoginOtp] = useState<OtpState>(emptyOtpState);

  const [regFullName, setRegFullName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerOtp, setRegisterOtp] = useState<OtpState>(emptyOtpState);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/admin");
    }
  }, [status, router]);

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError === "google_not_allowed") {
      setError("Your Google account is not authorised. Ask an admin to add your email first.");
    } else if (urlError === "signup_failed") {
      setError("Google sign-up failed. Please try again.");
    }
  }, [searchParams]);

  const loginOtpSeconds = useMemo(() => {
    if (!loginOtp.expiresAt) return 0;
    return Math.max(0, Math.ceil((new Date(loginOtp.expiresAt).getTime() - Date.now()) / 1000));
  }, [loginOtp.expiresAt, success, error]);

  const registerOtpSeconds = useMemo(() => {
    if (!registerOtp.expiresAt) return 0;
    return Math.max(0, Math.ceil((new Date(registerOtp.expiresAt).getTime() - Date.now()) / 1000));
  }, [registerOtp.expiresAt, success, error]);

  useEffect(() => {
    if (!loginOtp.expiresAt && !registerOtp.expiresAt) return;
    const interval = window.setInterval(() => {
      setLoginOtp((current) => {
        if (!current.expiresAt) return current;
        if (new Date(current.expiresAt).getTime() <= Date.now()) {
          return { ...current, challengeId: null, expiresAt: null, code: "" };
        }
        return current;
      });
      setRegisterOtp((current) => {
        if (!current.expiresAt) return current;
        if (new Date(current.expiresAt).getTime() <= Date.now()) {
          return { ...current, challengeId: null, expiresAt: null, code: "" };
        }
        return current;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [loginOtp.expiresAt, registerOtp.expiresAt]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const switchMode = (nextMode: "login" | "register") => {
    setMode(nextMode);
    clearMessages();
  };

  const completeOtpSignIn = async (ticket: string, destination: string) => {
    const result = await signIn("credentials", {
      otp_ticket: ticket,
      redirect: false,
    });

    if (result?.error) {
      setError("OTP was verified, but session creation failed. Please try again.");
      return;
    }

    const initRes = await fetch("/api/profiles/init", { method: "POST" });
    const initData = await initRes.json().catch(() => ({}));

    if (initData.needs_setup) {
      router.push("/admin/setup?from_signup=1");
      router.refresh();
      return;
    }

    router.push(destination);
    router.refresh();
  };

  const sendOtp = async (flow: "login" | "signup") => {
    clearMessages();
    setIsOtpSending(true);

    const payload = flow === "login"
      ? { email: loginEmail, flow }
      : { email: regEmail, full_name: regFullName, username: regUsername, password: regPassword, flow };

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP.");
        return;
      }

      const nextState = {
        challengeId: data.challengeId as string,
        expiresAt: data.expiresAt as string,
        code: "",
        sentTo: flow === "login" ? loginEmail : regEmail,
      };

      if (flow === "login") {
        setLoginOtp(nextState);
      } else {
        setRegisterOtp(nextState);
      }

      setSuccess(data.message || "OTP sent.");
    } catch {
      setError("Failed to send OTP.");
    } finally {
      setIsOtpSending(false);
    }
  };

  const verifyOtp = async (flow: "login" | "signup") => {
    clearMessages();
    setIsLoading(true);

    const state = flow === "login" ? loginOtp : registerOtp;
    const email = flow === "login" ? loginEmail : regEmail;

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token: state.code,
          challengeId: state.challengeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "OTP verification failed.");
        return;
      }

      setSuccess(data.message || "OTP verified.");
      await completeOtpSignIn(data.ticket, flow === "signup" || data.needsSetup ? "/admin/setup?from_signup=1" : callbackUrl);
    } catch {
      setError("OTP verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupOtpRequest = async () => {
    if (!regFullName.trim() || !regUsername.trim() || !regEmail.trim()) {
      setError("Full name, username, and email are required.");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    await sendOtp("signup");
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const preflight = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const preflightData = await preflight.json().catch(() => ({}));
      if (!preflight.ok) {
        setError(preflightData.error || "Password sign-in failed.");
        if (
          typeof preflightData.error === "string" &&
          preflightData.error.includes("Email OTP")
        ) {
          setLoginMethod("otp");
          if (username.includes("@")) {
            setLoginEmail(username);
          }
        }
        return;
      }

      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Session sign-in failed after password verification. Please try again.");
        return;
      }

      const initRes = await fetch("/api/profiles/init", { method: "POST" });
      const initData = await initRes.json().catch(() => ({}));

      if (initData.needs_setup) {
        router.push("/admin/setup?from_signup=1");
        router.refresh();
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearMessages();
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/admin" });
    } catch {
      setError("Google sign-in failed. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    clearMessages();
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/admin/setup?from_signup=1&google=1" });
    } catch {
      setError("Google sign-up failed. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const infoBanner = (
    <>
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {status === "loading" || status === "authenticated" ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 mb-4">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">KarobarX CRM</h1>
            <p className="text-slate-500 mt-1 text-sm">Secure admin access with email OTP</p>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Create Account
            </button>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            {mode === "login" ? (
              <>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Welcome back</h2>
                <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
                  <button
                    type="button"
                    onClick={() => { setLoginMethod("otp"); clearMessages(); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMethod === "otp" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Email OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginMethod("password"); clearMessages(); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMethod === "password" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Password
                  </button>
                </div>

                <div className="space-y-5">
                  {infoBanner}

                  {loginMethod === "otp" ? (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="login-email" className="text-slate-700 text-sm font-medium">Work Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="login-email"
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="pl-9 border-slate-200 rounded-xl h-11"
                            required
                          />
                        </div>
                      </div>

                      {loginOtp.challengeId && (
                        <div className="space-y-1.5">
                          <Label htmlFor="login-otp" className="text-slate-700 text-sm font-medium">OTP Code</Label>
                          <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              id="login-otp"
                              value={loginOtp.code}
                              onChange={(e) => setLoginOtp((current) => ({ ...current, code: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                              placeholder="Enter 6-digit code"
                              inputMode="numeric"
                              maxLength={6}
                              className="pl-9 border-slate-200 rounded-xl h-11 tracking-[0.3em]"
                            />
                          </div>
                          <p className="text-xs text-slate-500">
                            Sent to {loginOtp.sentTo}. {loginOtpSeconds > 0 ? `Expires in ${loginOtpSeconds}s.` : "Code expired."}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          onClick={() => sendOtp("login")}
                          disabled={isOtpSending}
                          variant="outline"
                          className="flex-1 h-11 rounded-xl"
                        >
                          {isOtpSending ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Sending...</> : (loginOtp.challengeId ? "Resend OTP" : "Send OTP")}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => verifyOtp("login")}
                          disabled={isLoading || !loginOtp.challengeId || loginOtp.code.length < 6}
                          className="flex-1 h-11 bg-violet-600 hover:bg-violet-700 rounded-xl"
                        >
                          {isLoading ? "Verifying..." : "Verify & Sign In"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <form onSubmit={handlePasswordLogin} className="space-y-5">
                      <div className="space-y-1.5">
                        <Label htmlFor="username" className="text-slate-700 text-sm font-medium">Username or Email</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username or email" className="pl-9 border-slate-200 rounded-xl h-11" required />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-slate-700 text-sm font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="pl-9 pr-10 border-slate-200 rounded-xl h-11" required />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" disabled={isLoading} className="w-full h-11 bg-violet-600 hover:bg-violet-700 rounded-xl">
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-5">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-400 font-medium">or continue with</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                <Button type="button" onClick={handleGoogleSignIn} disabled={isGoogleLoading} variant="outline" className="w-full h-11 mt-4 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2.5">
                  {isGoogleLoading ? "Redirecting..." : <><GoogleIcon />Sign in with Google</>}
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Create your account</h2>
                <div className="space-y-4">
                  {infoBanner}
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-fullname" className="text-slate-700 text-sm font-medium">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input id="reg-fullname" type="text" value={regFullName} onChange={(e) => setRegFullName(e.target.value)} placeholder="Your full name" className="pl-9 border-slate-200 rounded-xl h-11" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-username" className="text-slate-700 text-sm font-medium">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input id="reg-username" type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="Choose a username" className="pl-9 border-slate-200 rounded-xl h-11" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email" className="text-slate-700 text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input id="reg-email" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="name@company.com" className="pl-9 border-slate-200 rounded-xl h-11" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="text-slate-700 text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="reg-password"
                        type={showRegisterPassword ? "text" : "password"}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create a password"
                        className="pl-9 pr-10 border-slate-200 rounded-xl h-11"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-confirm-password" className="text-slate-700 text-sm font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="reg-confirm-password"
                        type={showRegisterPassword ? "text" : "password"}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="pl-9 border-slate-200 rounded-xl h-11"
                        required
                      />
                    </div>
                  </div>

                  {registerOtp.challengeId && (
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-otp" className="text-slate-700 text-sm font-medium">OTP Code</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="reg-otp"
                          value={registerOtp.code}
                          onChange={(e) => setRegisterOtp((current) => ({ ...current, code: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                          placeholder="Enter 6-digit code"
                          inputMode="numeric"
                          maxLength={6}
                          className="pl-9 border-slate-200 rounded-xl h-11 tracking-[0.3em]"
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        Sent to {registerOtp.sentTo}. {registerOtpSeconds > 0 ? `Expires in ${registerOtpSeconds}s.` : "Code expired."}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button type="button" onClick={handleSignupOtpRequest} disabled={isOtpSending} variant="outline" className="flex-1 h-11 rounded-xl">
                      {isOtpSending ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Sending...</> : (registerOtp.challengeId ? "Resend OTP" : "Send OTP")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => verifyOtp("signup")}
                      disabled={isLoading || !registerOtp.challengeId || registerOtp.code.length < 6}
                      className="flex-1 h-11 bg-violet-600 hover:bg-violet-700 rounded-xl"
                    >
                      {isLoading ? "Verifying..." : "Verify & Create"}
                    </Button>
                  </div>

                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-xs text-slate-400 font-medium">or</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  <Button type="button" onClick={handleGoogleSignUp} disabled={isGoogleLoading} variant="outline" className="w-full h-11 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2.5">
                    {isGoogleLoading ? "Redirecting..." : <><GoogleIcon />Sign up with Google</>}
                  </Button>

                  <p className="text-xs text-center text-slate-400">
                    New accounts start as <strong>super-admin owners</strong> and continue into CRM setup after verification.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
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
