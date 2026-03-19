"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  BarChart2,
  Loader2,
  Users,
  Globe,
  MousePointerClick,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Activity,
  Eye,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Dynamic recharts imports (SSR-safe)
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const PieChart = dynamic(() => import("recharts").then((m) => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), {
  ssr: false,
});

interface OverviewRow {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: string;
}

interface PageRow {
  path: string;
  title: string;
  views: number;
  users: number;
  avgDuration: number;
}

interface DeviceRow {
  device: string;
  sessions: number;
  users: number;
  [key: string]: unknown;
}

interface SourceRow {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  conversions: number;
}

interface OverviewTotals {
  sessions: number;
  users: number;
  pageviews: number;
  avgBounceRate: string;
}

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#8b5cf6",
  mobile: "#f59e0b",
  tablet: "#10b981",
};

const SOURCE_COLORS = ["#8b5cf6", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"];

function formatDate(dateStr: string) {
  // GA returns YYYYMMDD
  if (dateStr.length === 8) {
    return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function DeviceIcon({ device }: { device: string }) {
  if (device === "mobile") return <Smartphone className="w-4 h-4" />;
  if (device === "tablet") return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

export default function AnalyticsPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [setupSteps, setSetupSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [overview, setOverview] = useState<{ rows: OverviewRow[]; totals: OverviewTotals } | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [realtime, setRealtime] = useState<{ totalActive: number; byCountry: { country: string; users: number }[] } | null>(null);
  const [realtimeError, setRealtimeError] = useState(false);

  const fetchAll = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Check configuration first
      const configRes = await fetch("/api/analytics?report=overview");
      const configData = await configRes.json();

      if (!configData.configured) {
        setConfigured(false);
        setSetupSteps(configData.setup_steps || []);
        return;
      }

      if (configData.error) {
        setConfigured(true);
        return;
      }

      setConfigured(true);
      setOverview({ rows: configData.rows, totals: configData.totals });

      // Fetch remaining reports in parallel
      const [pagesRes, devicesRes, sourcesRes] = await Promise.all([
        fetch("/api/analytics?report=pages"),
        fetch("/api/analytics?report=devices"),
        fetch("/api/analytics?report=sources"),
      ]);

      const [pagesData, devicesData, sourcesData] = await Promise.all([
        pagesRes.json(),
        devicesRes.json(),
        sourcesRes.json(),
      ]);

      if (!pagesData.error) setPages(pagesData.rows || []);
      if (!devicesData.error) setDevices(devicesData.rows || []);
      if (!sourcesData.error) setSources(sourcesData.rows || []);

      // Realtime (separate, may fail)
      try {
        const rtRes = await fetch("/api/analytics?report=realtime");
        const rtData = await rtRes.json();
        if (!rtData.error) setRealtime(rtData);
        else setRealtimeError(true);
      } catch {
        setRealtimeError(true);
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Auto-refresh realtime every 30 seconds
    const interval = setInterval(async () => {
      if (configured) {
        try {
          const rtRes = await fetch("/api/analytics?report=realtime");
          const rtData = await rtRes.json();
          if (!rtData.error) setRealtime(rtData);
        } catch { /* ignore */ }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAll, configured]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // ── Setup screen (not configured) ──────────────────────────────────────────
  if (configured === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-orange-500" />
            Google Analytics
          </h1>
          <p className="text-gray-400 mt-1">Pull real website visitor data into your CRM</p>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Setup Required</h2>
              <p className="text-sm text-gray-400">Google Analytics is free — follow these steps to connect:</p>
            </div>
          </div>

          <ol className="space-y-3">
            {setupSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-gray-300">{step.replace(/^\d+\.\s/, "")}</span>
              </li>
            ))}
          </ol>

          <div className="grid md:grid-cols-2 gap-4 pt-2">
            <div className="bg-gray-800 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold text-violet-400">.env.local variables</h3>
              <pre className="text-xs text-gray-300 bg-gray-900 rounded-lg p-3 overflow-x-auto">
{`GA4_PROPERTY_ID=properties/XXXXXXXXX
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=eyJ0eXBlIjoic2Vydm...`}
              </pre>
              <p className="text-xs text-gray-500">
                Encode your JSON key: <code className="text-violet-400">base64 -i key.json | pbcopy</code>
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold text-green-400">Helpful links</h3>
              <ul className="space-y-2">
                {[
                  ["Google Cloud Console", "https://console.cloud.google.com"],
                  ["GA4 Admin", "https://analytics.google.com/analytics/web/#/a"],
                  ["Service Accounts", "https://console.cloud.google.com/iam-admin/serviceaccounts"],
                  ["Enable Analytics API", "https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com"],
                ].map(([label, url]) => (
                  <li key={label}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3 h-3" /> {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-gray-500 border-t border-gray-700 pt-4">
            After adding the env variables, restart your dev server (<code>npm run dev</code>) and refresh this page.
          </p>
        </div>
      </div>
    );
  }

  // ── Main dashboard ──────────────────────────────────────────────────────────
  const totals = overview?.totals;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-orange-500" />
            Google Analytics
          </h1>
          <p className="text-gray-400 mt-1">Last 30 days · GA4 Data API</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Realtime badge */}
          {realtime && !realtimeError && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              {realtime.totalActive} active now
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            <CheckCircle className="w-3.5 h-3.5" />
            Connected
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="border-gray-600 hover:border-violet-500 hover:bg-violet-500/10 gap-2"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Sessions", value: totals?.sessions?.toLocaleString() || "—", icon: Globe, color: "text-blue-400", bg: "bg-blue-500/20" },
          { label: "Users", value: totals?.users?.toLocaleString() || "—", icon: Users, color: "text-violet-400", bg: "bg-violet-500/20" },
          { label: "Page Views", value: totals?.pageviews?.toLocaleString() || "—", icon: Eye, color: "text-orange-400", bg: "bg-orange-500/20" },
          { label: "Bounce Rate", value: totals?.avgBounceRate ? `${totals.avgBounceRate}%` : "—", icon: TrendingDown, color: "text-pink-400", bg: "bg-pink-500/20" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-gray-900 border border-gray-700 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Sessions + Users Line Chart */}
      {overview && overview.rows.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            Sessions & Users — Last 30 Days
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={overview.rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                labelStyle={{ color: "#e5e7eb" }}
                labelFormatter={(v) => {
                  const s = String(v);
                  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s;
                }}
              />
              <Line type="monotone" dataKey="sessions" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Sessions" />
              <Line type="monotone" dataKey="users" stroke="#f59e0b" strokeWidth={2} dot={false} name="Users" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-end">
            <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-3 h-0.5 bg-violet-500 inline-block" /> Sessions</span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-3 h-0.5 bg-amber-500 inline-block" /> Users</span>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Device Breakdown — Pie */}
        {devices.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-400" />
              Device Breakdown
            </h2>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={devices}
                    dataKey="sessions"
                    nameKey="device"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {devices.map((entry) => (
                      <Cell
                        key={entry.device}
                        fill={DEVICE_COLORS[entry.device.toLowerCase()] || "#6b7280"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {devices.map((d) => {
                  const total = devices.reduce((s, x) => s + x.sessions, 0);
                  const pct = total > 0 ? Math.round((d.sessions / total) * 100) : 0;
                  return (
                    <div key={d.device} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: DEVICE_COLORS[d.device.toLowerCase()] || "#6b7280" }}
                        />
                        <DeviceIcon device={d.device.toLowerCase()} />
                        <span className="capitalize">{d.device}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{d.sessions.toLocaleString()}</span>
                        <Badge variant="secondary" className="text-xs bg-gray-700">{pct}%</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Traffic Sources — Bar */}
        {sources.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-green-400" />
              Traffic Sources
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={sources.slice(0, 6)}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="source"
                  type="category"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Bar dataKey="sessions" radius={[0, 4, 4, 0]} name="Sessions">
                  {sources.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Pages Table */}
      {pages.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-orange-400" />
            Top Pages
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Page</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">Views</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">Users</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">Avg. Time</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.path} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-white truncate max-w-xs" title={page.title}>
                        {page.title || page.path}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{page.path}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-white font-medium">{page.views.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-gray-300">{page.users.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-gray-300">{formatDuration(page.avgDuration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Realtime — Countries */}
      {realtime && realtime.byCountry.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400 animate-pulse" />
            Active Users Right Now
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-1">
              {realtime.totalActive} total
            </Badge>
          </h2>
          <div className="flex flex-wrap gap-2">
            {realtime.byCountry.map((c) => (
              <div key={c.country} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 rounded-full text-sm">
                <Globe className="w-3 h-3 text-gray-400" />
                <span className="text-gray-300">{c.country}</span>
                <Badge className="bg-violet-600/30 text-violet-300 text-xs">{c.users}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pb-2">
        <span>Data from GA4 · Refreshes every 30s for realtime</span>
        <a
          href="https://analytics.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-gray-300 transition-colors"
        >
          Open Google Analytics <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
