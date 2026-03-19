"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send, Plus, Pause, Play, Trash2, Users, MessageSquare,
  BarChart2, WifiOff, QrCode, ChevronRight, Search, CheckCircle2,
  Clock, AlertCircle, Image, RefreshCw, Eye, X, Check, ChevronDown,
  Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Types ────────────────────────────────────────────────────────────────────
type CampaignStatus = "draft" | "running" | "paused" | "completed" | "cancelled";

interface Campaign {
  id: string;
  name: string;
  description?: string;
  message_template: string;
  media_url?: string;
  media_type: string;
  media_caption?: string;
  status: CampaignStatus;
  delay_seconds: number;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface Recipient {
  id: string;
  phone: string;
  name?: string;
  status: string;
  wa_message_id?: string;
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  total_orders?: number;
  status?: string;
}

interface Lead {
  id: string;
  name: string;
  phone?: string;
  platform_user_id?: string;
  username?: string;
  source?: string;
}

interface WaStatus {
  isReady: boolean;
  isAuthenticated: boolean;
  hasQr: boolean;
  clientInfo?: { name: string; phone: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: "Draft",     color: "bg-slate-100 text-slate-600",   icon: <Clock className="w-3 h-3" /> },
  running:   { label: "Running",   color: "bg-blue-100 text-blue-700",     icon: <Play className="w-3 h-3" /> },
  paused:    { label: "Paused",    color: "bg-amber-100 text-amber-700",   icon: <Pause className="w-3 h-3" /> },
  completed: { label: "Completed", color: "bg-green-100 text-green-700",   icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-600",       icon: <X className="w-3 h-3" /> },
};

const RECIPIENT_STATUS: Record<string, { label: string; dot: string }> = {
  pending:   { label: "Pending",   dot: "bg-slate-300" },
  sending:   { label: "Sending",   dot: "bg-blue-400 animate-pulse" },
  sent:      { label: "Sent",      dot: "bg-blue-500" },
  delivered: { label: "Delivered", dot: "bg-violet-500" },
  read:      { label: "Read",      dot: "bg-green-500" },
  failed:    { label: "Failed",    dot: "bg-red-500" },
  skipped:   { label: "Skipped",   dot: "bg-slate-300" },
};

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function pct(a: number, total: number) {
  if (!total) return 0;
  return Math.round((a / total) * 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBar({ sent, delivered, read, failed, total }: {
  sent: number; delivered: number; read: number; failed: number; total: number;
}) {
  if (!total) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100">
        <div className="bg-blue-400 transition-all" style={{ width: pct(sent, total) + "%" }} />
        <div className="bg-violet-500 transition-all" style={{ width: pct(delivered, total) + "%" }} />
        <div className="bg-green-500 transition-all" style={{ width: pct(read, total) + "%" }} />
        <div className="bg-red-400 transition-all" style={{ width: pct(failed, total) + "%" }} />
      </div>
      <div className="flex gap-3 text-xs text-slate-500 flex-wrap">
        <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />{sent} sent</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-violet-500 mr-1" />{delivered} delivered</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />{read} read</span>
        {failed > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />{failed} failed</span>}
      </div>
    </div>
  );
}

function WaStatusBadge({ status }: { status: WaStatus }) {
  if (status.isReady) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Connected{status.clientInfo ? ` · ${status.clientInfo.name}` : ""}
      </span>
    );
  }
  if (status.isAuthenticated && !status.isReady) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        Authenticating…
      </span>
    );
  }
  if (status.hasQr) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Scan QR
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Disconnected
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MarketingPage() {
  const [channel, setChannel] = useState<"whatsapp" | "instagram">("whatsapp");
  const [tab, setTab] = useState<"campaigns" | "compose" | "analytics">("campaigns");
  const [waStatus, setWaStatus] = useState<WaStatus>({ isReady: false, isAuthenticated: false, hasQr: false });
  const [qrData, setQrData] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  // WhatsApp campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  // Instagram campaigns
  const [igCampaigns, setIgCampaigns] = useState<Campaign[]>([]);
  const [loadingIgCampaigns, setLoadingIgCampaigns] = useState(false);
  const [igConnected, setIgConnected] = useState(false);
  const [igConnectedAs, setIgConnectedAs] = useState("");

  // Compose step: 1=recipients, 2=message, 3=review
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  // Instagram leads for compose
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [campaignName, setCampaignName] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(20);
  const [igDelaySeconds, setIgDelaySeconds] = useState(5);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Analytics
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<{ campaign: Campaign; recipients: Recipient[] } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── WA Status Poll ─────────────────────────────────────────────────────────
  const fetchWaStatus = useCallback(async () => {
    try {
      const res = await fetch(`${WA_BACKEND}/status`);
      const data = await res.json();
      setWaStatus(data);
      if (data.hasQr) {
        const qr = await fetch(`${WA_BACKEND}/qr`).then((r) => r.json());
        setQrData(qr.qr);
      } else {
        setQrData(null);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchWaStatus();
    const iv = setInterval(fetchWaStatus, 5000);
    return () => clearInterval(iv);
  }, [fetchWaStatus]);

  // ── Campaigns Poll ─────────────────────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/marketing/campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (_) {}
    setLoadingCampaigns(false);
  }, []);

  const fetchIgCampaigns = useCallback(async () => {
    setLoadingIgCampaigns(true);
    try {
      const res = await fetch("/api/marketing/instagram/campaigns");
      const data = await res.json();
      setIgCampaigns(data.campaigns || []);
    } catch (_) {}
    setLoadingIgCampaigns(false);
  }, []);

  useEffect(() => {
    fetchCampaigns();
    pollRef.current = setInterval(() => {
      setCampaigns((prev) => {
        if (prev.some((c) => c.status === "running")) fetchCampaigns();
        return prev;
      });
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchCampaigns]);

  useEffect(() => {
    if (channel === "instagram") {
      fetchIgCampaigns();
    }
  }, [channel, fetchIgCampaigns]);

  // Poll IG campaigns when any is running
  useEffect(() => {
    if (channel !== "instagram") return;
    const iv = setInterval(() => {
      setIgCampaigns((prev) => {
        if (prev.some((c) => c.status === "running")) fetchIgCampaigns();
        return prev;
      });
    }, 4000);
    return () => clearInterval(iv);
  }, [channel, fetchIgCampaigns]);

  // ── Instagram Status ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/social/instagram/status")
      .then((r) => r.json())
      .then((d) => {
        setIgConnected(d.connected || false);
        setIgConnectedAs(d.username || d.name || "");
      })
      .catch(() => {});
  }, []);

  // ── Customers ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "compose" || channel !== "whatsapp") return;
    setLoadingCustomers(true);
    fetch("/api/customers?limit=500")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers || []))
      .catch(() => {})
      .finally(() => setLoadingCustomers(false));
  }, [tab, channel]);

  // ── Instagram Leads ────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "compose" || channel !== "instagram") return;
    setLoadingLeads(true);
    fetch("/api/leads?source=instagram&limit=500")
      .then((r) => r.json())
      .then((d) => setLeads((d.leads || []).filter((l: Lead) => l.platform_user_id)))
      .catch(() => {})
      .finally(() => setLoadingLeads(false));
  }, [tab, channel]);

  // ── Analytics poll ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!analyticsId) return;
    const endpoint = channel === "instagram"
      ? `/api/marketing/instagram/campaigns/${analyticsId}`
      : `/api/marketing/campaigns/${analyticsId}`;
    const load = async () => {
      setLoadingAnalytics(true);
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        setAnalyticsData(data);
      } catch (_) {}
      setLoadingAnalytics(false);
    };
    load();
    const iv = setInterval(load, 4000);
    return () => clearInterval(iv);
  }, [analyticsId, channel]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleScanQr = () => { setShowQr(true); fetchWaStatus(); };
  const handleDisconnect = async () => {
    await fetch(`${WA_BACKEND}/disconnect`, { method: "POST" });
    fetchWaStatus();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    const filtered = channel === "instagram"
      ? leads.filter((l) =>
          l.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
          l.username?.toLowerCase().includes(leadSearch.toLowerCase())
        )
      : customers.filter((c) =>
          c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone?.includes(customerSearch)
        );
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((c) => c.id)));
  };

  // Reset compose state when switching channels
  const switchChannel = (ch: "whatsapp" | "instagram") => {
    setChannel(ch);
    setTab("campaigns");
    setStep(1);
    setSelectedIds(new Set());
    setCampaignName("");
    setMessageTemplate("");
    setMediaUrl("");
    setCreateError("");
    setAnalyticsId(null);
    setAnalyticsData(null);
  };

  const handleCreateCampaign = async () => {
    setCreateError("");
    if (!campaignName.trim()) return setCreateError("Campaign name is required.");
    if (!messageTemplate.trim()) return setCreateError("Message template is required.");
    if (selectedIds.size === 0) return setCreateError("Select at least one recipient.");
    setCreating(true);
    try {
      const endpoint = channel === "instagram"
        ? "/api/marketing/instagram/campaigns"
        : "/api/marketing/campaigns";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          message_template: messageTemplate,
          media_url: channel === "whatsapp" ? (mediaUrl || undefined) : undefined,
          media_type: channel === "whatsapp" && mediaUrl ? "image" : "none",
          delay_seconds: channel === "instagram" ? igDelaySeconds : delaySeconds,
          target_type: "selected",
          recipient_ids: Array.from(selectedIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) return setCreateError(data.error || "Failed to create campaign.");
      if (channel === "instagram") {
        setIgCampaigns((prev) => [data.campaign, ...prev]);
        fetchIgCampaigns();
      } else {
        setCampaigns((prev) => [data.campaign, ...prev]);
        fetchCampaigns();
      }
      // Reset
      setCampaignName(""); setMessageTemplate(""); setMediaUrl("");
      setSelectedIds(new Set()); setStep(1); setTab("campaigns");
    } catch {
      setCreateError("Failed to create campaign.");
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async (campaign: Campaign) => {
    if (!waStatus.isReady) { alert("Connect WhatsApp first."); return; }
    await fetch(`/api/marketing/campaigns/${campaign.id}/send`, { method: "POST" });
    fetchCampaigns();
  };

  const handleIgSend = async (campaign: Campaign) => {
    if (!igConnected) { alert("Connect Instagram first in Settings."); return; }
    await fetch(`/api/marketing/instagram/campaigns/${campaign.id}/send`, { method: "POST" });
    setTimeout(fetchIgCampaigns, 500);
  };

  const handlePause = async (id: string) => {
    await fetch(`/api/marketing/campaigns/${id}/pause`, { method: "POST" });
    fetchCampaigns();
  };

  const handleResume = async (id: string) => {
    await fetch(`/api/marketing/campaigns/${id}/resume`, { method: "POST" });
    fetchCampaigns();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign and all its data?")) return;
    if (channel === "instagram") {
      await fetch(`/api/marketing/instagram/campaigns/${id}`, { method: "DELETE" });
      fetchIgCampaigns();
    } else {
      await fetch(`/api/marketing/campaigns/${id}`, { method: "DELETE" });
      fetchCampaigns();
    }
  };

  const openAnalytics = (id: string) => {
    setAnalyticsId(id);
    setTab("analytics");
  };

  const filteredCustomers = customers.filter((c) =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  const filteredLeads = leads.filter((l) =>
    l.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
    l.username?.toLowerCase().includes(leadSearch.toLowerCase())
  );

  const filteredRecipients = analyticsData?.recipients?.filter((r) =>
    r.name?.toLowerCase().includes(recipientSearch.toLowerCase()) ||
    r.phone?.includes(recipientSearch)
  ) || [];

  const activeCampaigns = channel === "instagram" ? igCampaigns : campaigns;
  const activeLoading = channel === "instagram" ? loadingIgCampaigns : loadingCampaigns;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {channel === "instagram" ? "Instagram Marketing" : "WhatsApp Marketing"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Create and manage bulk messaging campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Channel switcher */}
            <div className="flex items-center rounded-xl border border-slate-200 p-0.5 bg-slate-50">
              <button
                onClick={() => switchChannel("whatsapp")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  channel === "whatsapp"
                    ? "bg-white shadow-sm text-green-700 border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <MessageSquare className="w-4 h-4" />WhatsApp
              </button>
              <button
                onClick={() => switchChannel("instagram")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  channel === "instagram"
                    ? "bg-white shadow-sm text-pink-600 border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Instagram className="w-4 h-4" />Instagram
              </button>
            </div>

            {/* Status badge */}
            {channel === "whatsapp" ? (
              <>
                <WaStatusBadge status={waStatus} />
                {waStatus.isReady ? (
                  <Button variant="outline" size="sm" onClick={handleDisconnect} className="text-red-600 border-red-200 hover:bg-red-50 text-xs">
                    <WifiOff className="w-3.5 h-3.5 mr-1.5" />Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleScanQr} className="bg-violet-600 hover:bg-violet-700 text-white text-xs">
                    <QrCode className="w-3.5 h-3.5 mr-1.5" />Connect WhatsApp
                  </Button>
                )}
              </>
            ) : (
              igConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-pink-700 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                  {igConnectedAs ? `@${igConnectedAs}` : "Connected"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Not Connected
                </span>
              )
            )}
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 mt-4">
          {[
            { id: "campaigns", label: "Campaigns",    icon: MessageSquare },
            { id: "compose",   label: "New Campaign", icon: Plus },
            { id: "analytics", label: "Analytics",    icon: BarChart2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as typeof tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id
                  ? channel === "instagram"
                    ? "bg-pink-50 text-pink-700"
                    : "bg-violet-50 text-violet-700"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">

        {/* ══ CAMPAIGNS TAB ══════════════════════════════════════════════════ */}
        {tab === "campaigns" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{activeCampaigns.length} campaign{activeCampaigns.length !== 1 ? "s" : ""}</p>
              <Button
                size="sm"
                onClick={() => setTab("compose")}
                className={channel === "instagram" ? "bg-pink-600 hover:bg-pink-700 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"}
              >
                <Plus className="w-4 h-4 mr-1.5" />New Campaign
              </Button>
            </div>

            {activeLoading && (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading campaigns…
              </div>
            )}

            {!activeLoading && activeCampaigns.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${channel === "instagram" ? "bg-pink-50" : "bg-violet-50"}`}>
                  {channel === "instagram"
                    ? <Instagram className="w-7 h-7 text-pink-500" />
                    : <MessageSquare className="w-7 h-7 text-violet-500" />
                  }
                </div>
                <p className="text-slate-600 font-medium">No campaigns yet</p>
                <p className="text-slate-400 text-sm mt-1">
                  {channel === "instagram"
                    ? "Create your first Instagram DM campaign to reach followers."
                    : "Create your first campaign to start reaching customers."}
                </p>
                <Button
                  size="sm"
                  onClick={() => setTab("compose")}
                  className={`mt-4 ${channel === "instagram" ? "bg-pink-600 hover:bg-pink-700" : "bg-violet-600 hover:bg-violet-700"} text-white`}
                >
                  <Plus className="w-4 h-4 mr-1.5" />Create Campaign
                </Button>
              </div>
            )}

            {activeCampaigns.map((campaign) => {
              const sc = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
              const progressPct = campaign.total_recipients
                ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100)
                : 0;
              return (
                <div key={campaign.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 truncate">{campaign.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                          {sc.icon}{sc.label}
                        </span>
                        {channel === "instagram" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-pink-50 text-pink-600">
                            <Instagram className="w-3 h-3" />Instagram DM
                          </span>
                        )}
                        {channel === "whatsapp" && campaign.media_type !== "none" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-600">
                            <Image className="w-3 h-3" />Media
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-400 mt-1 line-clamp-1">{campaign.message_template}</p>

                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{campaign.total_recipients} recipients</span>
                        <span>Created {fmtDate(campaign.created_at)}</span>
                        {campaign.started_at && <span>Started {fmtDate(campaign.started_at)}</span>}
                        {campaign.completed_at && <span>Completed {fmtDate(campaign.completed_at)}</span>}
                      </div>

                      {/* Progress bar */}
                      {campaign.total_recipients > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>{campaign.sent_count + campaign.failed_count} / {campaign.total_recipients}</span>
                            <span>{progressPct}%</span>
                          </div>
                          <StatBar
                            sent={campaign.sent_count}
                            delivered={campaign.delivered_count}
                            read={campaign.read_count}
                            failed={campaign.failed_count}
                            total={campaign.total_recipients}
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openAnalytics(campaign.id)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-violet-600 transition-colors"
                        title="View analytics"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* WhatsApp actions */}
                      {channel === "whatsapp" && campaign.status === "draft" && (
                        <button
                          onClick={() => handleSend(campaign)}
                          disabled={!waStatus.isReady}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />Send
                        </button>
                      )}
                      {channel === "whatsapp" && campaign.status === "running" && (
                        <button
                          onClick={() => handlePause(campaign.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium hover:bg-amber-100 transition-colors"
                        >
                          <Pause className="w-3.5 h-3.5" />Pause
                        </button>
                      )}
                      {channel === "whatsapp" && campaign.status === "paused" && (
                        <button
                          onClick={() => handleResume(campaign.id)}
                          disabled={!waStatus.isReady}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium hover:bg-blue-100 disabled:opacity-40 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />Resume
                        </button>
                      )}

                      {/* Instagram actions */}
                      {channel === "instagram" && campaign.status === "draft" && (
                        <button
                          onClick={() => handleIgSend(campaign)}
                          disabled={!igConnected}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-medium hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />Send DMs
                        </button>
                      )}
                      {channel === "instagram" && campaign.status === "running" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-50 text-pink-600 border border-pink-200 text-xs font-medium">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />Sending…
                        </span>
                      )}

                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Delete campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ COMPOSE TAB ════════════════════════════════════════════════════ */}
        {tab === "compose" && (
          <div className="max-w-4xl mx-auto">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[
                { n: 1, label: "Select Recipients" },
                { n: 2, label: "Compose Message" },
                { n: 3, label: "Review & Send" },
              ].map(({ n, label }, i, arr) => (
                <div key={n} className="flex items-center gap-2">
                  <button
                    onClick={() => step > n && setStep(n)}
                    className={`flex items-center gap-2 transition-all ${step > n ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      step === n
                        ? channel === "instagram" ? "bg-pink-600 text-white" : "bg-violet-600 text-white"
                        : step > n
                        ? channel === "instagram" ? "bg-pink-100 text-pink-600" : "bg-violet-100 text-violet-600"
                        : "bg-slate-100 text-slate-400"
                    }`}>
                      {step > n ? <Check className="w-3.5 h-3.5" /> : n}
                    </span>
                    <span className={`text-sm font-medium hidden sm:block ${step === n ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
                  </button>
                  {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
                </div>
              ))}
            </div>

            {/* Step 1: Recipients */}
            {step === 1 && channel === "whatsapp" && (
              <div className="bg-white rounded-2xl border border-slate-200">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-900">Select Recipients</h2>
                      <p className="text-sm text-slate-400 mt-0.5">{selectedIds.size} selected from {customers.length} customers</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => { if (selectedIds.size === 0) return; setStep(2); }}
                      disabled={selectedIds.size === 0}
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search by name or phone…"
                        className="pl-9 border-slate-200 h-9 text-sm"
                      />
                    </div>
                    <button
                      onClick={toggleAll}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      {selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0 ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[460px]">
                  {loadingCustomers && (
                    <div className="flex items-center justify-center py-12 text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…
                    </div>
                  )}
                  {filteredCustomers.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                    >
                      <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => toggleSelect(c.id)}
                        className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                      />
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-50 shrink-0">
                        <span className="text-xs font-semibold text-violet-600">{c.name?.[0]?.toUpperCase() || "?"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{c.name || "Unknown"}</p>
                        <p className="text-xs text-slate-400">{c.phone}</p>
                      </div>
                      {(c.total_orders || 0) > 0 && (
                        <span className="text-xs text-slate-400">{c.total_orders} orders</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Instagram — select leads/followers */}
            {step === 1 && channel === "instagram" && (
              <div className="space-y-3">
                {/* 24-hour window warning */}
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <p className="font-medium">Instagram 24-hour messaging window</p>
                    <p className="text-xs mt-0.5 text-amber-700">Instagram only allows DMing users who have <strong>messaged your account within the last 24 hours</strong>. Messages to inactive followers will fail. Select only recent contacts for best results.</p>
                  </div>
                </div>
              <div className="bg-white rounded-2xl border border-slate-200">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-900">Select Followers</h2>
                      <p className="text-sm text-slate-400 mt-0.5">{selectedIds.size} selected from {leads.length} Instagram followers</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => { if (selectedIds.size === 0) return; setStep(2); }}
                      disabled={selectedIds.size === 0}
                      className="bg-pink-600 hover:bg-pink-700 text-white"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={leadSearch}
                        onChange={(e) => setLeadSearch(e.target.value)}
                        placeholder="Search by name or username…"
                        className="pl-9 border-slate-200 h-9 text-sm"
                      />
                    </div>
                    <button
                      onClick={toggleAll}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      {selectedIds.size === filteredLeads.length && filteredLeads.length > 0 ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[460px]">
                  {loadingLeads && (
                    <div className="flex items-center justify-center py-12 text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading followers…
                    </div>
                  )}
                  {!loadingLeads && filteredLeads.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      No Instagram followers found. Make sure Instagram is connected and conversations are synced.
                    </div>
                  )}
                  {filteredLeads.map((l) => (
                    <label
                      key={l.id}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                    >
                      <Checkbox
                        checked={selectedIds.has(l.id)}
                        onCheckedChange={() => toggleSelect(l.id)}
                        className="data-[state=checked]:bg-pink-600 data-[state=checked]:border-pink-600"
                      />
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 shrink-0">
                        <span className="text-xs font-semibold text-pink-600">{l.name?.[0]?.toUpperCase() || "?"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{l.name || "Unknown"}</p>
                        {l.username && <p className="text-xs text-slate-400">@{l.username}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              </div>
            )}

            {/* Step 2: Compose */}
            {step === 2 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">Compose Message</h2>
                  <Button
                    size="sm"
                    onClick={() => setStep(3)}
                    disabled={!messageTemplate.trim() || !campaignName.trim()}
                    className={channel === "instagram" ? "bg-pink-600 hover:bg-pink-700 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"}
                  >
                    Review <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Campaign Name</Label>
                  <Input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder={channel === "instagram" ? "e.g. Followers Promo DM" : "e.g. Weekend Sale Offer"}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-slate-700">Message</Label>
                    <span className="text-xs text-slate-400">{messageTemplate.length} chars</span>
                  </div>
                  <textarea
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    placeholder={
                      channel === "instagram"
                        ? "Hi {{name}},\n\nCheck out our latest deals on second-hand phones! 📱\n\nUse {{name}} or {{username}} for personalized messages."
                        : "Hi {{name}},\n\nWe have exciting offers for you! 🎉\n\nUse {{name}} for personalized greetings."
                    }
                    rows={7}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {(channel === "instagram" ? ["{{name}}", "{{username}}"] : ["{{name}}", "{{phone}}"]).map((v) => (
                      <button
                        key={v}
                        onClick={() => setMessageTemplate((p) => p + v)}
                        className={`px-2 py-0.5 rounded text-xs font-mono hover:opacity-80 ${channel === "instagram" ? "bg-pink-50 text-pink-600 hover:bg-pink-100" : "bg-violet-50 text-violet-600 hover:bg-violet-100"}`}
                      >
                        + {v}
                      </button>
                    ))}
                    <span className="text-xs text-slate-400 self-center ml-1">Click to insert variable</span>
                  </div>
                </div>

                {/* Media URL — WhatsApp only */}
                {channel === "whatsapp" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Image URL (optional)</Label>
                    <Input
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://res.cloudinary.com/…"
                      className="border-slate-200"
                    />
                    {mediaUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl} alt="preview" className="mt-2 h-28 w-auto rounded-lg object-cover border border-slate-200" />
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">
                    Delay between messages: {channel === "instagram" ? igDelaySeconds : delaySeconds}s
                  </Label>
                  <input
                    type="range"
                    min={channel === "instagram" ? 3 : 10}
                    max={channel === "instagram" ? 30 : 60}
                    step={channel === "instagram" ? 1 : 5}
                    value={channel === "instagram" ? igDelaySeconds : delaySeconds}
                    onChange={(e) => channel === "instagram" ? setIgDelaySeconds(Number(e.target.value)) : setDelaySeconds(Number(e.target.value))}
                    className={`w-full ${channel === "instagram" ? "accent-pink-600" : "accent-violet-600"}`}
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{channel === "instagram" ? "3s (faster)" : "10s (faster)"}</span>
                    <span>{channel === "instagram" ? "30s (safer)" : "60s (safer)"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                <h2 className="font-semibold text-slate-900">Review & Create Campaign</h2>

                {createError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />{createError}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Campaign Name", value: campaignName },
                    { label: channel === "instagram" ? "Followers" : "Recipients", value: selectedIds.size.toString() },
                    { label: "Delay", value: (channel === "instagram" ? igDelaySeconds : delaySeconds) + "s between msgs" },
                    { label: "Channel", value: channel === "instagram" ? "Instagram DM" : (mediaUrl ? "WhatsApp + Image" : "WhatsApp Text") },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Message Preview</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {messageTemplate
                      .replace(/\{\{name\}\}/g, "Rahul")
                      .replace(/\{\{username\}\}/g, "@rahul_delhi")
                      .replace(/\{\{phone\}\}/g, "+91-98765-43210")}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="border-slate-200">
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateCampaign}
                    disabled={creating}
                    className={`flex-1 ${channel === "instagram" ? "bg-pink-600 hover:bg-pink-700" : "bg-violet-600 hover:bg-violet-700"} text-white`}
                  >
                    {creating ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Creating…</>
                    ) : (
                      <><Check className="w-4 h-4 mr-2" />Create Campaign</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ ANALYTICS TAB ══════════════════════════════════════════════════ */}
        {tab === "analytics" && (
          <div className="space-y-4">
            {/* Campaign selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Select Campaign</Label>
              <div className="relative">
                <select
                  value={analyticsId || ""}
                  onChange={(e) => setAnalyticsId(e.target.value || null)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                >
                  <option value="">— Choose a campaign —</option>
                  {activeCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({STATUS_CONFIG[c.status]?.label})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {!analyticsId && (
              <div className="text-center py-16 text-slate-400 text-sm">
                Select a campaign above to view its delivery analytics.
              </div>
            )}

            {analyticsId && loadingAnalytics && !analyticsData && (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…
              </div>
            )}

            {analyticsData && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    { label: "Total",     value: analyticsData.campaign.total_recipients, color: "text-slate-700" },
                    { label: "Sent",      value: analyticsData.campaign.sent_count,       color: "text-blue-600" },
                    { label: "Delivered", value: analyticsData.campaign.delivered_count,  color: "text-violet-600" },
                    { label: "Read",      value: analyticsData.campaign.read_count,       color: "text-green-600" },
                    { label: "Failed",    value: analyticsData.campaign.failed_count,     color: "text-red-500" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Overall progress bar */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">{analyticsData.campaign.name}</h3>
                    <div className="flex items-center gap-2">
                      {analyticsData.campaign.status === "running" && (
                        <span className="text-xs text-blue-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />Live
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[analyticsData.campaign.status]?.color}`}>
                        {STATUS_CONFIG[analyticsData.campaign.status]?.icon}
                        {STATUS_CONFIG[analyticsData.campaign.status]?.label}
                      </span>
                    </div>
                  </div>
                  <StatBar
                    sent={analyticsData.campaign.sent_count}
                    delivered={analyticsData.campaign.delivered_count}
                    read={analyticsData.campaign.read_count}
                    failed={analyticsData.campaign.failed_count}
                    total={analyticsData.campaign.total_recipients}
                  />
                </div>

                {/* Recipients table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 text-sm">Recipients</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        value={recipientSearch}
                        onChange={(e) => setRecipientSearch(e.target.value)}
                        placeholder="Search…"
                        className="pl-8 h-8 text-xs border-slate-200 w-40"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Name</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Phone</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Status</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Sent</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Delivered</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Read</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecipients.map((r) => {
                          const rs = RECIPIENT_STATUS[r.status] || RECIPIENT_STATUS.pending;
                          return (
                            <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-800">{r.name || "—"}</td>
                              <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.phone}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1.5 text-xs">
                                  <span className={`w-2 h-2 rounded-full ${rs.dot}`} />{rs.label}
                                </span>
                                {r.error_message && (
                                  <p className="text-xs text-red-400 mt-0.5 truncate max-w-[160px]" title={r.error_message}>{r.error_message}</p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(r.sent_at)}</td>
                              <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(r.delivered_at)}</td>
                              <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(r.read_at)}</td>
                            </tr>
                          );
                        })}
                        {filteredRecipients.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">No recipients found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── QR Code Dialog ─────────────────────────────────────────────────── */}
      {showQr && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Scan with WhatsApp</h3>
              <button onClick={() => setShowQr(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {waStatus.isReady ? (
              <div className="text-center py-8 space-y-3">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <p className="font-medium text-slate-900">Connected!</p>
                {waStatus.clientInfo && <p className="text-sm text-slate-500">{waStatus.clientInfo.name} · +{waStatus.clientInfo.phone}</p>}
                <Button onClick={() => setShowQr(false)} className="w-full bg-violet-600 hover:bg-violet-700 text-white">Done</Button>
              </div>
            ) : qrData ? (
              <div className="text-center space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrData} alt="WhatsApp QR Code" className="w-56 h-56 mx-auto rounded-xl border border-slate-100" />
                <p className="text-sm text-slate-500">Open WhatsApp → Linked Devices → Link a Device</p>
                <button onClick={fetchWaStatus} className="text-xs text-violet-500 hover:underline flex items-center gap-1 mx-auto">
                  <RefreshCw className="w-3 h-3" />Refresh QR
                </button>
              </div>
            ) : (
              <div className="text-center py-10">
                <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Waiting for QR code…</p>
                <p className="text-xs text-slate-400 mt-1">Make sure the WhatsApp backend is running on port 3001</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
