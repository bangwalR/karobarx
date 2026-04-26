"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, RefreshCw, Instagram, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface DashboardStats {
  revenue: { thisMonthFormatted: string; formatted: string; growth: number };
  profit: { formatted: string };
  inventory: { available: number; sold: number; reserved: number; valueFormatted: string };
  orders: { thisMonth: number; pending: number; completed: number };
  customers: { total: number; vip: number; newThisMonth: number };
  inquiries: { new: number; today: number; whatsapp: number; conversionRate: number };
}

interface LeadSource {
  total: number;
  new: number;
  contacted: number;
  interested: number;
  converted: number;
  recent: Array<{ name: string; status: string; created_at: string }>;
}

interface LeadsSummary {
  period: string;
  total: number;
  instagram: LeadSource;
  facebook: LeadSource;
  whatsapp: LeadSource;
}

const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  interested: "bg-purple-100 text-purple-700",
  converted: "bg-green-100 text-green-700",
  not_interested: "bg-red-100 text-red-700",
};

function LeadSourceCard({
  icon,
  label,
  color,
  data,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  data: LeadSource;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl p-3 ${color}`}>
      <button className="w-full text-left" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-semibold">{label}</span>
          </div>
          <span className="text-lg font-bold">{data.total}</span>
        </div>
        <div className="flex gap-3 mt-1 text-xs opacity-70">
          <span>New: {data.new}</span>
          <span>Interested: {data.interested}</span>
          <span>Converted: {data.converted}</span>
        </div>
      </button>

      {open && data.recent.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-black/10 pt-2">
          {data.recent.map((l, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="truncate max-w-[120px] font-medium">{l.name}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLOR[l.status] || "bg-slate-100 text-slate-600"}`}>
                {l.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I have access to your live dashboard data plus Instagram, Facebook, and WhatsApp leads. Ask me anything about your business!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<LeadsSummary | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const [dashRes, leadsRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/ai/leads-summary"),
      ]);
      const dashData = await dashRes.json();
      const leadsData = await leadsRes.json();
      if (dashData.success) setDashStats(dashData.dashboard.stats);
      if (leadsData.success) setLeads(leadsData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          context: { stats: dashStats, leads },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        }]);
      } else {
        throw new Error((data.error || "Failed") + (data.details ? ` ${data.details}` : ""));
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const s = dashStats;

  const QUICK = [
    "How many Instagram leads do I have?",
    "Show me my Facebook leads",
    "How many WhatsApp leads this month?",
    "Which platform gives the most leads?",
    "How is my business doing this month?",
    "How many pending orders do I have?",
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50">
      {/* Sidebar */}
      <div className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Live Data</span>
          <button onClick={fetchData} className="text-slate-400 hover:text-violet-600 transition-colors">
            <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center flex-1 text-slate-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {/* Business stats */}
            {s && (
              <>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">Business</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-violet-50 rounded-xl p-2.5">
                    <p className="text-[10px] text-violet-500 font-medium">Revenue</p>
                    <p className="text-base font-bold text-violet-700">{s.revenue.thisMonthFormatted}</p>
                    <p className="text-[10px] text-slate-400">{s.revenue.growth > 0 ? "+" : ""}{s.revenue.growth}% vs last</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-2.5">
                    <p className="text-[10px] text-emerald-600 font-medium">Inventory</p>
                    <p className="text-base font-bold text-emerald-700">{s.inventory.available}</p>
                    <p className="text-[10px] text-slate-400">available</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2.5">
                    <p className="text-[10px] text-blue-500 font-medium">Orders</p>
                    <p className="text-base font-bold text-blue-700">{s.orders.thisMonth}</p>
                    <p className="text-[10px] text-slate-400">{s.orders.pending} pending</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-2.5">
                    <p className="text-[10px] text-amber-600 font-medium">Customers</p>
                    <p className="text-base font-bold text-amber-700">{s.customers.total}</p>
                    <p className="text-[10px] text-slate-400">{s.customers.vip} VIP</p>
                  </div>
                </div>
              </>
            )}

            {/* Leads by platform */}
            {leads && (
              <>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 pt-1">
                  Leads · all time
                </p>

                <LeadSourceCard
                  icon={<Instagram className="w-4 h-4 text-pink-600" />}
                  label="Instagram"
                  color="bg-pink-50 text-pink-900"
                  data={leads.instagram}
                />
                <LeadSourceCard
                  icon={<svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>}
                  label="Facebook"
                  color="bg-blue-50 text-blue-900"
                  data={leads.facebook}
                />
                <LeadSourceCard
                  icon={<MessageCircle className="w-4 h-4 text-green-600" />}
                  label="WhatsApp"
                  color="bg-green-50 text-green-900"
                  data={leads.whatsapp}
                />

                <div className="bg-slate-100 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-slate-500">Total leads</p>
                  <p className="text-xl font-bold text-slate-700">{leads.total}</p>
                </div>
              </>
            )}

            {/* Quick prompts */}
            <div className="pt-1 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1.5 font-medium px-1">Quick questions</p>
              <div className="space-y-0.5">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="w-full text-left text-xs text-slate-600 hover:text-violet-600 hover:bg-violet-50 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">AI Business Assistant</h1>
              <p className="text-xs text-slate-500">
                {leads ? `✅ ${leads.total} leads loaded · Instagram, Facebook, WhatsApp` : "Connecting to your data..."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user" ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-900"
              }`}>
                {msg.content}
                <p className={`text-xs mt-1 ${msg.role === "user" ? "text-violet-200" : "text-slate-400"}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                <span className="text-sm text-slate-500">Analyzing your data...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white border-t border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about Instagram leads, Facebook, WhatsApp, revenue..."
              disabled={loading}
              className="flex-1 bg-slate-50 border-slate-200 focus:border-violet-500"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
