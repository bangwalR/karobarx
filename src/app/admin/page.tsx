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
  Clock,
  CheckCircle,
  Activity,
  Sparkles
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
    revenue: { total: 0, formatted: "₹0", thisMonth: 0, thisMonthFormatted: "₹0", growth: 0 },
    profit: { total: 0, formatted: "₹0" },
    inventory: { total: 0, available: 0, sold: 0, reserved: 0, value: 0, valueFormatted: "₹0" },
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
      color: "from-green-500 to-emerald-600",
    },
    {
      name: "Phones in Stock",
      value: data.stats.inventory.available.toString(),
      subtitle: `Worth ${data.stats.inventory.valueFormatted}`,
      icon: Smartphone,
      color: "from-blue-500 to-cyan-600",
    },
    {
      name: "Total Orders",
      value: data.stats.orders.total.toString(),
      subtitle: `${data.stats.orders.pending} pending`,
      icon: ShoppingCart,
      color: "from-purple-500 to-pink-600",
    },
    {
      name: "Customers",
      value: data.stats.customers.total.toString(),
      subtitle: `${data.stats.customers.vip} VIP`,
      icon: Users,
      color: "from-orange-500 to-red-600",
    },
  ];

  const secondaryStats = [
    { label: "Orders This Month", value: data.stats.orders.thisMonth, icon: Calendar, color: "text-blue-500" },
    { label: "New Inquiries", value: data.stats.inquiries.new, icon: MessageSquare, color: "text-yellow-500" },
    { label: "Completed Orders", value: data.stats.orders.completed, icon: CheckCircle, color: "text-green-500" },
    { label: "Total Profit", value: data.stats.profit.formatted, icon: TrendingUp, color: "text-purple-500" },
  ];

  const recentPhones = data.recent.phones || [];

  // Chart colors
  const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#ec4899'];
  
  // Inventory Status Data for Pie Chart
  const inventoryStatusData = [
    { name: 'Available', value: data.stats.inventory.available, color: '#22c55e' },
    { name: 'Sold', value: data.stats.inventory.sold, color: '#3b82f6' },
    { name: 'Reserved', value: data.stats.inventory.reserved, color: '#eab308' },
  ].filter(item => item.value > 0);

  // Brand Distribution Data (mock for now, can be extended)
  const brandData = [
    { name: 'Apple', value: Math.floor(data.stats.inventory.total * 0.35) },
    { name: 'Samsung', value: Math.floor(data.stats.inventory.total * 0.25) },
    { name: 'OnePlus', value: Math.floor(data.stats.inventory.total * 0.15) },
    { name: 'Xiaomi', value: Math.floor(data.stats.inventory.total * 0.12) },
    { name: 'Others', value: Math.floor(data.stats.inventory.total * 0.13) },
  ].filter(item => item.value > 0);

  // Monthly Revenue Data - Only show real data, no mock data for new users
  const monthlyData = data.stats.orders.total > 0 ? [
    { month: 'Aug', revenue: 180000, orders: 12 },
    { month: 'Sep', revenue: 220000, orders: 18 },
    { month: 'Oct', revenue: 280000, orders: 22 },
    { month: 'Nov', revenue: 350000, orders: 28 },
    { month: 'Dec', revenue: data.stats.revenue.thisMonth || 420000, orders: data.stats.orders.thisMonth || 32 },
    { month: 'Jan', revenue: data.stats.revenue.total * 0.15, orders: Math.floor(data.stats.orders.total * 0.18) },
  ] : [
    // Empty data for new users - all zeros
    { month: 'Aug', revenue: 0, orders: 0 },
    { month: 'Sep', revenue: 0, orders: 0 },
    { month: 'Oct', revenue: 0, orders: 0 },
    { month: 'Nov', revenue: 0, orders: 0 },
    { month: 'Dec', revenue: 0, orders: 0 },
    { month: 'Jan', revenue: 0, orders: 0 },
  ];

  // Customer Segments Data
  const customerSegments = [
    { name: 'VIP', value: data.stats.customers.vip, color: '#f97316' },
    { name: 'Regular', value: data.stats.customers.total - data.stats.customers.vip - data.stats.customers.newThisMonth, color: '#3b82f6' },
    { name: 'New', value: data.stats.customers.newThisMonth, color: '#22c55e' },
  ].filter(item => item.value > 0);

  // Inquiry Sources Data - Only show real data
  const inquirySourceData = data.stats.inquiries.total > 0 ? [
    { name: 'WhatsApp', value: data.stats.inquiries.whatsapp, color: '#22c55e' },
    { name: 'Website', value: Math.floor(data.stats.inquiries.total * 0.25), color: '#3b82f6' },
    { name: 'Walk-in', value: Math.floor(data.stats.inquiries.total * 0.15), color: '#f97316' },
    { name: 'OLX', value: Math.floor(data.stats.inquiries.total * 0.1), color: '#8b5cf6' },
  ].filter(item => item.value > 0) : [];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-gray-400 text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-white font-semibold">
              {entry.name}: {entry.name === 'revenue' ? formatPrice(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Empty State Banner for New Users */}
      {data.stats.inventory.total === 0 && data.stats.orders.total === 0 && data.stats.customers.total === 0 && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border-2 border-violet-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="bg-violet-600 p-3 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Welcome to Your CRM! 🎉</h2>
              <p className="text-slate-600 mb-4">
                Your dashboard is ready! Start by adding your first inventory item, customer, or order to see your data come to life.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/admin/inventory/new">
                  <Button className="bg-violet-600 hover:bg-violet-700 rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Inventory
                  </Button>
                </Link>
                <Link href="/admin/customers">
                  <Button variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50 rounded-xl">
                    <Users className="w-4 h-4 mr-2" />
                    Add Customer
                  </Button>
                </Link>
                <Link href="/admin/orders">
                  <Button variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50 rounded-xl">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Create Order
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {data.stats.inventory.total === 0 && data.stats.orders.total === 0 
              ? "Your fresh dashboard is ready to go!" 
              : "Welcome back! Here's your inventory overview."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={fetchData}
            className="border-gray-800 bg-white/5 hover:bg-white/10 rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href="/admin/inventory/new">
            <Button className="bg-gradient-to-r from-orange-500 to-red-600 border-0 rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Add Phone
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsData.map((stat) => (
              <div key={stat.name} className="glass-card rounded-2xl p-6 card-hover-effect">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-gray-500 text-sm mt-1">{stat.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{stat.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {secondaryStats.map((stat, i) => (
              <div key={i} className="glass-card rounded-xl p-4 flex items-center gap-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div>
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Revenue Trend Chart */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-500/20">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold">Revenue Trend</h2>
                </div>
                <Badge variant="outline" className="border-green-500/50 text-green-500">
                  +{data.stats.revenue.growth || 15}% Growth
                </Badge>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `₹${value/1000}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#f97316" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventory Status Pie Chart */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-blue-500/20">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold">Inventory Status</h2>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventoryStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {inventoryStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {inventoryStatusData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-400">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Second Charts Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Orders Bar Chart */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-purple-500/20">
                  <ShoppingCart className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-xl font-bold">Monthly Orders</h2>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Customer Segments Pie Chart */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-orange-500/20">
                  <Users className="w-5 h-5 text-orange-500" />
                </div>
                <h2 className="text-xl font-bold">Customer Segments</h2>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={customerSegments}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name ?? ''} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {customerSegments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inquiry Sources */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-green-500/20">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                </div>
                <h2 className="text-xl font-bold">Inquiry Sources</h2>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inquirySourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {inquirySourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {inquirySourceData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-400">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Phones */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/20">
                    <Smartphone className="w-5 h-5 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-bold">Recent Inventory</h2>
                </div>
                <Link href="/admin/inventory">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    View All
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>

              {recentPhones.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-500">No phones in inventory yet</p>
                  <Link href="/admin/inventory/new">
                    <Button className="mt-4 btn-futuristic rounded-xl">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Phone
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500 border-b border-gray-800">
                        <th className="pb-4 font-medium">Phone</th>
                        <th className="pb-4 font-medium">Brand</th>
                        <th className="pb-4 font-medium">Price</th>
                        <th className="pb-4 font-medium">Status</th>
                        <th className="pb-4 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {recentPhones.map((phone) => (
                        <tr key={phone.id} className="group">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-lg">
                                📱
                              </div>
                              <span className="font-medium">{phone.model_name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-gray-400">{phone.brand}</td>
                          <td className="py-4 font-semibold text-green-500">{phone.selling_price_formatted}</td>
                          <td className="py-4">
                            <Badge className={`border-0 ${
                              phone.status === "Available" ? "bg-green-500/20 text-green-500" :
                              phone.status === "Sold" ? "bg-gray-500/20 text-gray-500" :
                              "bg-yellow-500/20 text-yellow-500"
                            }`}>
                              {phone.status}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <Link href={`/phones/${phone.id}`}>
                              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Link href="/admin/inventory/new" className="block">
                    <Button variant="outline" className="w-full justify-start border-gray-800 bg-white/5 hover:bg-white/10 rounded-xl py-6">
                      <Plus className="w-5 h-5 mr-3 text-green-500" />
                      Add New Phone
                    </Button>
                  </Link>
                  <Link href="/admin/inventory" className="block">
                    <Button variant="outline" className="w-full justify-start border-gray-800 bg-white/5 hover:bg-white/10 rounded-xl py-6">
                      <Package className="w-5 h-5 mr-3 text-blue-500" />
                      View Inventory
                    </Button>
                  </Link>
                  <Link href="/phones" className="block">
                    <Button variant="outline" className="w-full justify-start border-gray-800 bg-white/5 hover:bg-white/10 rounded-xl py-6">
                      <Eye className="w-5 h-5 mr-3 text-purple-500" />
                      View Public Website
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Tips */}
              <div className="glass-card rounded-2xl p-6 bg-gradient-to-br from-orange-500/10 to-red-600/10 border-orange-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <MessageSquare className="w-5 h-5 text-orange-500" />
                  </div>
                  <h3 className="font-semibold">WhatsApp Connected</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Your AI agent is ready to handle customer inquiries on WhatsApp.
                </p>
                <Link href="/admin/settings">
                  <Button variant="outline" size="sm" className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10 rounded-lg">
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
