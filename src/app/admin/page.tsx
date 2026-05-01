"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { 
  Smartphone, 
  Users, 
  ShoppingCart, 
  TrendingUp,
  IndianRupee,
  ArrowUpRight,
  Plus,
  MessageSquare,
  Package,
  Calendar,
  Loader2,
  RefreshCw,
  Eye,
  CheckCircle,
  Sparkles,
  BarChart2,
  Zap,
  ExternalLink,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

// Dynamic imports for recharts to avoid SSR issues
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
    revenue: {
      total: number;
      formatted: string;
      thisMonth: number;
      thisMonthFormatted: string;
      growth: number;
    };
    profit: {
      total: number;
      formatted: string;
    };
    inventory: {
      total: number;
      available: number;
      sold: number;
      reserved: number;
      value: number;
      valueFormatted: string;
    };
    orders: {
      total: number;
      pending: number;
      completed: number;
      thisMonth: number;
    };
    customers: {
      total: number;
      vip: number;
      newThisMonth: number;
    };
    inquiries: {
      total: number;
      new: number;
      today: number;
      whatsapp: number;
      conversionRate: number;
    };
  };
  recent: {
    phones: PhoneItem[];
    orders: Array<{
      id: string;
      order_number: string;
      customer_name: string;
      phone_name: string;
      final_amount: number;
      final_amount_formatted: string;
      status: string;
      created_at: string;
    }>;
    inquiries: Array<{
      id: string;
      name: string;
      phone: string;
      message: string;
      source: string;
      status: string;
      created_at: string;
    }>;
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

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>(defaultData);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard");
      const result = await response.json();
      if (result.success && result.dashboard) {
        setData(result.dashboard);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    {
      name: "Total Revenue",
      value: data.stats.revenue.formatted,
      subtitle: `${data.stats.inventory.sold} phones sold`,
      icon: IndianRupee,
      trend: data.stats.revenue.growth || 0,
      iconBg: "#dcfce7",
      iconColor: "#16a34a",
    },
    {
      name: "Phones in Stock",
      value: data.stats.inventory.available.toString(),
      subtitle: `Worth ${data.stats.inventory.valueFormatted}`,
      icon: Smartphone,
      trend: 0,
      iconBg: "#dbeafe",
      iconColor: "#2563eb",
    },
    {
      name: "Total Orders",
      value: data.stats.orders.total.toString(),
      subtitle: `${data.stats.orders.pending} pending`,
      icon: ShoppingCart,
      trend: 0,
      iconBg: "#ede9fe",
      iconColor: "#7c3aed",
    },
    {
      name: "Customers",
      value: data.stats.customers.total.toString(),
      subtitle: `${data.stats.customers.vip} VIP`,
      icon: Users,
      trend: 0,
      iconBg: "#fef3c7",
      iconColor: "#d97706",
    },
  ];

  const secondaryStats = [
    { label: "Orders This Month", value: data.stats.orders.thisMonth, icon: Calendar },
    { label: "New Inquiries", value: data.stats.inquiries.new, icon: MessageSquare },
    { label: "Completed Orders", value: data.stats.orders.completed, icon: CheckCircle },
    { label: "Total Profit", value: data.stats.profit.formatted, icon: TrendingUp },
  ];

  const recentPhones = data.recent.phones || [];

  const inventoryStatusData = [
    { name: "Available", value: data.stats.inventory.available, color: "#22c55e" },
    { name: "Sold", value: data.stats.inventory.sold, color: "#64748b" },
    { name: "Reserved", value: data.stats.inventory.reserved, color: "#eab308" },
  ].filter(item => item.value > 0);

  const brandData = [
    { name: "Apple", value: Math.floor(data.stats.inventory.total * 0.35) },
    { name: "Samsung", value: Math.floor(data.stats.inventory.total * 0.25) },
    { name: "OnePlus", value: Math.floor(data.stats.inventory.total * 0.15) },
    { name: "Xiaomi", value: Math.floor(data.stats.inventory.total * 0.12) },
    { name: "Others", value: Math.floor(data.stats.inventory.total * 0.13) },
  ].filter(item => item.value > 0);

  const monthlyData = data.stats.orders.total > 0 ? [
    { month: "Aug", revenue: 180000, orders: 12 },
    { month: "Sep", revenue: 220000, orders: 18 },
    { month: "Oct", revenue: 280000, orders: 22 },
    { month: "Nov", revenue: 350000, orders: 28 },
    { month: "Dec", revenue: data.stats.revenue.thisMonth || 420000, orders: data.stats.orders.thisMonth || 32 },
    { month: "Jan", revenue: data.stats.revenue.total * 0.15, orders: Math.floor(data.stats.orders.total * 0.18) },
  ] : [
    { month: "Aug", revenue: 0, orders: 0 },
    { month: "Sep", revenue: 0, orders: 0 },
    { month: "Oct", revenue: 0, orders: 0 },
    { month: "Nov", revenue: 0, orders: 0 },
    { month: "Dec", revenue: 0, orders: 0 },
    { month: "Jan", revenue: 0, orders: 0 },
  ];

  const customerSegments = [
    { name: "VIP", value: data.stats.customers.vip, color: "#f97316" },
    { name: "Regular", value: data.stats.customers.total - data.stats.customers.vip - data.stats.customers.newThisMonth, color: "#3b82f6" },
    { name: "New", value: data.stats.customers.newThisMonth, color: "#22c55e" },
  ].filter(item => item.value > 0);

  const inquirySourceData = data.stats.inquiries.total > 0 ? [
    { name: "WhatsApp", value: data.stats.inquiries.whatsapp, color: "#22c55e" },
    { name: "Website", value: Math.floor(data.stats.inquiries.total * 0.25), color: "#3b82f6" },
    { name: "Walk-in", value: Math.floor(data.stats.inquiries.total * 0.15), color: "#f97316" },
    { name: "OLX", value: Math.floor(data.stats.inquiries.total * 0.1), color: "#8b5cf6" },
  ].filter(item => item.value > 0) : [];

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const isEmpty = data.stats.inventory.total === 0 && data.stats.orders.total === 0 && data.stats.customers.total === 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
          <p className="text-slate-500 text-xs mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-slate-900 font-semibold text-sm">
              {entry.name === "revenue" ? formatPrice(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href="/admin/inventory/new">
            <Button
              size="sm"
              className="rounded-xl text-white shadow-sm"
              style={{ background: "var(--color-primary)" }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Phone
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        /* ── Skeleton Loading ── */
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-slate-100" />
                  <div className="w-16 h-5 rounded-full bg-slate-100" />
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-8 rounded-xl bg-slate-100" />
                  <div className="w-32 h-4 rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 animate-pulse">
                <div className="w-full h-4 rounded-xl bg-slate-100 mb-2" />
                <div className="w-16 h-6 rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-pulse">
              <div className="w-40 h-5 rounded-xl bg-slate-100 mb-6" />
              <div className="w-full h-64 rounded-xl bg-slate-100" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-pulse">
              <div className="w-32 h-5 rounded-xl bg-slate-100 mb-6" />
              <div className="w-full h-48 rounded-xl bg-slate-100" />
            </div>
          </div>
        </div>
      ) : (
        <>

          {/* ── Empty State ── */}
          {isEmpty && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--color-primary)", opacity: 0.9 }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Welcome to your dashboard!</h2>
              <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                Get started by adding your first phone to inventory, creating a customer, or recording an order.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/admin/inventory/new">
                  <Button
                    className="rounded-xl text-white shadow-sm"
                    style={{ background: "var(--color-primary)" }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Inventory
                  </Button>
                </Link>
                <Link href="/admin/customers">
                  <Button
                    variant="outline"
                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Add Customer
                  </Button>
                </Link>
                <Link href="/admin/orders">
                  <Button
                    variant="outline"
                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Create Order
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* ── KPI Cards Row 1 ── */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsData.map((stat) => (
              <div
                key={stat.name}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: stat.iconBg }}
                  >
                    <stat.icon className="w-5 h-5" style={{ color: stat.iconColor }} />
                  </div>
                  {stat.trend !== 0 && (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                      style={{
                        background: stat.trend > 0 ? "#dcfce7" : "#fee2e2",
                        color: stat.trend > 0 ? "#16a34a" : "#dc2626",
                      }}
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      {Math.abs(stat.trend)}%
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                <p className="text-sm font-medium text-slate-600 mt-0.5">{stat.name}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.subtitle}</p>
              </div>
            ))}
          </div>

          {/* ── Secondary Stats Row 2 ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {secondaryStats.map((stat, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-primary)", opacity: 0.9 }}
                >
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-slate-900 leading-tight truncate">{stat.value}</p>
                  <p className="text-xs text-slate-500 truncate">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Charts Row 1: Revenue + Inventory Donut ── */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Revenue Area Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Revenue Trend</h2>
                    <p className="text-xs text-slate-400">Last 6 months</p>
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  +{data.stats.revenue.growth || 15}% growth
                </span>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#cbd5e1"
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#cbd5e1"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v / 1000}k`}
                      width={36}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-primary)"
                      strokeWidth={2.5}
                      fill="url(#revenueGradient)"
                      dot={false}
                      activeDot={{ r: 5, fill: "var(--color-primary)", strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventory Donut */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Inventory Status</h2>
                  <p className="text-xs text-slate-400">{data.stats.inventory.total} total units</p>
                </div>
              </div>
              {inventoryStatusData.length === 0 ? (
                <div className="h-[180px] flex flex-col items-center justify-center text-slate-400">
                  <Package className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs">No inventory yet</p>
                </div>
              ) : (
                <>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={inventoryStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {inventoryStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {inventoryStatusData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-slate-600">{item.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Charts Row 2: Monthly Orders Bar + Customer Segments + Inquiry Sources ── */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Monthly Orders Bar Chart */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Monthly Orders</h2>
                  <p className="text-xs text-slate-400">Last 6 months</p>
                </div>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="orders"
                      fill="var(--color-primary)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Customer Segments */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Customer Segments</h2>
                  <p className="text-xs text-slate-400">{data.stats.customers.total} total</p>
                </div>
              </div>
              {customerSegments.length === 0 ? (
                <div className="h-[180px] flex flex-col items-center justify-center text-slate-400">
                  <Users className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs">No customers yet</p>
                </div>
              ) : (
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={customerSegments}
                        cx="50%"
                        cy="50%"
                        outerRadius={78}
                        dataKey="value"
                        strokeWidth={0}
                        label={({ name, percent }) =>
                          `${name ?? ""} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {customerSegments.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Inquiry Sources */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Inquiry Sources</h2>
                  <p className="text-xs text-slate-400">{data.stats.inquiries.total} total</p>
                </div>
              </div>
              {inquirySourceData.length === 0 ? (
                <div className="h-[180px] flex flex-col items-center justify-center text-slate-400">
                  <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs">No inquiries yet</p>
                </div>
              ) : (
                <>
                  <div className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={inquirySourceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={62}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {inquirySourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                    {inquirySourceData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-slate-500 truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Bottom Grid: Recent Inventory + Quick Actions ── */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Recent Inventory Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Recent Inventory</h2>
                    <p className="text-xs text-slate-400">Latest additions</p>
                  </div>
                </div>
                <Link href="/admin/inventory">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500 hover:text-slate-900 rounded-lg"
                  >
                    View all
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>

              {recentPhones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                    <Package className="w-7 h-7 opacity-40" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 mb-1">No phones yet</p>
                  <p className="text-xs text-slate-400 mb-4">Add your first phone to get started</p>
                  <Link href="/admin/inventory/new">
                    <Button
                      size="sm"
                      className="rounded-xl text-white text-xs"
                      style={{ background: "var(--color-primary)" }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add Your First Phone
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 text-left text-xs font-medium text-slate-400 pl-1">Phone</th>
                        <th className="pb-3 text-left text-xs font-medium text-slate-400">Brand</th>
                        <th className="pb-3 text-left text-xs font-medium text-slate-400">Price</th>
                        <th className="pb-3 text-left text-xs font-medium text-slate-400">Status</th>
                        <th className="pb-3 text-right text-xs font-medium text-slate-400 pr-1"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {recentPhones.map((phone) => (
                        <tr key={phone.id} className="group hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 pl-1">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
                                📱
                              </div>
                              <span className="text-sm font-medium text-slate-800 truncate max-w-[140px]">
                                {phone.model_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 text-sm text-slate-500">{phone.brand}</td>
                          <td className="py-3.5 text-sm font-semibold text-slate-900">
                            {phone.selling_price_formatted}
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                phone.status === "Available"
                                  ? "bg-green-50 text-green-700"
                                  : phone.status === "Sold"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-yellow-50 text-yellow-700"
                              }`}
                            >
                              {phone.status}
                            </span>
                          </td>
                          <td className="py-3.5 pr-1 text-right">
                            <Link href={`/phones/${phone.id}`}>
                              <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Actions + WhatsApp Card */}
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <Link href="/admin/inventory/new" className="block">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 hover:-translate-y-0.5 transition-all cursor-pointer group">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--color-primary)", opacity: 0.9 }}
                      >
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900">Add New Phone</p>
                        <p className="text-xs text-slate-400">List a phone in inventory</p>
                      </div>
                    </div>
                  </Link>

                  <Link href="/admin/inventory" className="block">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 hover:-translate-y-0.5 transition-all cursor-pointer group">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900">View Inventory</p>
                        <p className="text-xs text-slate-400">Manage all phones</p>
                      </div>
                    </div>
                  </Link>

                  <Link href="/admin/orders" className="block">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 hover:-translate-y-0.5 transition-all cursor-pointer group">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="w-4 h-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900">Orders</p>
                        <p className="text-xs text-slate-400">Track & manage orders</p>
                      </div>
                    </div>
                  </Link>

                  <Link href="/phones" className="block">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 hover:-translate-y-0.5 transition-all cursor-pointer group">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <ExternalLink className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900">Public Store</p>
                        <p className="text-xs text-slate-400">View your storefront</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* WhatsApp Status Card */}
              <div
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
                style={{ borderLeft: "3px solid var(--color-primary)" }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--color-primary)", opacity: 0.9 }}
                  >
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">AI Agent Active</p>
                    <p className="text-xs text-slate-400">WhatsApp connected</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Your AI agent is handling customer inquiries automatically on WhatsApp.
                </p>
                <Link href="/admin/settings">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1.5" />
                    Configure Settings
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
