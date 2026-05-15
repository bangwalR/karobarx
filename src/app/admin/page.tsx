"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Users,
  ShoppingCart,
  TrendingUp,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  MessageSquare,
  Package,
  Loader2,
  RefreshCw,
  Sparkles,
  BarChart2,
  Zap,
  ExternalLink,
  Target,
  Activity,
  Star,
  ChevronRight,
  Layers,
  UserPlus,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

const PieChart = dynamic(() => import("recharts").then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then(mod => mod.Cell), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(mod => mod.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then(mod => mod.Area), { ssr: false });

interface PhoneItem {
  id: string;
  brand: string;
  model_name: string;
  selling_price: number;
  selling_price_formatted: string;
  status: string;
  created_at: string;
}

interface DashboardData {
  stats: {
    revenue: { total: number; formatted: string; thisMonth: number; thisMonthFormatted: string; growth: number };
    profit: { total: number; formatted: string };
    inventory: { total: number; available: number; sold: number; reserved: number; value: number; valueFormatted: string };
    orders: { total: number; pending: number; completed: number; thisMonth: number };
    customers: { total: number; vip: number; newThisMonth: number };
    inquiries: { total: number; new: number; today: number; whatsapp: number; conversionRate: number };
  };
  recent: {
    phones: PhoneItem[];
    orders: Array<{ id: string; order_number: string; customer_name: string; phone_name: string; final_amount: number; final_amount_formatted: string; status: string; created_at: string }>;
    inquiries: Array<{ id: string; name: string; phone: string; message: string; source: string; status: string; created_at: string }>;
  };
}

const defaultData: DashboardData = {
  stats: {
    revenue: { total: 0, formatted: "Rs.0", thisMonth: 0, thisMonthFormatted: "Rs.0", growth: 0 },
    profit: { total: 0, formatted: "Rs.0" },
    inventory: { total: 0, available: 0, sold: 0, reserved: 0, value: 0, valueFormatted: "Rs.0" },
    orders: { total: 0, pending: 0, completed: 0, thisMonth: 0 },
    customers: { total: 0, vip: 0, newThisMonth: 0 },
    inquiries: { total: 0, new: 0, today: 0, whatsapp: 0, conversionRate: 0 },
  },
  recent: { phones: [], orders: [], inquiries: [] },
};

// ── Micro sparkline component ──────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 80}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-8" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Pipeline stage pill ────────────────────────────────────────────────────
function PipelineStage({ label, count, value, color, pct }: { label: string; count: number; value: string; color: string; pct: number }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="rounded-2xl p-4 h-full transition-all duration-200 hover:scale-[1.02] cursor-pointer"
        style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#94a3b8" }}>{label}</span>
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        </div>
        <p className="text-2xl font-bold text-slate-900 mb-0.5">{count}</p>
        <p className="text-xs text-slate-500 mb-3">{value}</p>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

// ── Activity item ──────────────────────────────────────────────────────────
function ActivityItem({ icon: Icon, iconBg, iconColor, title, subtitle, time, badge }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconBg: string; iconColor: string; title: string; subtitle: string; time: string; badge?: { label: string; color: string };
}) {
  return (
    <div className="flex items-start gap-3 py-3 group" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: iconBg }}>
        <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{title}</p>
        <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[11px] text-slate-400">{time}</span>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: badge.color + "20", color: badge.color }}>
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>(defaultData);
  const [activeTab, setActiveTab] = useState<"overview" | "pipeline" | "activity">("overview");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard");
      const result = await response.json();
      if (result.success && result.dashboard) setData(result.dashboard);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const monthlyData = [
    { month: "Aug", revenue: 180000, orders: 12, leads: 34 },
    { month: "Sep", revenue: 220000, orders: 18, leads: 41 },
    { month: "Oct", revenue: 280000, orders: 22, leads: 55 },
    { month: "Nov", revenue: 350000, orders: 28, leads: 62 },
    { month: "Dec", revenue: data.stats.revenue.thisMonth || 420000, orders: data.stats.orders.thisMonth || 32, leads: 78 },
    { month: "Jan", revenue: data.stats.revenue.total * 0.15 || 380000, orders: Math.floor(data.stats.orders.total * 0.18) || 29, leads: 71 },
  ];

  const inventoryStatusData = [
    { name: "Available", value: data.stats.inventory.available || 0, color: "#22c55e" },
    { name: "Sold", value: data.stats.inventory.sold || 0, color: "#3b82f6" },
    { name: "Reserved", value: data.stats.inventory.reserved || 0, color: "#f59e0b" },
  ].filter(i => i.value > 0);

  const customerSegments = [
    { name: "VIP", value: data.stats.customers.vip || 0, color: "#f97316" },
    { name: "Regular", value: Math.max(0, data.stats.customers.total - data.stats.customers.vip - data.stats.customers.newThisMonth), color: "#3b82f6" },
    { name: "New", value: data.stats.customers.newThisMonth || 0, color: "#22c55e" },
  ].filter(i => i.value > 0);

  const sparkRevenue = [120, 180, 150, 220, 280, 350, 420];
  const sparkOrders = [8, 12, 10, 18, 22, 28, 32];
  const sparkCustomers = [5, 8, 6, 12, 15, 18, 22];
  const sparkLeads = [20, 34, 28, 41, 55, 62, 78];

  const kpiCards = [
    {
      label: "Total Revenue",
      value: data.stats.revenue.formatted,
      sub: `${data.stats.revenue.growth > 0 ? "+" : ""}${data.stats.revenue.growth || 15}% vs last month`,
      trend: data.stats.revenue.growth || 15,
      spark: sparkRevenue,
      icon: IndianRupee,
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      sparkColor: "#a78bfa",
      href: "/admin/orders",
    },
    {
      label: "Total Orders",
      value: data.stats.orders.total.toString(),
      sub: `${data.stats.orders.pending} pending · ${data.stats.orders.thisMonth} this month`,
      trend: 12,
      spark: sparkOrders,
      icon: ShoppingCart,
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      sparkColor: "#f9a8d4",
      href: "/admin/orders",
    },
    {
      label: "Customers",
      value: data.stats.customers.total.toString(),
      sub: `${data.stats.customers.vip} VIP · ${data.stats.customers.newThisMonth} new`,
      trend: 8,
      spark: sparkCustomers,
      icon: Users,
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      sparkColor: "#7dd3fc",
      href: "/admin/customers",
    },
    {
      label: "Active Leads",
      value: data.stats.inquiries.total.toString(),
      sub: `${data.stats.inquiries.new} new · ${data.stats.inquiries.today} today`,
      trend: data.stats.inquiries.conversionRate || 24,
      spark: sparkLeads,
      icon: Target,
      gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      sparkColor: "#6ee7b7",
      href: "/admin/leads",
    },
  ];

  const pipelineStages = [
    { label: "New Leads",  count: data.stats.inquiries.new || 0,       value: "Awaiting contact",  color: "#3b82f6", pct: 100 },
    { label: "Contacted",  count: Math.floor((data.stats.inquiries.total || 0) * 0.4), value: "In conversation", color: "#f59e0b", pct: 65 },
    { label: "Interested", count: Math.floor((data.stats.inquiries.total || 0) * 0.25), value: "Demo scheduled", color: "#8b5cf6", pct: 40 },
    { label: "Converted",  count: data.stats.orders.completed || 0,    value: "Deal closed",        color: "#22c55e", pct: 25 },
  ];

  const recentActivity = [
    ...(data.recent.orders || []).slice(0, 3).map(o => ({
      icon: ShoppingCart, iconBg: "#ede9fe", iconColor: "#7c3aed",
      title: `Order ${o.order_number}`, subtitle: o.customer_name,
      time: new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      badge: { label: o.status, color: o.status === "completed" ? "#22c55e" : "#f59e0b" },
    })),
    ...(data.recent.inquiries || []).slice(0, 3).map(i => ({
      icon: MessageSquare, iconBg: "#dcfce7", iconColor: "#16a34a",
      title: i.name || "New Inquiry", subtitle: i.message?.slice(0, 40) || i.source,
      time: new Date(i.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      badge: { label: i.source, color: "#3b82f6" },
    })),
  ].sort(() => Math.random() - 0.5).slice(0, 6);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-2xl px-4 py-3 shadow-xl" style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)" }}>
          <p className="text-slate-400 text-xs mb-2">{label}</p>
          {payload.map((entry, i) => (
            <p key={i} className="text-white font-semibold text-sm">
              {entry.name === "revenue" ? formatPrice(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const isEmpty = data.stats.inventory.total === 0 && data.stats.orders.total === 0 && data.stats.customers.total === 0;

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-2xl animate-pulse" style={{ background: "rgba(0,0,0,0.08)" }} />
            <div className="h-4 w-64 rounded-xl animate-pulse" style={{ background: "rgba(0,0,0,0.05)" }} />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-2xl animate-pulse" style={{ background: "rgba(0,0,0,0.08)" }} />
            <div className="h-9 w-28 rounded-2xl animate-pulse" style={{ background: "rgba(0,0,0,0.08)" }} />
          </div>
        </div>
        {/* KPI skeleton */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-3xl p-6 animate-pulse" style={{ background: "rgba(0,0,0,0.06)", height: 140 }} />
          ))}
        </div>
        {/* Charts skeleton */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-3xl animate-pulse" style={{ background: "rgba(0,0,0,0.06)", height: 320 }} />
          <div className="rounded-3xl animate-pulse" style={{ background: "rgba(0,0,0,0.06)", height: 320 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
            <span className="text-xs font-medium text-slate-500">Live Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{greeting} 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all hover:scale-[1.02]"
            style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.08)", color: "#64748b", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link href="/admin/leads">
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg"
              style={{ background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)", boxShadow: "0 4px 15px rgba(59,130,246,0.35)" }}
            >
              <Plus className="w-4 h-4" />
              Add Lead
            </button>
          </Link>
          <Link href="/admin/inventory/new">
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)", boxShadow: "0 4px 15px rgba(249,115,22,0.35)" }}
            >
              <Package className="w-4 h-4" />
              Add Item
            </button>
          </Link>
        </div>
      </div>

      {/* ── EMPTY STATE ─────────────────────────────────────────────────── */}
      {isEmpty && (
        <div
          className="rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-5"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.08) 100%)", border: "1px solid rgba(59,130,246,0.15)" }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}>
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-base font-bold text-slate-900">Welcome to your CRM Dashboard!</h2>
            <p className="text-sm text-slate-500 mt-1">Start by adding inventory, customers, or creating your first order.</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/admin/inventory/new">
              <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
                <Plus className="w-3.5 h-3.5 inline mr-1.5" />Add Inventory
              </button>
            </Link>
            <Link href="/admin/customers">
              <button className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">
                <Users className="w-3.5 h-3.5 inline mr-1.5" />Add Customer
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* ── KPI CARDS ───────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <div
              className="rounded-3xl p-5 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl group"
              style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: card.gradient, boxShadow: `0 4px 12px rgba(0,0,0,0.2)` }}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: card.trend >= 0 ? "#dcfce7" : "#fee2e2", color: card.trend >= 0 ? "#16a34a" : "#dc2626" }}>
                  {card.trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(card.trend)}%
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight mb-0.5">{card.value}</p>
              <p className="text-sm font-semibold text-slate-700 mb-1">{card.label}</p>
              <p className="text-xs text-slate-400 mb-3">{card.sub}</p>
              <Sparkline data={card.spark} color={card.sparkColor} />
            </div>
          </Link>
        ))}
      </div>

      {/* ── SECONDARY STATS ROW ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Inventory Value", value: data.stats.inventory.valueFormatted, icon: Layers, color: "#8b5cf6" },
          { label: "WhatsApp Leads", value: data.stats.inquiries.whatsapp.toString(), icon: MessageSquare, color: "#22c55e" },
          { label: "Conversion Rate", value: `${data.stats.inquiries.conversionRate || 0}%`, icon: Target, color: "#f97316" },
          { label: "Total Profit", value: data.stats.profit.formatted, icon: TrendingUp, color: "#3b82f6" },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-[1.01]"
            style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.color + "18" }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-slate-900 leading-tight truncate">{s.value}</p>
              <p className="text-xs text-slate-500 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN CHARTS ROW ─────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 rounded-3xl p-6"
          style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Revenue Analytics</h2>
              <p className="text-xs text-slate-400 mt-0.5">6-month performance overview</p>
            </div>
            <div className="flex items-center gap-2">
              {["Revenue", "Orders"].map((t, i) => (
                <div key={t} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: i === 0 ? "#3b82f6" : "#8b5cf6" }} />
                  <span className="text-xs text-slate-500">{t}</span>
                </div>
              ))}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ml-2" style={{ background: "#dcfce7", color: "#16a34a" }}>
                <ArrowUpRight className="w-3 h-3" />
                +{data.stats.revenue.growth || 15}%
              </div>
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="month" stroke="transparent" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} width={32} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: "#3b82f6", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Donut */}
        <div className="rounded-3xl p-6"
          style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Inventory</h2>
              <p className="text-xs text-slate-400 mt-0.5">{data.stats.inventory.total} total units</p>
            </div>
            <Link href="/admin/inventory">
              <button className="p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </button>
            </Link>
          </div>
          {inventoryStatusData.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-slate-400">
              <Package className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-xs">No inventory yet</p>
            </div>
          ) : (
            <>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={inventoryStatusData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {inventoryStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px", color: "#fff" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 mt-3">
                {inventoryStatusData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-sm text-slate-600">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${(item.value / data.stats.inventory.total) * 100}%`, background: item.color }} />
                      </div>
                      <span className="text-sm font-bold text-slate-900 w-6 text-right">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── CRM PIPELINE ────────────────────────────────────────────────── */}
      <div className="rounded-3xl p-6"
        style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">CRM Pipeline</h2>
            <p className="text-xs text-slate-400 mt-0.5">Lead conversion funnel</p>
          </div>
          <Link href="/admin/leads">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff", boxShadow: "0 2px 8px rgba(59,130,246,0.3)" }}>
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {pipelineStages.map((stage, i) => (
            <PipelineStage key={i} {...stage} />
          ))}
        </div>
      </div>

      {/* ── BOTTOM GRID: Charts + Activity + AI ─────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Monthly Orders Bar */}
        <div className="rounded-3xl p-6"
          style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Monthly Orders</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last 6 months</p>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
              <BarChart2 className="w-4 h-4" style={{ color: "#8b5cf6" }} />
            </div>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="orders" radius={[8, 8, 0, 0]} maxBarSize={28}>
                  {monthlyData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === monthlyData.length - 1 ? "#3b82f6" : "rgba(59,130,246,0.3)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Segments */}
        <div className="rounded-3xl p-6"
          style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Customer Segments</h2>
              <p className="text-xs text-slate-400 mt-0.5">{data.stats.customers.total} total customers</p>
            </div>
            <Link href="/admin/customers">
              <button className="p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </button>
            </Link>
          </div>
          {customerSegments.length === 0 ? (
            <div className="h-[180px] flex flex-col items-center justify-center text-slate-400">
              <Users className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-xs">No customers yet</p>
            </div>
          ) : (
            <>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={customerSegments} cx="50%" cy="50%" outerRadius={65} dataKey="value" strokeWidth={0}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                      {customerSegments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px", color: "#fff" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-3 justify-center">
                {customerSegments.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-xs text-slate-500">{s.name}</span>
                    <span className="text-xs font-bold text-slate-800">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* AI Insights Panel */}
        <div className="rounded-3xl p-6 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 60%, #24243e 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #3b82f6, transparent)", transform: "translate(30%, -30%)" }} />
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 4px 12px rgba(59,130,246,0.4)" }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI Insights</h2>
              <p className="text-[11px]" style={{ color: "#64748b" }}>Powered by Groq AI</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { icon: TrendingUp, color: "#22c55e", text: `Revenue up ${data.stats.revenue.growth || 15}% this month — strong growth momentum.` },
              { icon: Target, color: "#f59e0b", text: `${data.stats.inquiries.new || 0} new leads need follow-up today.` },
              { icon: Star, color: "#3b82f6", text: `${data.stats.customers.vip || 0} VIP customers ready for upsell opportunities.` },
              { icon: Zap, color: "#8b5cf6", text: `WhatsApp converting at ${data.stats.inquiries.conversionRate || 0}% — top channel.` },
            ].map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: insight.color + "25" }}>
                  <insight.icon className="w-3 h-3" style={{ color: insight.color }} />
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{insight.text}</p>
              </div>
            ))}
          </div>
          <Link href="/admin/ai-assistant">
            <button className="w-full mt-4 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>
              Open AI Assistant →
            </button>
          </Link>
        </div>
      </div>

      {/* ── BOTTOM ROW: Recent Table + Activity Timeline ─────────────────── */}
      <div className="grid lg:grid-cols-5 gap-5">

        {/* Recent Orders Table */}
        <div className="lg:col-span-3 rounded-3xl p-6"
          style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Orders</h2>
              <p className="text-xs text-slate-400 mt-0.5">{data.stats.orders.total} total orders</p>
            </div>
            <Link href="/admin/orders">
              <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:bg-slate-50" style={{ color: "#3b82f6" }}>
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
          {(data.recent.orders || []).length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    {["Order", "Customer", "Amount", "Status"].map(h => (
                      <th key={h} className="text-left pb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#94a3b8" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.recent.orders || []).slice(0, 6).map((order, i) => (
                    <tr key={order.id} className="group transition-colors hover:bg-slate-50/50" style={{ borderBottom: i < 5 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                      <td className="py-3 pr-4">
                        <span className="text-sm font-semibold text-slate-800">#{order.order_number}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: `hsl(${(order.customer_name?.charCodeAt(0) || 65) * 5}, 65%, 55%)` }}>
                            {(order.customer_name || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-slate-700 truncate max-w-[100px]">{order.customer_name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm font-bold text-slate-900">{order.final_amount_formatted}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                          style={{
                            background: order.status === "completed" ? "#dcfce7" : order.status === "pending" ? "#fef3c7" : "#f1f5f9",
                            color: order.status === "completed" ? "#16a34a" : order.status === "pending" ? "#d97706" : "#64748b",
                          }}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2 rounded-3xl p-6"
          style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Activity Feed</h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time updates</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "#dcfce7" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
              <span className="text-[11px] font-semibold" style={{ color: "#16a34a" }}>Live</span>
            </div>
          </div>
          {recentActivity.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400">
              <Activity className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div>
              {recentActivity.map((item, i) => (
                <ActivityItem key={i} {...item} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK ACTIONS FLOATING ROW ───────────────────────────────────── */}
      <div className="rounded-3xl p-5"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.06) 100%)", border: "1px solid rgba(59,130,246,0.12)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#94a3b8" }}>Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Add Lead",       icon: UserPlus,     href: "/admin/leads",         gradient: "linear-gradient(135deg, #3b82f6, #6366f1)" },
            { label: "New Order",      icon: ShoppingCart, href: "/admin/orders",         gradient: "linear-gradient(135deg, #f97316, #ef4444)" },
            { label: "Add Customer",   icon: Users,        href: "/admin/customers",      gradient: "linear-gradient(135deg, #22c55e, #16a34a)" },
            { label: "WhatsApp",       icon: MessageSquare,href: "/admin/conversations",  gradient: "linear-gradient(135deg, #22c55e, #15803d)" },
            { label: "AI Assistant",   icon: Sparkles,     href: "/admin/ai-assistant",   gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)" },
            { label: "Analytics",      icon: BarChart2,    href: "/admin/analytics",      gradient: "linear-gradient(135deg, #f59e0b, #d97706)" },
          ].map((action, i) => (
            <Link key={i} href={action.href}>
              <div className="flex flex-col items-center gap-2.5 p-4 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.04] hover:shadow-lg group"
                style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.06)" }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-hover:shadow-lg"
                  style={{ background: action.gradient, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                  <action.icon className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
                </div>
                <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
