"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function ForceCookiePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "loading" | "success" | "error" | "no-auth">("checking");
  const [message, setMessage] = useState("");
  const [profileId, setProfileId] = useState("");

  useEffect(() => {
    checkAndFix();
  }, []);

  const checkAndFix = async () => {
    try {
      setStatus("checking");
      
      // First check if cookie exists
      const debugRes = await fetch("/api/debug-config");
      const debugData = await debugRes.json();
      
      if (debugData.profileId) {
        setStatus("success");
        setProfileId(debugData.profileId);
        setMessage("Cookie is already set! Your profile is active.");
        return;
      }

      // Cookie missing - try to set it
      setStatus("loading");
      setMessage("Cookie missing. Setting it now...");

      const res = await fetch("/api/profiles/init", { method: "POST" });
      const data = await res.json();

      if (res.status === 401) {
        setStatus("no-auth");
        setMessage("You are not logged in. Please log in first.");
        return;
      }

      if (data.success && data.profile_id) {
        setStatus("success");
        setProfileId(data.profile_id);
        setMessage(`Cookie set successfully! Profile ID: ${data.profile_id}`);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          window.location.href = "/admin";
        }, 2000);
      } else if (data.needs_setup) {
        setStatus("error");
        setMessage("Your account needs to complete setup first.");
        setTimeout(() => {
          router.push("/admin/setup?from_signup=1");
        }, 2000);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to set profile cookie");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Error: " + String(error));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <div className="text-center">
          {status === "checking" && (
            <>
              <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">Checking Cookie...</h1>
              <p className="text-slate-500 text-sm">Verifying your profile cookie</p>
            </>
          )}

          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">Setting Cookie...</h1>
              <p className="text-slate-500 text-sm">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">Cookie Fixed!</h1>
              <p className="text-slate-500 text-sm mb-4">{message}</p>
              {profileId && (
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-slate-400 mb-1">Profile ID:</p>
                  <p className="text-xs font-mono text-slate-700 break-all">{profileId}</p>
                </div>
              )}
              <p className="text-slate-400 text-xs">Redirecting to dashboard...</p>
            </>
          )}

          {status === "no-auth" && (
            <>
              <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">Not Logged In</h1>
              <p className="text-slate-500 text-sm mb-6">{message}</p>
              <Button
                onClick={() => router.push("/admin/login")}
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                Go to Login
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">Error</h1>
              <p className="text-slate-500 text-sm mb-6">{message}</p>
              <div className="space-y-2">
                <Button
                  onClick={() => router.push("/admin/login")}
                  className="w-full bg-violet-600 hover:bg-violet-700"
                >
                  Go to Login
                </Button>
                <Button
                  onClick={checkAndFix}
                  variant="outline"
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
