"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Send,
  Settings,
  Bell,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Bot,
  Zap,
  AlertTriangle,
  ShoppingCart,
  Package,
  UserPlus,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface TelegramConfig {
  id: string;
  bot_token: string;
  chat_id: string;
  notify_new_lead: boolean;
  notify_new_order: boolean;
  notify_low_stock: boolean;
  notify_daily_summary: boolean;
  notify_new_inquiry: boolean;
  notify_payment_received: boolean;
  is_active: boolean;
}

interface TelegramMessage {
  id: string;
  message: string;
  message_type: string;
  sent_at: string;
  status: string;
  error_message: string | null;
}

const MESSAGE_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  manual: { label: "Manual", icon: Send, color: "text-blue-400" },
  auto_new_lead: { label: "New Lead", icon: UserPlus, color: "text-green-400" },
  auto_new_order: { label: "New Order", icon: ShoppingCart, color: "text-orange-400" },
  auto_low_stock: { label: "Low Stock", icon: AlertTriangle, color: "text-yellow-400" },
  auto_daily_summary: { label: "Daily Summary", icon: Zap, color: "text-purple-400" },
  auto_inquiry: { label: "Inquiry", icon: MessageSquare, color: "text-pink-400" },
  auto_payment: { label: "Payment", icon: CheckCircle, color: "text-emerald-400" },
};

