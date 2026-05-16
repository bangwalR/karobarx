"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot, Plus, Trash2, Save, RefreshCw, Copy, Check,
  Settings, MessageSquare, Key, FlaskConical,
  Send, User, Sparkles, AlertCircle, Loader2, X,
  BookOpen, Wand2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Agent {
  id: string; name: string; description: string | null;
  purpose: "sales" | "support" | "general";
  system_message: string; model: string;
  temperature: number; max_tokens: number; top_p: number;
  thinking_mode: boolean; context_window: number;
  meta_access_token: string | null; meta_phone_number_id: string | null;
  meta_verify_token: string | null; meta_api_version: string;
  is_active: boolean; auto_reply: boolean; message_count: number;
  created_at: string; updated_at: string;
}
interface ChatMessage { role: "user" | "assistant"; content: string; streaming?: boolean; }

const PURPOSE_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  sales:   { color: "text-emerald-300", bg: "bg-emerald-500/20", border: "border-emerald-500/40", label: "Sales" },
  support: { color: "text-sky-300",     bg: "bg-sky-500/20",     border: "border-sky-500/40",     label: "Support" },
  general: { color: "text-violet-300",  bg: "bg-violet-500/20",  border: "border-violet-500/40",  label: "General" },
};

const SYSTEM_TEMPLATES: Record<string, { label: string; prompt: string }> = {
  sales: { label: "Sales Bot", prompt: "You are a professional sales assistant for this business on WhatsApp. Your goals:\n\u2022 Help customers discover the right products based on their needs and budget\n\u2022 Share product details, pricing, and availability clearly\n\u2022 Answer objections with confidence and provide value\n\u2022 Guide customers toward making a purchase decision\n\u2022 Always be friendly, concise, and avoid being pushy\n\nKeep replies under 250 words. Use bullet points when listing options." },
  support: { label: "Support Bot", prompt: "You are a helpful customer support agent for this business on WhatsApp. Your goals:\n\u2022 Resolve customer issues quickly and professionally\n\u2022 Provide clear step-by-step instructions when needed\n\u2022 Show empathy for frustrated customers\n\u2022 Escalate to human support when the issue is complex\n\u2022 Collect order/phone numbers when handling complaints\n\nKeep replies concise and actionable. Always end with a next step." },
  general: { label: "General Assistant", prompt: "You are a helpful WhatsApp assistant for this business. Answer customer questions, provide information about products and services, and guide them to the right team if needed. Keep replies concise, friendly, and professional." },
};

const TABS = ["General", "System Prompt", "LLM Config", "Meta API", "Test Chat"] as const;
type Tab = (typeof TABS)[number];

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span style={{ color: "#aebac1" }}>{label}</span>
        <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded" style={{ background: "#1a2a2f", color: "#e9edef" }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #25D366 0%, #25D366 ${pct}%, #2a3942 ${pct}%, #2a3942 100%)` }} />
      <div className="flex justify-between text-[10px]" style={{ color: "#567075" }}><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

function Toggle({ value, onChange, label, subtitle }: { value: boolean; onChange: (v: boolean) => void; label: string; subtitle?: string; }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b last:border-0" style={{ borderColor: "#2a3942" }}>
      <div>
        <div className="text-sm font-medium" style={{ color: "#e9edef" }}>{label}</div>
        {subtitle && <div className="text-xs mt-0.5" style={{ color: "#8696a0" }}>{subtitle}</div>}
      </div>
      <button onClick={() => onChange(!value)} className="relative w-11 h-6 rounded-full transition-colors duration-200" style={{ background: value ? "#25D366" : "#2a3942" }}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", mono = false, badge }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; mono?: boolean; badge?: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: "#8696a0" }}>{label}{badge}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-colors ${mono ? "font-mono" : ""}`}
        style={{ background: "#202c33", border: "1px solid #2a3942", color: "#e9edef" }}
        onFocus={(e) => (e.target.style.borderColor = "#25D366")}
        onBlur={(e) => (e.target.style.borderColor = "#2a3942")} />
    </div>
  );
}

