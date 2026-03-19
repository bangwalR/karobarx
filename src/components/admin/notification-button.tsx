"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, Loader2, Smartphone, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function NotificationButton() {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [ntfyTopic, setNtfyTopic] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
    // Derive ntfy topic from profile cookie
    const profileId =
      document.cookie
        .split("; ")
        .find((r) => r.startsWith("active_profile_id="))
        ?.split("=")[1] || "default";
    setNtfyTopic(
      `mobilehub-${profileId.slice(0, 8)}`
    );

    // Check if already subscribed
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch { /* ignore */ }
  };

  const registerSW = async () => {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    return reg;
  };

  const handleEnableBrowser = async () => {
    setLoading(true);
    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Notification permission denied. Please allow in browser settings.");
        return;
      }

      // Register service worker
      const reg = await registerSW();
      if (!reg) {
        toast.error("Service workers not supported in this browser.");
        return;
      }

      // Get VAPID public key
      const keyRes = await fetch("/api/notifications/vapid-key");
      if (!keyRes.ok) {
        toast.error("Push service not configured (VAPID keys missing).");
        return;
      }
      const { publicKey } = await keyRes.json();

      // Subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Save subscription to DB
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
          },
          userAgent: navigator.userAgent,
        }),
      });

      setSubscribed(true);
      toast.success("Browser notifications enabled! 🔔");
    } catch (err) {
      console.error(err);
      toast.error("Failed to enable notifications.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!("serviceWorker" in navigator)) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notifications disabled.");
    } catch { toast.error("Failed to disable."); }
    finally { setLoading(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await fetch("/api/notifications/test", { method: "POST" });
      toast.success("Test notification sent!");
    } catch { toast.error("Test failed."); }
    finally { setTesting(false); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ntfyUrl = `https://ntfy.sh/${ntfyTopic}`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
        title="Notification Settings"
      >
        {subscribed ? (
          <BellRing className="w-5 h-5 text-violet-600" />
        ) : (
          <Bell className="w-5 h-5 text-slate-500" />
        )}
        {subscribed && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <BellRing className="w-5 h-5 text-violet-600" />
              Notification Setup
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Get instant alerts for new leads, orders, inquiries &amp; meetings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-1">
            {/* Browser push */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <span className="font-semibold text-sm text-slate-800">Browser Push</span>
                </div>
                {subscribed ? (
                  <span className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 flex items-center gap-1 font-medium">
                    <CheckCircle className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                    {permission === "denied" ? "Blocked" : "Not enabled"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Receive push notifications directly in this browser — even when the tab is minimised.
              </p>
              {permission === "denied" ? (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  ⚠️ Blocked by browser. Go to Settings → Site Settings → Notifications → Allow.
                </p>
              ) : subscribed ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleTest} disabled={testing} className="flex-1 border-slate-300 text-slate-700 text-xs hover:bg-slate-100">
                    {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send Test"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDisable} disabled={loading} className="flex-1 border-red-200 text-red-500 hover:bg-red-50 text-xs">
                    <BellOff className="w-3 h-3 mr-1" /> Disable
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={handleEnableBrowser}
                  disabled={loading}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white border-0 text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
                  Enable Browser Notifications
                </Button>
              )}
            </div>

            {/* ntfy.sh */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Smartphone className="w-3.5 h-3.5 text-orange-500" />
                </div>
                <span className="font-semibold text-sm text-slate-800">Mobile Push (ntfy.sh)</span>
                <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">Free</span>
              </div>
              <p className="text-xs text-slate-500">
                Get notifications on your phone via the free <strong className="text-slate-700">ntfy</strong> app (Android/iOS). No account needed.
              </p>

              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Your topic</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-violet-700 flex-1 font-mono font-semibold">{ntfyTopic}</code>
                  <button
                    onClick={() => handleCopy(ntfyTopic)}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
                <li>Download <strong className="text-slate-700">ntfy</strong> from App Store or Play Store</li>
                <li>Tap <strong className="text-slate-700">+</strong> → enter topic: <code className="text-violet-700 font-mono">{ntfyTopic}</code></li>
                <li>Done — you&apos;ll get instant alerts!</li>
              </ol>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing}
                  className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-100 text-xs"
                >
                  {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send Test"}
                </Button>
                <a href={ntfyUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button size="sm" variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-100 text-xs gap-1">
                    <ExternalLink className="w-3 h-3" /> Open ntfy.sh
                  </Button>
                </a>
              </div>
            </div>

            {/* What you'll be notified about */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">You&apos;ll be notified for:</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { icon: "🆕", label: "New Leads" },
                  { icon: "💰", label: "Orders" },
                  { icon: "📩", label: "Inquiries" },
                  { icon: "📅", label: "Meetings" },
                  { icon: "💬", label: "WhatsApp" },
                  { icon: "⚡", label: "Events" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2 py-1.5 text-xs text-slate-600 font-medium">
                    <span>{item.icon}</span> {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