export default function TelegramPage() {
  const [config, setConfig] = useState<TelegramConfig | null>(null);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [manualMessage, setManualMessage] = useState("");
  const [showTokenWarning, setShowTokenWarning] = useState(false);

  // Local form state
  const [form, setForm] = useState({
    bot_token: "",
    chat_id: "",
    notify_new_lead: true,
    notify_new_order: true,
    notify_low_stock: false,
    notify_daily_summary: false,
    notify_new_inquiry: true,
    notify_payment_received: true,
    is_active: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram");
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        setForm({
          bot_token: data.config.bot_token || "",
          chat_id: data.config.chat_id || "",
          notify_new_lead: data.config.notify_new_lead ?? true,
          notify_new_order: data.config.notify_new_order ?? true,
          notify_low_stock: data.config.notify_low_stock ?? false,
          notify_daily_summary: data.config.notify_daily_summary ?? false,
          notify_new_inquiry: data.config.notify_new_inquiry ?? true,
          notify_payment_received: data.config.notify_payment_received ?? true,
          is_active: data.config.is_active ?? false,
        });
      }
      setMessages(data.messages || []);
    } catch {
      toast.error("Failed to load Telegram config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveConfig = async () => {
    if (!form.bot_token || !form.chat_id) {
      toast.error("Bot token and Chat ID are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_config", ...form }),
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else {
        toast.success("Telegram bot configured!");
        fetchData();
      }
    } catch {
      toast.error("Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!form.bot_token || !form.chat_id) {
      toast.error("Enter bot token and chat ID first");
      return;
    }

    setTesting(true);
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", bot_token: form.bot_token, chat_id: form.chat_id }),
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else toast.success("✅ Test message sent to Telegram!");
    } catch {
      toast.error("Test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSendManual = async () => {
    if (!manualMessage.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", message: manualMessage }),
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else {
        toast.success("Message sent!");
        setShowSendModal(false);
        setManualMessage("");
        fetchData();
      }
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const notificationToggles = [
    { key: "notify_new_lead", label: "New Lead", description: "Alert when a new lead is added", icon: UserPlus },
    { key: "notify_new_order", label: "New Order", description: "Alert when a new order is placed", icon: ShoppingCart },
    { key: "notify_new_inquiry", label: "New Inquiry", description: "Alert on new product inquiry", icon: MessageSquare },
    { key: "notify_payment_received", label: "Payment Received", description: "Alert when payment is marked as paid", icon: CheckCircle },
    { key: "notify_low_stock", label: "Low Stock", description: "Alert when inventory is running low", icon: AlertTriangle },
    { key: "notify_daily_summary", label: "Daily Summary", description: "Daily stats summary every morning", icon: Zap },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-400" />
            Telegram Bot
          </h1>
          <p className="text-gray-400 mt-1">Get real-time CRM alerts on Telegram — completely free</p>
        </div>
        <div className="flex items-center gap-3">
          {config?.is_active ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Bot Active
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 border border-gray-700 text-sm">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              Bot Inactive
            </div>
          )}
          <Button
            variant="outline"
            onClick={fetchData}
            className="border-gray-700 hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          {config?.is_active && (
            <Button
              onClick={() => setShowSendModal(true)}
              className="bg-blue-600 hover:bg-blue-700 border-0"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Alert
            </Button>
          )}
        </div>
      </div>

      {/* Setup Guide Banner */}
      {!config?.bot_token && (
        <div className="glass-card rounded-2xl p-6 border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl shrink-0">
              <Bot className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Set up your Telegram Bot</h3>
              <p className="text-gray-400 text-sm mb-4">
                Get instant notifications on Telegram for every new lead, order, and inquiry.
                Completely free — no subscription needed.
              </p>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="bg-blue-500/20 text-blue-400 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                  <span>Open Telegram and search for <strong>@BotFather</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-blue-500/20 text-blue-400 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                  <span>Send <code className="bg-gray-800 px-1 rounded">/newbot</code> and follow the steps to create your bot</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-blue-500/20 text-blue-400 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                  <span>Copy the <strong>Bot Token</strong> and paste below</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-blue-500/20 text-blue-400 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">4</span>
                  <span>Get your Chat ID by messaging <strong>@userinfobot</strong> on Telegram</span>
                </div>
              </div>
              <a
                href="https://core.telegram.org/bots#how-do-i-create-a-bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mt-4"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Official Telegram Bot Guide
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bot Setup */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              Bot Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <Label>Bot Token</Label>
                <div className="relative mt-1">
                  <Input
                    type={showTokenWarning ? "text" : "password"}
                    value={form.bot_token}
                    onChange={(e) => setForm({ ...form, bot_token: e.target.value })}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="bg-gray-800 border-gray-700 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTokenWarning((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">From @BotFather on Telegram</p>
              </div>

              <div>
                <Label>Chat ID</Label>
                <Input
                  value={form.chat_id}
                  onChange={(e) => setForm({ ...form, chat_id: e.target.value })}
                  placeholder="e.g., -1001234567890 or 987654321"
                  className="mt-1 bg-gray-800 border-gray-700"
                />
                <p className="text-xs text-gray-500 mt-1">Your personal chat ID or a group chat ID (starts with -100)</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div>
                  <p className="font-medium text-sm">Enable Bot</p>
                  <p className="text-xs text-gray-500">Turn on notifications</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleTest}
                  disabled={testing || !form.bot_token || !form.chat_id}
                  variant="outline"
                  className="border-gray-700 hover:bg-gray-800"
                >
                  {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                  Test Connection
                </Button>
                <Button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 border-0"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>

          {/* Notification Toggles */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-400" />
              Notification Preferences
            </h2>

            <div className="space-y-3">
              {notificationToggles.map((toggle) => {
                const Icon = toggle.icon;
                const value = form[toggle.key as keyof typeof form] as boolean;
                return (
                  <div key={toggle.key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <Icon className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{toggle.label}</p>
                        <p className="text-xs text-gray-500">{toggle.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(v) => setForm({ ...form, [toggle.key]: v })}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <p className="text-xs text-orange-400 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Notification triggers work when API routes call <code className="bg-orange-500/20 px-1 rounded">/api/telegram</code> with action=&quot;send&quot;. Save config first.
              </p>
            </div>
          </div>
        </div>

        {/* Message Log */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              Message Log
            </h2>
            <span className="text-xs text-gray-500">{messages.length} messages</span>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400 text-sm">No messages sent yet</p>
              <p className="text-gray-500 text-xs mt-1">Configure your bot and send a test!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {messages.map((msg) => {
                const typeConfig = MESSAGE_TYPE_LABELS[msg.message_type] || MESSAGE_TYPE_LABELS.manual;
                const TypeIcon = typeConfig.icon;
                return (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl border ${
                      msg.status === "failed"
                        ? "bg-red-500/5 border-red-800"
                        : "bg-white/5 border-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs flex items-center gap-1 ${typeConfig.color}`}>
                        <TypeIcon className="w-3 h-3" />
                        {typeConfig.label}
                      </span>
                      <div className="flex items-center gap-1">
                        {msg.status === "sent" ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-400" />
                        )}
                        <span className="text-[10px] text-gray-500">
                          {new Date(msg.sent_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-2">{msg.message}</p>
                    {msg.error_message && (
                      <p className="text-xs text-red-400 mt-1">{msg.error_message}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Send Manual Alert Modal */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-400" />
              Send Manual Alert
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Message</Label>
              <Textarea
                value={manualMessage}
                onChange={(e) => setManualMessage(e.target.value)}
                placeholder="🔔 Important update: ..."
                className="mt-1 bg-gray-800 border-gray-700"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Supports HTML: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;code&gt;code&lt;/code&gt;
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowSendModal(false)} className="flex-1 border-gray-700">
                Cancel
              </Button>
              <Button
                onClick={handleSendManual}
                disabled={sending || !manualMessage.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 border-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