export default function WhatsAppAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("General");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Agent>>({});
  const [metaTokenInput, setMetaTokenInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [aiPromptInput, setAiPromptInput] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPurpose, setNewPurpose] = useState<"sales" | "support" | "general">("general");
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const loadAgents = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/whatsapp-agents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAgents(data.agents ?? []);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadAgents(); }, [loadAgents]);

  const selectAgent = (agent: Agent) => {
    setSelectedAgent(agent); setForm({ ...agent }); setMetaTokenInput("");
    setActiveTab("General"); setChatMessages([]); setShowAiGenerator(false);
  };

  const saveAgent = async () => {
    if (!selectedAgent) return;
    setSaving(true); setSaveSuccess(false);
    try {
      const patch = { ...form };
      if (metaTokenInput.trim()) patch.meta_access_token = metaTokenInput.trim();
      const res = await fetch(`/api/whatsapp-agents/${selectedAgent.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = { ...selectedAgent, ...patch };
      setAgents((prev) => prev.map((a) => (a.id === selectedAgent.id ? updated : a)));
      setSelectedAgent(updated); setMetaTokenInput(""); setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const createAgent = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/whatsapp-agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim(), purpose: newPurpose, system_message: SYSTEM_TEMPLATES[newPurpose].prompt }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAgents((prev) => [...prev, data.agent]);
      setShowCreateModal(false); setNewName(""); setNewPurpose("general");
      selectAgent(data.agent);
    } catch (e) { setError((e as Error).message); }
    finally { setCreating(false); }
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    try {
      await fetch(`/api/whatsapp-agents/${agentId}`, { method: "DELETE" });
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      if (selectedAgent?.id === agentId) setSelectedAgent(null);
    } catch (e) { setError((e as Error).message); }
  };

  const generateSystemMessage = async () => {
    if (!aiPromptInput.trim() || aiGenerating || !selectedAgent) return;
    setAiGenerating(true);
    try {
      const res = await fetch(`/api/whatsapp-agents/${selectedAgent.id}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: `Generate a professional WhatsApp AI agent system prompt for this use case:\n\n${aiPromptInput}\n\nThe system prompt should:\n- Define the agent's role and personality clearly\n- List specific goals and behaviors\n- Set tone (friendly, professional, concise)\n- Include instructions for handling unknown questions\n- Be 150-300 words\n- Use bullet points for clarity\n\nReturn ONLY the system prompt text, nothing else.` }] }),
      });
      if (!res.ok || !res.body) throw new Error("Generation failed");
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let generated = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n").filter((l) => l.startsWith("data: "))) {
          const s = line.slice(6).trim(); if (s === "[DONE]") break;
          try { const d = JSON.parse(s).choices?.[0]?.delta?.content ?? ""; if (d) { generated += d; setForm((prev) => ({ ...prev, system_message: generated })); } } catch { /* skip */ }
        }
      }
      setShowAiGenerator(false); setAiPromptInput("");
    } catch (e) { setError((e as Error).message); }
    finally { setAiGenerating(false); }
  };

  const sendTestMessage = async () => {
    if (!selectedAgent || !chatInput.trim() || chatStreaming) return;
    const userMsg = chatInput.trim(); setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }, { role: "assistant", content: "", streaming: true }]);
    setChatStreaming(true);
    try {
      const res = await fetch(`/api/whatsapp-agents/${selectedAgent.id}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...chatMessages.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: userMsg }] }) });
      if (!res.ok || !res.body) throw new Error("Stream failed");
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let content = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n").filter((l) => l.startsWith("data: "))) {
          const s = line.slice(6).trim(); if (s === "[DONE]") break;
          try { const d = JSON.parse(s).choices?.[0]?.delta?.content ?? ""; if (d) { content += d; setChatMessages((prev) => { const n = [...prev]; n[n.length - 1] = { role: "assistant", content, streaming: true }; return n; }); } } catch { /* skip */ }
        }
      }
      setChatMessages((prev) => { const n = [...prev]; n[n.length - 1] = { role: "assistant", content: n[n.length - 1].content, streaming: false }; return n; });
    } catch (e) {
      setChatMessages((prev) => { const n = [...prev]; n[n.length - 1] = { role: "assistant", content: `Error: ${(e as Error).message}`, streaming: false }; return n; });
    } finally { setChatStreaming(false); }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const webhookUrl = selectedAgent ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/whatsapp-agents/webhook/${selectedAgent.id}` : "";
  const copyWebhook = () => { navigator.clipboard.writeText(webhookUrl); setCopiedWebhook(true); setTimeout(() => setCopiedWebhook(false), 2000); };
  const f = (key: keyof Agent, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#0b1418" }}>

      {/* LEFT PANEL */}
      <div className="w-[300px] shrink-0 flex flex-col border-r" style={{ background: "#111b21", borderColor: "#2a3942" }}>
        <div className="px-4 pt-5 pb-3 border-b" style={{ background: "#202c33", borderColor: "#2a3942" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white p-2" style={{ background: "#25D366" }}>{WA_ICON}</div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#e9edef" }}>WhatsApp AI Agents</div>
                <div className="text-[11px]" style={{ color: "#8696a0" }}>{agents.length} agent{agents.length !== 1 ? "s" : ""} configured</div>
              </div>
            </div>
            <button onClick={() => setShowCreateModal(true)} title="New Agent"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80" style={{ background: "#25D366" }}>
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "#2a3942" }}>
            <svg className="w-4 h-4 shrink-0" style={{ color: "#aebac1" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <span className="text-xs" style={{ color: "#8696a0" }}>Search agents</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ background: "#111b21" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#25D366" }} /></div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#202c33" }}><Bot className="w-7 h-7" style={{ color: "#8696a0" }} /></div>
              <div className="text-sm font-medium" style={{ color: "#e9edef" }}>No agents yet</div>
              <div className="text-xs" style={{ color: "#8696a0" }}>Create your first AI agent to automate WhatsApp replies</div>
              <button onClick={() => setShowCreateModal(true)} className="mt-1 text-xs px-4 py-2 rounded-full font-medium" style={{ background: "#25D366", color: "#fff" }}>+ New Agent</button>
            </div>
          ) : agents.map((agent, idx) => {
            const pm = PURPOSE_META[agent.purpose]; const isSelected = selectedAgent?.id === agent.id;
            return (
              <motion.button key={agent.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                onClick={() => selectAgent(agent)}
                className="w-full px-4 py-3.5 flex items-center gap-3 transition-colors relative group text-left"
                style={{ background: isSelected ? "#2a3942" : "transparent", borderBottom: "1px solid #2a3942" }}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-base font-bold"
                  style={{ background: agent.is_active ? "#25D366" : "#2a3942", color: agent.is_active ? "#fff" : "#8696a0" }}>
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium truncate" style={{ color: "#e9edef" }}>{agent.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${pm.bg} ${pm.color} border ${pm.border}`}>{pm.label}</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#8696a0" }}>
                    <span style={{ color: agent.is_active ? "#25D366" : "#8696a0" }}>{agent.is_active ? "● Active" : "○ Inactive"}</span>
                    <span>{" · "}{agent.message_count} msgs</span>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteAgent(agent.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full transition-all" style={{ color: "#8696a0" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.button>
            );
          })}
        </div>
        <div className="px-4 py-3 flex items-center gap-2 border-t" style={{ background: "#202c33", borderColor: "#2a3942" }}>
          <div className="w-4 h-4 rounded-full p-0.5 text-white" style={{ background: "#25D366" }}>{WA_ICON}</div>
          <span className="text-[10px]" style={{ color: "#8696a0" }}>Powered by NVIDIA Kimi K2.6</span>
        </div>
      </div>

      {/* RIGHT PANEL */}
      {selectedAgent ? (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ background: "#202c33", borderColor: "#2a3942" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                style={{ background: selectedAgent.is_active ? "#25D366" : "#2a3942", color: selectedAgent.is_active ? "#fff" : "#8696a0" }}>
                {selectedAgent.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: "#e9edef" }}>{selectedAgent.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PURPOSE_META[selectedAgent.purpose].bg} ${PURPOSE_META[selectedAgent.purpose].color} ${PURPOSE_META[selectedAgent.purpose].border}`}>{PURPOSE_META[selectedAgent.purpose].label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: selectedAgent.is_active ? "rgba(37,211,102,0.15)" : "rgba(42,57,66,0.6)", color: selectedAgent.is_active ? "#25D366" : "#8696a0", border: `1px solid ${selectedAgent.is_active ? "rgba(37,211,102,0.3)" : "#2a3942"}` }}>{selectedAgent.is_active ? "● Active" : "○ Inactive"}</span>
                </div>
                  <div className="text-xs mt-0.5" style={{ color: "#8696a0" }}>{selectedAgent.description || "No description"}{" · "}{selectedAgent.message_count.toLocaleString()} messages handled</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadAgents} className="p-2 rounded-full transition-colors hover:bg-[#2a3942]" style={{ color: "#aebac1" }}><RefreshCw className="w-4 h-4" /></button>
              <button onClick={saveAgent} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-60" style={{ background: saveSuccess ? "#128C7E" : "#25D366", color: "#fff" }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saveSuccess ? "Saved!" : saving ? "Saving\u2026" : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="flex border-b overflow-x-auto" style={{ background: "#111b21", borderColor: "#2a3942" }}>
            {TABS.map((tab) => {
              const icons: Record<Tab, React.ReactNode> = { General: <Settings className="w-3.5 h-3.5" />, "System Prompt": <BookOpen className="w-3.5 h-3.5" />, "LLM Config": <Sparkles className="w-3.5 h-3.5" />, "Meta API": <Key className="w-3.5 h-3.5" />, "Test Chat": <FlaskConical className="w-3.5 h-3.5" /> };
              const active = activeTab === tab;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)} className="flex items-center gap-1.5 px-5 py-3.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap"
                  style={{ borderBottomColor: active ? "#25D366" : "transparent", color: active ? "#25D366" : "#8696a0" }}>
                  {icons[tab]}{tab}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto" style={{ background: "#0b1418" }}>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }} className="h-full">

                {activeTab === "General" && (
                  <div className="p-6 max-w-2xl space-y-5">
                    <InputField label="Agent Name" value={(form.name as string) ?? ""} onChange={(v) => f("name", v)} placeholder="e.g. Sales Assistant" />
                    <InputField label="Description" value={(form.description as string) ?? ""} onChange={(v) => f("description", v)} placeholder="What does this agent do?" />
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: "#8696a0" }}>Purpose</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["sales", "support", "general"] as const).map((p) => (
                          <button key={p} onClick={() => f("purpose", p)} className="py-2.5 rounded-xl text-sm font-medium border transition-all capitalize"
                            style={{ background: form.purpose === p ? "rgba(37,211,102,0.12)" : "#202c33", borderColor: form.purpose === p ? "#25D366" : "#2a3942", color: form.purpose === p ? "#25D366" : "#8696a0" }}>
                            {PURPOSE_META[p].label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl px-4 border" style={{ background: "#202c33", borderColor: "#2a3942" }}>
                      <Toggle label="Active" subtitle="Agent will auto-reply to incoming WhatsApp messages" value={form.is_active ?? false} onChange={(v) => f("is_active", v)} />
                      <Toggle label="Auto Reply" subtitle="Automatically respond to all incoming messages" value={form.auto_reply ?? true} onChange={(v) => f("auto_reply", v)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "#8696a0" }}>Context Window (messages)</label>
                      <input type="number" min={0} max={50} value={form.context_window ?? 10} onChange={(e) => f("context_window", parseInt(e.target.value))}
                        className="w-28 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none"
                        style={{ background: "#202c33", border: "1px solid #2a3942", color: "#e9edef" }}
                        onFocus={(e) => (e.target.style.borderColor = "#25D366")} onBlur={(e) => (e.target.style.borderColor = "#2a3942")} />
                      <p className="text-xs mt-1.5" style={{ color: "#567075" }}>Last N messages included as history in each LLM call</p>
                    </div>
                  </div>
                )}

                {activeTab === "System Prompt" && (
                  <div className="p-6 flex flex-col gap-4" style={{ minHeight: "calc(100vh - 200px)" }}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="text-sm font-semibold" style={{ color: "#e9edef" }}>System Message</h2>
                        <p className="text-xs mt-0.5" style={{ color: "#8696a0" }}>Define the agent&apos;s personality, tone, goals, and constraints</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {Object.entries(SYSTEM_TEMPLATES).map(([key, tpl]) => (
                          <button key={key} onClick={() => f("system_message", tpl.prompt)}
                            className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                            style={{ background: "#202c33", borderColor: "#2a3942", color: "#aebac1" }}
                            onMouseEnter={(e) => { (e.currentTarget.style.borderColor = "#25D366"); (e.currentTarget.style.color = "#25D366"); }}
                            onMouseLeave={(e) => { (e.currentTarget.style.borderColor = "#2a3942"); (e.currentTarget.style.color = "#aebac1"); }}>
                            {tpl.label}
                          </button>
                        ))}
                        <button onClick={() => setShowAiGenerator((v) => !v)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all"
                          style={{ background: showAiGenerator ? "rgba(37,211,102,0.15)" : "#202c33", borderColor: showAiGenerator ? "#25D366" : "#2a3942", color: showAiGenerator ? "#25D366" : "#aebac1" }}>
                          <Wand2 className="w-3.5 h-3.5" />AI Generate
                        </button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {showAiGenerator && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="rounded-xl p-4 border" style={{ background: "#202c33", borderColor: "#25D366" }}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#25D366" }}><Wand2 className="w-3.5 h-3.5 text-white" /></div>
                              <span className="text-sm font-medium" style={{ color: "#e9edef" }}>AI System Prompt Generator</span>
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(37,211,102,0.15)", color: "#25D366" }}>Kimi K2.6</span>
                            </div>
                            <p className="text-xs mb-3" style={{ color: "#8696a0" }}>Describe your business and what this agent should do — AI will write a professional system prompt for you.</p>
                            <textarea value={aiPromptInput} onChange={(e) => setAiPromptInput(e.target.value)} rows={3}
                              placeholder="e.g. We sell second-hand smartphones in Delhi. This agent should help customers find phones within their budget, share availability, and guide them to buy..."
                              className="w-full rounded-lg px-3.5 py-2.5 text-sm resize-none focus:outline-none"
                              style={{ background: "#2a3942", border: "1px solid #3a4a52", color: "#e9edef" }}
                              onFocus={(e) => (e.target.style.borderColor = "#25D366")} onBlur={(e) => (e.target.style.borderColor = "#3a4a52")} />
                            <div className="flex items-center justify-between mt-3">
                              <p className="text-[11px]" style={{ color: "#567075" }}>Generated prompt will replace your current system message</p>
                              <button onClick={generateSystemMessage} disabled={aiGenerating || !aiPromptInput.trim()}
                                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50"
                                style={{ background: "#25D366", color: "#fff" }}>
                                {aiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                {aiGenerating ? "Generating…" : "Generate"}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <textarea value={form.system_message ?? ""} onChange={(e) => f("system_message", e.target.value)}
                      className="flex-1 w-full rounded-xl px-4 py-3.5 text-sm resize-none focus:outline-none leading-relaxed font-mono"
                      style={{ background: "#202c33", border: "1px solid #2a3942", color: "#e9edef", minHeight: "280px" }}
                      placeholder="You are a helpful assistant..."
                      onFocus={(e) => (e.target.style.borderColor = "#25D366")} onBlur={(e) => (e.target.style.borderColor = "#2a3942")} />
                    <div className="flex justify-between text-[11px]" style={{ color: "#567075" }}>
                      <span>{(form.system_message ?? "").length} chars</span>
                      <span>~{Math.ceil((form.system_message ?? "").split(/\s+/).filter(Boolean).length / 0.75)} tokens</span>
                    </div>
                  </div>
                )}

                {activeTab === "LLM Config" && (
                  <div className="p-6 max-w-xl space-y-5">
                    <div className="flex items-center gap-3 rounded-xl p-4 border" style={{ background: "#202c33", borderColor: "#2a3942" }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#76b900,#4a7400)" }}><Sparkles className="w-5 h-5 text-white" /></div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "#e9edef" }}>NVIDIA NIM API</div>
                        <div className="text-xs" style={{ color: "#8696a0" }}>{form.model ?? "moonshotai/kimi-k2.6"}</div>
                      </div>
                      <div className="ml-auto text-[10px] px-2.5 py-1 rounded-full" style={{ background: "rgba(37,211,102,0.15)", color: "#25D366", border: "1px solid rgba(37,211,102,0.3)" }}>● Connected</div>
                    </div>
                    <InputField label="Model" value={(form.model as string) ?? ""} onChange={(v) => f("model", v)} mono />
                    <div className="rounded-xl p-5 border space-y-5" style={{ background: "#202c33", borderColor: "#2a3942" }}>
                      <Slider label="Temperature" value={form.temperature ?? 1.0} min={0} max={2} step={0.01} onChange={(v) => f("temperature", v)} />
                      <Slider label="Top P" value={form.top_p ?? 1.0} min={0} max={1} step={0.01} onChange={(v) => f("top_p", v)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "#8696a0" }}>Max Tokens</label>
                      <input type="number" min={64} max={16384} value={form.max_tokens ?? 1024} onChange={(e) => f("max_tokens", parseInt(e.target.value))}
                        className="w-40 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none"
                        style={{ background: "#202c33", border: "1px solid #2a3942", color: "#e9edef" }}
                        onFocus={(e) => (e.target.style.borderColor = "#25D366")} onBlur={(e) => (e.target.style.borderColor = "#2a3942")} />
                      <p className="text-xs mt-1.5" style={{ color: "#567075" }}>Maximum tokens per reply (max 16384)</p>
                    </div>
                    <div className="rounded-xl px-4 border" style={{ background: "#202c33", borderColor: "#2a3942" }}>
                      <Toggle label="Thinking Mode" subtitle="Enables chain-of-thought reasoning (chat_template_kwargs: thinking)" value={form.thinking_mode ?? true} onChange={(v) => f("thinking_mode", v)} />
                    </div>
                  </div>
                )}

                {activeTab === "Meta API" && (
                  <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-5xl">

                    {/* ── LEFT: Credentials form ── */}
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-sm font-semibold" style={{ color: "#e9edef" }}>Credentials</h2>
                        <p className="text-xs mt-0.5" style={{ color: "#8696a0" }}>Connect this agent to your Meta WhatsApp Business account</p>
                      </div>

                      {/* Webhook URL */}
                      <div className="rounded-xl p-4 border" style={{ background: "#202c33", borderColor: "#2a3942" }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium" style={{ color: "#8696a0" }}>Webhook URL</div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(37,211,102,0.15)", color: "#25D366" }}>Copy this to Meta</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs rounded-lg px-3 py-2.5 font-mono break-all border" style={{ background: "#0b1418", borderColor: "#2a3942", color: "#25D366" }}>{webhookUrl}</code>
                          <button onClick={copyWebhook} className="shrink-0 p-2.5 rounded-lg border transition-all"
                            style={{ background: copiedWebhook ? "rgba(37,211,102,0.15)" : "#2a3942", borderColor: copiedWebhook ? "#25D366" : "#3a4a52", color: copiedWebhook ? "#25D366" : "#aebac1" }}>
                            {copiedWebhook ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: "#8696a0" }}>
                          Meta Access Token
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: selectedAgent.meta_access_token ? "rgba(37,211,102,0.15)" : "rgba(255,100,0,0.15)", color: selectedAgent.meta_access_token ? "#25D366" : "#ff8c42" }}>
                            {selectedAgent.meta_access_token ? "● Set" : "● Not set"}
                          </span>
                        </label>
                        <input type="password" value={metaTokenInput} onChange={(e) => setMetaTokenInput(e.target.value)} placeholder="Paste new token to update…"
                          className="w-full rounded-lg px-3.5 py-2.5 text-sm font-mono focus:outline-none"
                          style={{ background: "#202c33", border: "1px solid #2a3942", color: "#e9edef" }}
                          onFocus={(e) => (e.target.style.borderColor = "#25D366")} onBlur={(e) => (e.target.style.borderColor = "#2a3942")} />
                        <p className="text-[11px] mt-1.5" style={{ color: "#567075" }}>Permanent token from Meta System User or a temporary token from Graph API Explorer</p>
                      </div>

                      <InputField label="Phone Number ID" value={(form.meta_phone_number_id as string) ?? ""} onChange={(v) => f("meta_phone_number_id", v)} placeholder="e.g. 123456789012345" mono />
                      <InputField label="Verify Token" value={(form.meta_verify_token as string) ?? ""} onChange={(v) => f("meta_verify_token", v)} placeholder="e.g. my-secret-verify-token" mono />
                      <InputField label="API Version" value={(form.meta_api_version as string) ?? "v25.0"} onChange={(v) => f("meta_api_version", v)} mono />

                      <div className="rounded-xl p-3 border flex gap-2.5" style={{ background: "rgba(255,200,0,0.05)", borderColor: "rgba(255,200,0,0.2)" }}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#ffd600" }} />
                        <p className="text-[11px] leading-relaxed" style={{ color: "#c4a840" }}>
                          After filling in all fields, click <strong style={{ color: "#e9edef" }}>Save Changes</strong> then toggle <strong style={{ color: "#e9edef" }}>Active</strong> on in the General tab to start receiving messages.
                        </p>
                      </div>
                    </div>

                    {/* ── RIGHT: Setup guide ── */}
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-sm font-semibold" style={{ color: "#e9edef" }}>Meta Setup Guide</h2>
                        <p className="text-xs mt-0.5" style={{ color: "#8696a0" }}>Follow these steps to connect your WhatsApp Business number</p>
                      </div>

                      {[
                        {
                          step: "1",
                          title: "Create a Meta Developer App",
                          color: "#25D366",
                          items: [
                            "Go to developers.facebook.com → My Apps → Create App",
                            "Choose Business as the app type",
                            "Add the WhatsApp product to your app",
                          ],
                          link: { label: "Open Meta Developers →", url: "https://developers.facebook.com/apps" },
                        },
                        {
                          step: "2",
                          title: "Get your Phone Number ID & Token",
                          color: "#4fc3f7",
                          items: [
                            "WhatsApp → API Setup in your app dashboard",
                            "Copy the Phone Number ID shown on that page",
                            "Click Generate Token (or use a permanent System User token)",
                            "Paste both values in the fields on the left",
                          ],
                          link: null,
                        },
                        {
                          step: "3",
                          title: "Configure the Webhook",
                          color: "#ce93d8",
                          items: [
                            "Go to WhatsApp → Configuration → Webhook",
                            "Click Edit and paste the Webhook URL from above",
                            "Enter the same Verify Token you set on the left",
                            "Click Verify and Save",
                            "Subscribe to the messages field under Webhook Fields",
                          ],
                          link: null,
                        },
                        {
                          step: "4",
                          title: "Go Live (optional)",
                          color: "#ffb74d",
                          items: [
                            "In test mode you can only message pre-approved numbers",
                            "Submit your app for Business Verification to message anyone",
                            "Add a Privacy Policy URL and complete the App Review",
                          ],
                          link: { label: "Meta App Review docs →", url: "https://developers.facebook.com/docs/app-review" },
                        },
                      ].map(({ step, title, color, items, link }) => (
                        <div key={step} className="rounded-xl p-4 border" style={{ background: "#202c33", borderColor: "#2a3942" }}>
                          <div className="flex items-center gap-3 mb-2.5">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-white" style={{ background: color }}>
                              {step}
                            </div>
                            <span className="text-sm font-semibold" style={{ color: "#e9edef" }}>{title}</span>
                          </div>
                          <ul className="space-y-1.5 ml-9">
                            {items.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#aebac1" }}>
                                <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
                                {item}
                              </li>
                            ))}
                          </ul>
                          {link && (
                            <a href={link.url} target="_blank" rel="noopener noreferrer"
                              className="ml-9 mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium transition-opacity hover:opacity-80"
                              style={{ color }}>
                              {link.label}
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "Test Chat" && (
                  <div className="flex flex-col" style={{ height: "calc(100vh - 185px)" }}>
                    <div className="flex items-center gap-2 px-5 py-2.5 border-b text-xs" style={{ background: "#202c33", borderColor: "#2a3942" }}>
                      <FlaskConical className="w-3.5 h-3.5" style={{ color: "#25D366" }} />
                      <span style={{ color: "#8696a0" }}>Live test with <span style={{ color: "#25D366" }}>{form.model}</span> using your current system prompt</span>
                      {chatMessages.length > 0 && (
                        <button onClick={() => setChatMessages([])} className="ml-auto flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: "#2a3942", color: "#8696a0" }}>
                          <X className="w-3 h-3" />Clear
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2" style={{ background: "#0b1418" }}>
                      {chatMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-center">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#202c33" }}><MessageSquare className="w-7 h-7" style={{ color: "#25D366" }} /></div>
                          <div className="text-sm font-medium" style={{ color: "#e9edef" }}>Test your agent</div>
                          <div className="text-xs max-w-xs" style={{ color: "#8696a0" }}>Send a message to see how your agent responds using NVIDIA Kimi K2.6.</div>
                        </div>
                      ) : chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          {msg.role === "assistant" && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 p-1.5 text-white" style={{ background: "#25D366" }}>{WA_ICON}</div>
                          )}
                          <div className="max-w-[68%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm"
                            style={{ background: msg.role === "user" ? "#005c4b" : "#202c33", color: "#e9edef", borderTopRightRadius: msg.role === "user" ? "4px" : undefined, borderTopLeftRadius: msg.role === "assistant" ? "4px" : undefined }}>
                            {msg.content || (msg.streaming ? (
                              <span className="inline-flex gap-1 py-0.5">
                                {[0, 150, 300].map((d) => <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#8696a0", animationDelay: `${d}ms` }} />)}
                              </span>
                            ) : "\u2026")}
                            {msg.streaming && msg.content && <span className="inline-block w-0.5 h-3.5 animate-pulse ml-0.5 align-middle" style={{ background: "#25D366" }} />}
                            {!msg.content && !msg.streaming && <span>…</span>}
                          </div>
                          {msg.role === "user" && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ml-2 mt-1" style={{ background: "#2a3942" }}>
                              <User className="w-3.5 h-3.5" style={{ color: "#8696a0" }} />
                            </div>
                          )}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 border-t" style={{ background: "#202c33", borderColor: "#2a3942" }}>
                      <div className="flex-1 flex items-center rounded-full px-4 py-2" style={{ background: "#2a3942" }}>
                        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendTestMessage()}
                          placeholder="Type a message…" disabled={chatStreaming}
                          className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-60"
                          style={{ color: "#e9edef" }} />
                      </div>
                      <button onClick={sendTestMessage} disabled={chatStreaming || !chatInput.trim()}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                        style={{ background: "#25D366" }}>
                        {chatStreaming ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8" style={{ background: "#0b1418" }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center p-4 text-white" style={{ background: "#25D366" }}>{WA_ICON}</div>
          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#e9edef" }}>WhatsApp AI Agents</h2>
            <p className="text-sm max-w-sm" style={{ color: "#8696a0" }}>Create intelligent agents powered by NVIDIA Kimi K2.6 that automatically respond to your customers 24/7 via the Meta Cloud API.</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold" style={{ background: "#25D366", color: "#fff" }}>
            <Plus className="w-4 h-4" />Create First Agent
          </button>
          <div className="flex items-center gap-6 mt-2 text-xs" style={{ color: "#567075" }}>
          {[["Auto Reply", "24/7 responses"], ["Multi-Agent", "Sales, Support & more"], ["Smart Context", "Remembers conversations"]].map(([t, d]) => (
              <div key={t} className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" style={{ color: "#25D366" }} /><span><span style={{ color: "#aebac1" }}>{t}</span>{" — "}{d}</span></div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 rounded-xl px-4 py-3 flex items-center gap-3 shadow-2xl z-50 max-w-sm border"
            style={{ background: "#1a1a2e", borderColor: "#ff4444" }}>
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#ff4444" }} />
            <span className="text-sm" style={{ color: "#ffaaaa" }}>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto" style={{ color: "#ff4444" }}><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden" style={{ background: "#111b21", borderColor: "#2a3942" }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4" style={{ background: "#075E54" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full p-2 text-white" style={{ background: "rgba(255,255,255,0.15)" }}>{WA_ICON}</div>
                    <span className="text-sm font-semibold text-white">New WhatsApp AI Agent</span>
                  </div>
                  <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors"><X className="w-4 h-4 text-white" /></button>
                </div>
                <div className="p-5 space-y-5">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "#8696a0" }}>Agent Name *</label>
                    <input autoFocus type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createAgent()}
                      className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none"
                      style={{ background: "#202c33", border: "1px solid #2a3942", color: "#e9edef" }}
                      placeholder="e.g. Sales Assistant, Support Bot…"
                      onFocus={(e) => (e.target.style.borderColor = "#25D366")} onBlur={(e) => (e.target.style.borderColor = "#2a3942")} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: "#8696a0" }}>Purpose</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["sales", "support", "general"] as const).map((p) => {
                        const descs = { sales: "Lead conversion & product sales", support: "Customer service & help", general: "General purpose assistant" };
                        return (
                          <button key={p} onClick={() => setNewPurpose(p)} className="py-3 px-2.5 rounded-xl text-left border transition-all"
                            style={{ background: newPurpose === p ? "rgba(37,211,102,0.12)" : "#202c33", borderColor: newPurpose === p ? "#25D366" : "#2a3942" }}>
                            <div className="text-xs font-semibold mb-1" style={{ color: newPurpose === p ? "#25D366" : "#e9edef" }}>{PURPOSE_META[p].label}</div>
                            <div className="text-[10px] leading-tight" style={{ color: "#8696a0" }}>{descs[p]}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: "#567075" }}>A system prompt will be pre-filled. You can customize or AI-generate it after creation.</p>
                  <button onClick={createAgent} disabled={creating || !newName.trim()}
                    className="w-full py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: "#25D366", color: "#fff" }}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {creating ? "Creating…" : "Create Agent"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
