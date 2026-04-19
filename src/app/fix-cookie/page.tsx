"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function FixCookiePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fixCookie = async () => {
      try {
        const res = await fetch("/api/profiles/init", { method: "POST" });
        const data = await res.json();

        if (data.success) {
          setStatus("success");
          setMessage(`Profile cookie set! Profile ID: ${data.profile_id}`);
          
          // Redirect to admin after 2 seconds
          setTimeout(() => {
            router.push("/admin");
          }, 2000);
        } else if (data.needs_setup) {
          setStatus("error");
          setMessage("Your account needs to complete setup first.");
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to set profile cookie");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Error: " + String(error));
      }
    };

    fixCookie();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <div className="text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">Fixing Cookie...</h1>
              <p className="text-slate-500 text-sm">Setting up your profile cookie</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">Cookie Fixed!</h1>
              <p className="text-slate-500 text-sm mb-4">{message}</p>
              <p className="text-slate-400 text-xs">Redirecting to admin dashboard...</p>
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
                  onClick={() => window.location.reload()}
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
