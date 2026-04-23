"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare, Search, Send, Phone, ArrowLeft, RefreshCw,
  CheckCheck, Check, Clock, Wifi, WifiOff, MoreVertical, Instagram, Facebook,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WaChat {
  id: string; name: string; phone: string; lastMessage: string;
  lastMessageTime: string | null; lastMessageFromMe: boolean;
  unreadCount: number; isGroup: boolean;
}
interface WaMessage {
  id: string; body: string; fromMe: boolean; type: string;
  hasMedia: boolean; timestamp: string; ack: number; author: string | null;
}
interface WaStatus {
  isReady: boolean; isAuthenticated: boolean; hasQr: boolean;
  clientInfo?: { name: string; phone: string };
}
interface IgConversation {
  id: string; name: string; igUserId: string; lastMessage: string;
  lastMessageTime: string | null; lastMessageFromMe: boolean; unreadCount: number;
  isLead?: boolean;
}
interface IgMessage {
  id: string; body: string; fromMe: boolean; fromName: string;
  type: string; hasMedia: boolean; mediaUrl: string | null;
  timestamp: string; ack: number;
}
interface FbConversation {
  id: string; name: string; fbUserId: string; lastMessage: string;
  lastMessageTime: string | null; lastMessageFromMe: boolean; unreadCount: number;
}
interface FbMessage {
  id: string; body: string; fromMe: boolean; fromName: string;
  type: string; hasMedia: boolean; mediaUrl: string | null;
  timestamp: string; ack: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso), now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000), hrs = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-IN", { weekday: "short" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function formatDateHeader(iso: string) {
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return "Today";
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function groupByDate<T extends { timestamp: string }>(msgs: T[]) {
  const groups: { date: string; messages: T[] }[] = [];
  msgs.forEach((m) => {
    const key = new Date(m.timestamp).toDateString();
    if (!groups.length || groups[groups.length - 1].date !== key) groups.push({ date: key, messages: [m] });
    else groups[groups.length - 1].messages.push(m);
  });
  return groups;
}
function AckIcon({ ack }: { ack: number }) {
  if (ack === 3) return <CheckCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  if (ack === 2) return <CheckCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  if (ack === 1) return <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  return <Clock className="w-3 h-3 text-slate-400 shrink-0" />;
}

// ─── Shared message bubble renderer ──────────────────────────────────────────
function MessageBubble({
  body, fromMe, type, hasMedia, timestamp, ack, senderName, senderInitial, accentColor,
}: {
  body: string; fromMe: boolean; type: string; hasMedia: boolean;
  timestamp: string; ack: number; senderName: string; senderInitial: string;
  accentColor: string;
}) {
  return (
    <div className={`flex mb-1 ${fromMe ? "justify-end" : "justify-start"}`}>
      {!fromMe && (
        <div className="w-7 shrink-0 mr-1 self-end">
          <div className={`w-7 h-7 rounded-full ${accentColor} flex items-center justify-center text-white text-xs font-bold`}>
            {senderInitial}
          </div>
        </div>
      )}
      <div className={`max-w-[65%] flex flex-col ${fromMe ? "items-end" : "items-start"}`}>
        <div className={`px-3 py-2 rounded-2xl shadow-sm ${
          fromMe ? "bg-violet-600 text-white rounded-br-sm" : "bg-white text-slate-800 rounded-bl-sm border border-slate-100"
        }`}>
          {type === "chat" ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{body}</p>
          ) : hasMedia ? (
            <p className="text-sm italic opacity-70">📎 {type} attachment</p>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {body || <span className="italic opacity-50">({type})</span>}
            </p>
          )}
          <div className={`flex items-center gap-1 mt-0.5 justify-end ${fromMe ? "text-violet-200" : "text-slate-400"}`}>
            <span className="text-[10px]">{formatMsgTime(timestamp)}</span>
            {fromMe && <AckIcon ack={ack} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ConversationsPage() {
  // ── Source tab ─────────────────────────────────────────────────────────────
  const [activeSource, setActiveSource] = useState<"whatsapp" | "instagram" | "facebook">("whatsapp");

  // ── WhatsApp state ─────────────────────────────────────────────────────────
  const [waStatus, setWaStatus] = useState<WaStatus>({ isReady: false, isAuthenticated: false, hasQr: false });
  const [chats, setChats] = useState<WaChat[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [selectedChat, setSelectedChat] = useState<WaChat | null>(null);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  // ── Instagram state ────────────────────────────────────────────────────────
  const [igConversations, setIgConversations] = useState<IgConversation[]>([]);
  const [igSelectedConv, setIgSelectedConv] = useState<IgConversation | null>(null);
  const [igMessages, setIgMessages] = useState<IgMessage[]>([]);
  const [igNewMessage, setIgNewMessage] = useState("");
  const [igSending, setIgSending] = useState(false);
  const [igConnected, setIgConnected] = useState(false);
  const [igConnectedAs, setIgConnectedAs] = useState("");
  const [loadingIgChats, setLoadingIgChats] = useState(false);
  const [loadingIgMessages, setLoadingIgMessages] = useState(false);
  const [igMsgHasMore, setIgMsgHasMore] = useState(false);
  const [igLoadingOlder, setIgLoadingOlder] = useState(false);
  const igMsgCursorRef = useRef<string | null>(null);
  const igLastUpdatedRef = useRef<string | null>(null);

  // ── Facebook state ────────────────────────────────────────────────────────
  const [fbConversations, setFbConversations] = useState<FbConversation[]>([]);
  const [fbSelectedConv, setFbSelectedConv] = useState<FbConversation | null>(null);
  const [fbMessages, setFbMessages] = useState<FbMessage[]>([]);
  const [fbNewMessage, setFbNewMessage] = useState("");
  const [fbSending, setFbSending] = useState(false);
  const [fbConnected, setFbConnected] = useState(false);
  const [fbConnectedAs, setFbConnectedAs] = useState("");
  const [loadingFbChats, setLoadingFbChats] = useState(false);
  const [loadingFbMessages, setLoadingFbMessages] = useState(false);
  const [fbMsgHasMore, setFbMsgHasMore] = useState(false);
  const [fbLoadingOlder, setFbLoadingOlder] = useState(false);
  const fbMsgCursorRef = useRef<string | null>(null);
  const fbLastUpdatedRef = useRef<string | null>(null);

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMsgCountRef = useRef(0);
  const prevChatIdRef = useRef<string | null>(null);

  // ── WA: status poll ────────────────────────────────────────────────────────
  const fetchWaStatus = useCallback(async () => {
    try {
      const res = await fetch(`${WA_BACKEND}/status`);
      setWaStatus(await res.json());
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchWaStatus();
    const iv = setInterval(fetchWaStatus, 5000);
    return () => clearInterval(iv);
  }, [fetchWaStatus]);

  // ── WA: chats ─────────────────────────────────────────────────────────────
  const fetchChats = useCallback(async () => {
    if (!waStatus.isReady) return;
    setLoadingChats(true);
    try {
      const res = await fetch("/api/conversations/live-chats");
      const data = await res.json();
      setChats(data.chats || []);
    } catch (_) {}
    setLoadingChats(false);
  }, [waStatus.isReady]);

  useEffect(() => {
    if (activeSource !== "whatsapp") return;
    fetchChats();
    const iv = setInterval(fetchChats, 8000);
    return () => clearInterval(iv);
  }, [fetchChats, activeSource]);

  // ── WA: messages ──────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (chatId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/live-messages/${encodeURIComponent(chatId)}?limit=60`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (_) {}
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (!selectedChat) return;
    fetchMessages(selectedChat.id);
    const iv = setInterval(() => fetchMessages(selectedChat.id), 5000);
    return () => clearInterval(iv);
  }, [selectedChat, fetchMessages]);

  // ── IG: conversations (incremental=true only fetches updated ones) ──────────
  const fetchIgConversations = useCallback(async (incremental = false) => {
    if (!incremental) setLoadingIgChats(true);
    try {
      const since = incremental && igLastUpdatedRef.current
        ? `?since=${encodeURIComponent(igLastUpdatedRef.current)}`
        : "";
      const res = await fetch(`/api/social/instagram/conversations${since}`);
      const data = await res.json();
      const newConvs: IgConversation[] = data.conversations || [];

      if (incremental && newConvs.length > 0) {
        // Merge: update changed conversations at the top, keep unchanged below
        setIgConversations((prev) => {
          const updatedIds = new Set(newConvs.map((c) => c.id));
          const unchanged = prev.filter((c) => !updatedIds.has(c.id));
          return [...newConvs, ...unchanged];
        });
      } else if (!incremental) {
        setIgConversations(newConvs);
      }

      if (data.lastUpdated) igLastUpdatedRef.current = data.lastUpdated;
      setIgConnected(!data.error);
      setIgConnectedAs(data.connectedAs || "");
    } catch (_) { setIgConnected(false); }
    setLoadingIgChats(false);
  }, []);

  useEffect(() => {
    if (activeSource !== "instagram") return;
    fetchIgConversations(false); // full load on first switch
    const iv = setInterval(() => fetchIgConversations(true), 30000); // incremental every 30s
    return () => clearInterval(iv);
  }, [activeSource, fetchIgConversations]);

  // ── IG: messages — fresh load or load-older via cursor ───────────────────
  const fetchIgMessages = useCallback(async (convId: string, loadOlder = false) => {
    if (loadOlder) {
      const cursor = igMsgCursorRef.current;
      if (!cursor) return;
      setIgLoadingOlder(true);
      try {
        const res = await fetch(
          `/api/social/instagram/messages/${encodeURIComponent(convId)}?cursor=${encodeURIComponent(cursor)}`
        );
        const data = await res.json();
        // Prepend older messages above existing ones
        setIgMessages((prev) => [...(data.messages || []), ...prev]);
        igMsgCursorRef.current = data.nextCursor || null;
        setIgMsgHasMore(!!data.nextCursor);
      } catch (_) {}
      setIgLoadingOlder(false);
    } else {
      // Fresh load — fetch latest 25 messages
      setLoadingIgMessages(true);
      igMsgCursorRef.current = null;
      try {
        const res = await fetch(`/api/social/instagram/messages/${encodeURIComponent(convId)}`);
        const data = await res.json();
        setIgMessages(data.messages || []);
        igMsgCursorRef.current = data.nextCursor || null;
        setIgMsgHasMore(!!data.nextCursor);
      } catch (_) {}
      setLoadingIgMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!igSelectedConv) return;
    fetchIgMessages(igSelectedConv.id, false); // fresh load on conversation open
    // No auto-poll for IG messages — use manual refresh or after-send refresh
  }, [igSelectedConv, fetchIgMessages]);

  // ── FB: conversations (incremental) ────────────────────────────────────
  const fetchFbConversations = useCallback(async (incremental = false) => {
    if (!incremental) setLoadingFbChats(true);
    try {
      const since = incremental && fbLastUpdatedRef.current
        ? `?since=${encodeURIComponent(fbLastUpdatedRef.current)}`
        : "";
      const res = await fetch(`/api/social/facebook/conversations${since}`);
      const data = await res.json();
      const newConvs: FbConversation[] = data.conversations || [];
      if (incremental && newConvs.length > 0) {
        setFbConversations((prev) => {
          const updatedIds = new Set(newConvs.map((c) => c.id));
          return [...newConvs, ...prev.filter((c) => !updatedIds.has(c.id))];
        });
      } else if (!incremental) {
        setFbConversations(newConvs);
      }
      if (data.lastUpdated) fbLastUpdatedRef.current = data.lastUpdated;
      setFbConnected(!data.error);
      setFbConnectedAs(data.connectedAs || "");
    } catch (_) { setFbConnected(false); }
    setLoadingFbChats(false);
  }, []);

  useEffect(() => {
    if (activeSource !== "facebook") return;
    fetchFbConversations(false);
    const iv = setInterval(() => fetchFbConversations(true), 30000);
    return () => clearInterval(iv);
  }, [activeSource, fetchFbConversations]);

  // ── FB: messages ───────────────────────────────────────────────────
  const fetchFbMessages = useCallback(async (convId: string, loadOlder = false) => {
    if (loadOlder) {
      const cursor = fbMsgCursorRef.current;
      if (!cursor) return;
      setFbLoadingOlder(true);
      try {
        const res = await fetch(
          `/api/social/facebook/messages/${encodeURIComponent(convId)}?cursor=${encodeURIComponent(cursor)}`
        );
        const data = await res.json();
        setFbMessages((prev) => [...(data.messages || []), ...prev]);
        fbMsgCursorRef.current = data.nextCursor || null;
        setFbMsgHasMore(!!data.nextCursor);
      } catch (_) {}
      setFbLoadingOlder(false);
    } else {
      setLoadingFbMessages(true);
      fbMsgCursorRef.current = null;
      try {
        const res = await fetch(`/api/social/facebook/messages/${encodeURIComponent(convId)}`);
        const data = await res.json();
        setFbMessages(data.messages || []);
        fbMsgCursorRef.current = data.nextCursor || null;
        setFbMsgHasMore(!!data.nextCursor);
      } catch (_) {}
      setLoadingFbMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!fbSelectedConv) return;
    fetchFbMessages(fbSelectedConv.id, false);
  }, [fbSelectedConv, fetchFbMessages]);

  // ── Auto-scroll: only on new messages or chat change ─────────────────────
  const activeMsgs = activeSource === "whatsapp" ? messages : activeSource === "instagram" ? igMessages : fbMessages;
  const activeChatId = activeSource === "whatsapp" ? (selectedChat?.id ?? null) : activeSource === "instagram" ? (igSelectedConv?.id ?? null) : (fbSelectedConv?.id ?? null);

  useEffect(() => {
    const chatChanged = activeChatId !== prevChatIdRef.current;
    const newArrived = activeMsgs.length > prevMsgCountRef.current;
    if (chatChanged || newArrived) {
      messagesEndRef.current?.scrollIntoView({ behavior: chatChanged ? "instant" : "smooth" });
    }
    prevMsgCountRef.current = activeMsgs.length;
    prevChatIdRef.current = activeChatId;
  }, [activeMsgs, activeChatId]);

  // ── WA: send ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return;
    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);
    const opt: WaMessage = {
      id: "opt-" + Date.now(), body: text, fromMe: true, type: "chat",
      hasMedia: false, timestamp: new Date().toISOString(), ack: 0, author: null,
    };
    setMessages((p) => [...p, opt]);
    try {
      await fetch("/api/conversations/live-send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: selectedChat.id, message: text }),
      });
      setTimeout(() => fetchMessages(selectedChat.id), 2000);
    } catch (_) {}
    setSending(false);
    inputRef.current?.focus();
  };

  // ── IG: send ──────────────────────────────────────────────────────────────
  const handleIgSend = async () => {
    if (!igNewMessage.trim() || !igSelectedConv || igSending) return;
    const text = igNewMessage.trim();
    setIgNewMessage("");
    setIgSending(true);
    const opt: IgMessage = {
      id: "opt-" + Date.now(), body: text, fromMe: true, fromName: "Me",
      type: "chat", hasMedia: false, mediaUrl: null,
      timestamp: new Date().toISOString(), ack: 0,
    };
    setIgMessages((p) => [...p, opt]);
    try {
      await fetch("/api/social/instagram/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: igSelectedConv.igUserId, message: text }),
      });
      setTimeout(() => fetchIgMessages(igSelectedConv.id, false), 3000);
    } catch (_) {}
    setIgSending(false);
  };

  // ── FB: send ─────────────────────────────────────────────────────────────────
  const handleFbSend = async () => {
    if (!fbNewMessage.trim() || !fbSelectedConv || fbSending) return;
    const text = fbNewMessage.trim();
    setFbNewMessage("");
    setFbSending(true);
    const opt: FbMessage = {
      id: "opt-" + Date.now(), body: text, fromMe: true, fromName: "Me",
      type: "chat", hasMedia: false, mediaUrl: null,
      timestamp: new Date().toISOString(), ack: 0,
    };
    setFbMessages((p) => [...p, opt]);
    try {
      await fetch("/api/social/facebook/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: fbSelectedConv.fbUserId, message: text }),
      });
      setTimeout(() => fetchFbMessages(fbSelectedConv.id, false), 3000);
    } catch (_) {}
    setFbSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (activeSource === "whatsapp") handleSend();
      else if (activeSource === "instagram") handleIgSend();
      else handleFbSend();
    }
  };

  const openChat = (chat: WaChat) => {
    setSelectedChat(chat);
    setMessages([]);
    prevMsgCountRef.current = 0;
    setChats((p) => p.map((c) => c.id === chat.id ? { ...c, unreadCount: 0 } : c));
  };
  const openIgConv = (conv: IgConversation) => {
    setIgSelectedConv(conv);
    setIgMessages([]);
    igMsgCursorRef.current = null;
    setIgMsgHasMore(false);
    prevMsgCountRef.current = 0;
  };
  const openFbConv = (conv: FbConversation) => {
    setFbSelectedConv(conv);
    setFbMessages([]);
    fbMsgCursorRef.current = null;
    setFbMsgHasMore(false);
    prevMsgCountRef.current = 0;
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredWaChats = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)
  );
  const filteredIgConvs = igConversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFbConvs = fbConversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasActiveChat = activeSource === "whatsapp" ? !!selectedChat : activeSource === "instagram" ? !!igSelectedConv : !!fbSelectedConv;
  const activeDisplayName = activeSource === "whatsapp"
    ? selectedChat?.name
    : activeSource === "instagram" ? igSelectedConv?.name : fbSelectedConv?.name;
  const activeSubtitle = activeSource === "whatsapp"
    ? (selectedChat?.phone ? `+${selectedChat.phone}` : selectedChat?.id?.replace("@c.us", ""))
    : activeSource === "instagram" ? igSelectedConv?.igUserId : fbSelectedConv?.fbUserId;

  const BG_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 min-h-0 bg-white overflow-hidden">

      {/* ── Left panel ───────────────────────────────────────────────────── */}
      <div className={`${hasActiveChat ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-[360px] shrink-0 border-r border-slate-200 bg-white`}>

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <h1 className="font-semibold text-slate-900 text-base">Conversations</h1>
            </div>
            <button
            onClick={() => activeSource === "whatsapp" ? fetchChats() : activeSource === "instagram" ? fetchIgConversations(false) : fetchFbConversations(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${(loadingChats || loadingIgChats) ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Source tabs: WhatsApp | Instagram | Facebook */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-3">
            <button
              onClick={() => { setActiveSource("whatsapp"); setSearchQuery(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSource === "whatsapp"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {waStatus.isReady ? (
                <Wifi className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
              WA
            </button>
            <button
              onClick={() => { setActiveSource("instagram"); setSearchQuery(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSource === "instagram"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Instagram className={`w-3.5 h-3.5 ${igConnected ? "text-pink-500" : ""}`} />
              IG
            </button>
            <button
              onClick={() => { setActiveSource("facebook"); setSearchQuery(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSource === "facebook"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Facebook className={`w-3.5 h-3.5 ${fbConnected ? "text-blue-500" : ""}`} />
              FB
            </button>
          </div>

          {/* Connection status line */}
          <div className="text-[10px] mb-2 text-slate-400 flex items-center gap-1">
            {activeSource === "whatsapp" ? (
              waStatus.isReady
                ? <><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />{waStatus.clientInfo?.name || "Connected"}</>
                : <><span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />{waStatus.isAuthenticated ? "Loading…" : "Not connected"}</>
            ) : activeSource === "instagram" ? (
              igConnected
                ? <><span className="w-1.5 h-1.5 rounded-full bg-pink-500 inline-block" />@{igConnectedAs}</>
                : <><span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />Not connected</>
            ) : (
              fbConnected
                ? <><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />{fbConnectedAs}</>
                : <><span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />Not connected</>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 h-9 text-sm rounded-xl"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">

          {/* ── WhatsApp list ── */}
          {activeSource === "whatsapp" && (
            <>
              {!waStatus.isReady && (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 px-6 text-center">
                  <WifiOff className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium text-slate-500">WhatsApp not connected</p>
                  <p className="text-xs mt-1">Go to WhatsApp Marketing to connect.</p>
                </div>
              )}
              {waStatus.isReady && loadingChats && !chats.length && (
                <div className="flex items-center justify-center h-32 text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…
                </div>
              )}
              {waStatus.isReady && !loadingChats && filteredWaChats.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">No conversations found</p>
                </div>
              )}
              {filteredWaChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => openChat(chat)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-left ${
                    selectedChat?.id === chat.id ? "bg-violet-50 border-violet-100" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-base ${chat.isGroup ? "bg-teal-500" : "bg-violet-500"}`}>
                      {chat.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-green-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm truncate ${chat.unreadCount > 0 ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>
                        {chat.name}
                      </span>
                      <span className={`text-[11px] shrink-0 ml-2 ${chat.unreadCount > 0 ? "text-green-600 font-medium" : "text-slate-400"}`}>
                        {timeAgo(chat.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                      {chat.lastMessageFromMe && <CheckCheck className="w-3 h-3 shrink-0 text-slate-300" />}
                      {chat.lastMessage || <span className="italic">No messages</span>}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* ── Instagram list ── */}
          {activeSource === "instagram" && (
            <>
              {loadingIgChats && !igConversations.length && (
                <div className="flex items-center justify-center h-32 text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…
                </div>
              )}
              {!loadingIgChats && filteredIgConvs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 px-6 text-center">
                  <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium text-slate-500">No conversations found</p>
                  {!igConnected && (
                    <p className="text-xs mt-1">
                      Connect Instagram from{" "}
                      <a href="/admin/settings?tab=integrations" className="text-pink-400 underline">
                        Settings → Integrations
                      </a>{" "}
                      to see DMs.
                    </p>
                  )}
                </div>
              )}
              {filteredIgConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openIgConv(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-left ${
                    igSelectedConv?.id === conv.id ? "bg-pink-50 border-pink-100" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-semibold text-base">
                      {conv.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    {(conv as { isLead?: boolean }).isLead && (
                      <span className="absolute -bottom-0.5 -right-0.5 px-1.5 py-0.5 bg-green-500 rounded-full text-[9px] text-white font-bold">
                        LEAD
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm truncate font-medium text-slate-800">{conv.name}</span>
                      <span className="text-[11px] shrink-0 ml-2 text-slate-400">{timeAgo(conv.lastMessageTime)}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {conv.lastMessage || <span className="italic">No messages</span>}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* ── Facebook list ── */}
          {activeSource === "facebook" && (
            <>
              {!fbConnected && !loadingFbChats && (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 px-6 text-center">
                  <Facebook className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium text-slate-500">Facebook not connected</p>
                  <p className="text-xs mt-1">
                    Go to{" "}
                    <a href="/admin/settings?tab=integrations" className="text-blue-400 underline">
                      Settings → Integrations
                    </a>{" "}
                    to connect.
                  </p>
                </div>
              )}
              {fbConnected && loadingFbChats && !fbConversations.length && (
                <div className="flex items-center justify-center h-32 text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading Messenger…
                </div>
              )}
              {fbConnected && !loadingFbChats && filteredFbConvs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">No Messenger conversations found</p>
                </div>
              )}
              {filteredFbConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openFbConv(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-left ${
                    fbSelectedConv?.id === conv.id ? "bg-blue-50 border-blue-100" : ""
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-base shrink-0">
                    {conv.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm truncate font-medium text-slate-800">{conv.name}</span>
                      <span className="text-[11px] shrink-0 ml-2 text-slate-400">{timeAgo(conv.lastMessageTime)}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {conv.lastMessage || <span className="italic">No messages</span>}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Right: Chat window ────────────────────────────────────────────── */}
      {hasActiveChat ? (
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50">

          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
            <button
              onClick={() => activeSource === "whatsapp" ? setSelectedChat(null) : setIgSelectedConv(null)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${
              activeSource === "instagram"
                ? "bg-gradient-to-br from-pink-500 to-purple-600"
                : activeSource === "facebook"
                ? "bg-gradient-to-br from-blue-500 to-blue-700"
                : (selectedChat?.isGroup ? "bg-teal-500" : "bg-violet-500")
            }`}>
              {activeDisplayName?.[0]?.toUpperCase() || "?"}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">{activeDisplayName}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                {activeSource === "instagram"
                  ? <><Instagram className="w-3 h-3" />{activeSubtitle}</>
                  : activeSource === "facebook"
                  ? <><Facebook className="w-3 h-3" />{activeSubtitle}</>
                  : <><Phone className="w-3 h-3" />{activeSubtitle}</>
                }
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => activeSource === "whatsapp" && selectedChat
                  ? fetchMessages(selectedChat.id)
                  : activeSource === "instagram" && igSelectedConv
                  ? fetchIgMessages(igSelectedConv.id, false)
                  : fbSelectedConv && fetchFbMessages(fbSelectedConv.id, false)
                }
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              {activeSource === "whatsapp" && selectedChat && (
                <a
                  href={`https://web.whatsapp.com/send?phone=${selectedChat.phone}`}
                  target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Open in WhatsApp Web"
                >
                  <MoreVertical className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ backgroundImage: BG_PATTERN }}>
            {(loadingMessages && activeSource === "whatsapp" && !messages.length) && (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />
              </div>
            )}
            {(loadingIgMessages && activeSource === "instagram" && !igMessages.length) && (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-5 h-5 text-pink-400 animate-spin" />
              </div>
            )}
            {(loadingFbMessages && activeSource === "facebook" && !fbMessages.length) && (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
            )}
            {(!loadingMessages && activeSource === "whatsapp" && messages.length === 0) && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No messages yet</p>
              </div>
            )}
            {(!loadingIgMessages && activeSource === "instagram" && igMessages.length === 0) && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No messages yet</p>
              </div>
            )}
            {(!loadingFbMessages && activeSource === "facebook" && fbMessages.length === 0) && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No messages yet</p>
              </div>
            )}

            {/* Load older messages button — Instagram */}
            {activeSource === "instagram" && igMessages.length > 0 && (igMsgHasMore || igLoadingOlder) && (
              <div className="flex justify-center py-3">
                <button
                  onClick={() => igSelectedConv && fetchIgMessages(igSelectedConv.id, true)}
                  disabled={igLoadingOlder}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-colors"
                >
                  {igLoadingOlder
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Loading older…</>
                    : <><RefreshCw className="w-3.5 h-3.5" />Load older messages</>
                  }
                </button>
              </div>
            )}

            {/* Load older messages button — Facebook */}
            {activeSource === "facebook" && fbMessages.length > 0 && (fbMsgHasMore || fbLoadingOlder) && (
              <div className="flex justify-center py-3">
                <button
                  onClick={() => fbSelectedConv && fetchFbMessages(fbSelectedConv.id, true)}
                  disabled={fbLoadingOlder}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-colors"
                >
                  {fbLoadingOlder
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Loading older…</>
                    : <><RefreshCw className="w-3.5 h-3.5" />Load older messages</>
                  }
                </button>
              </div>
            )}

            {activeSource === "whatsapp" && groupByDate(messages).map((group) => (
              <div key={group.date}>
                <div className="flex justify-center my-4">
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-500 shadow-sm">
                    {formatDateHeader(group.messages[0].timestamp)}
                  </span>
                </div>
                {group.messages.map((msg, i) => {
                  const prev = group.messages[i - 1];
                  const showAvatar = !msg.fromMe && (!prev || prev.fromMe);
                  return (
                    <div key={msg.id}>
                      {!msg.fromMe && !showAvatar && <div className="w-7 inline-block" />}
                      <MessageBubble
                        body={msg.body} fromMe={msg.fromMe} type={msg.type}
                        hasMedia={msg.hasMedia} timestamp={msg.timestamp} ack={msg.ack}
                        senderName={selectedChat?.name || ""} senderInitial={selectedChat?.name?.[0]?.toUpperCase() || "?"}
                        accentColor="bg-violet-400"
                      />
                    </div>
                  );
                })}
              </div>
            ))}

            {activeSource === "instagram" && groupByDate(igMessages).map((group) => (
              <div key={group.date}>
                <div className="flex justify-center my-4">
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-500 shadow-sm">
                    {formatDateHeader(group.messages[0].timestamp)}
                  </span>
                </div>
                {group.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    body={msg.body} fromMe={msg.fromMe} type={msg.type}
                    hasMedia={msg.hasMedia} timestamp={msg.timestamp} ack={msg.ack}
                    senderName={msg.fromName} senderInitial={msg.fromName?.[0]?.toUpperCase() || "?"}
                    accentColor="bg-gradient-to-br from-pink-500 to-purple-600"
                  />
                ))}
              </div>
            ))}

            {activeSource === "facebook" && groupByDate(fbMessages).map((group) => (
              <div key={group.date}>
                <div className="flex justify-center my-4">
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-500 shadow-sm">
                    {formatDateHeader(group.messages[0].timestamp)}
                  </span>
                </div>
                {group.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    body={msg.body} fromMe={msg.fromMe} type={msg.type}
                    hasMedia={msg.hasMedia} timestamp={msg.timestamp} ack={msg.ack}
                    senderName={msg.fromName} senderInitial={msg.fromName?.[0]?.toUpperCase() || "?"}
                    accentColor="bg-gradient-to-br from-blue-500 to-blue-700"
                  />
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
            {activeSource === "whatsapp" && !waStatus.isReady && (
              <p className="text-xs text-center text-amber-500 mb-2">⚠️ WhatsApp not connected — cannot send.</p>
            )}
            {activeSource === "instagram" && !igConnected && (
              <p className="text-xs text-center text-pink-400 mb-2">⚠️ Instagram not connected — cannot send.</p>
            )}
            {activeSource === "facebook" && !fbConnected && (
              <p className="text-xs text-center text-blue-400 mb-2">⚠️ Facebook not connected — cannot send.</p>
            )}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={activeSource === "whatsapp" ? newMessage : activeSource === "instagram" ? igNewMessage : fbNewMessage}
                  onChange={(e) => activeSource === "whatsapp" ? setNewMessage(e.target.value) : activeSource === "instagram" ? setIgNewMessage(e.target.value) : setFbNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message…"
                  disabled={activeSource === "whatsapp" ? !waStatus.isReady : activeSource === "instagram" ? !igConnected : !fbConnected}
                  className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none disabled:opacity-50"
                />
              </div>
              <button
                onClick={activeSource === "whatsapp" ? handleSend : activeSource === "instagram" ? handleIgSend : handleFbSend}
                disabled={
                  activeSource === "whatsapp"
                    ? (!newMessage.trim() || !waStatus.isReady || sending)
                    : activeSource === "instagram"
                    ? (!igNewMessage.trim() || !igConnected || igSending)
                    : (!fbNewMessage.trim() || !fbConnected || fbSending)
                }
                className={`w-10 h-10 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0 ${
                  activeSource === "instagram"
                    ? "bg-gradient-to-br from-pink-500 to-purple-600 hover:opacity-90"
                    : activeSource === "facebook"
                    ? "bg-gradient-to-br from-blue-500 to-blue-700 hover:opacity-90"
                    : "bg-violet-600 hover:bg-violet-700"
                }`}
              >
                {(sending || igSending || fbSending) ? (
                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              Press Enter to send ·{" "}
              {activeSource === "whatsapp" ? "Syncs every 5s" : "Refresh to load new messages"}
            </p>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              {activeSource === "instagram"
                ? <Instagram className="w-10 h-10 text-slate-300" />
                : activeSource === "facebook"
                ? <Facebook className="w-10 h-10 text-slate-300" />
                : <MessageSquare className="w-10 h-10 text-slate-300" />
              }
            </div>
            <p className="font-semibold text-slate-700">
              {activeSource === "instagram" ? "Instagram DMs" : activeSource === "facebook" ? "Facebook Messenger" : "WhatsApp Inbox"}
            </p>
            <p className="text-sm text-slate-400 mt-1 max-w-xs">
              {activeSource === "instagram"
                ? igConversations.length > 0
                  ? "Select a conversation to start chatting"
                  : igConnected
                  ? "No conversations yet"
                  : "Showing leads from database. Connect Instagram from Settings → Integrations to see DMs."
                : activeSource === "facebook"
                ? fbConnected
                  ? "Select a conversation to start chatting"
                  : "Connect Facebook from Settings → Integrations"
                : waStatus.isReady
                  ? "Select a conversation to start chatting"
                  : "Connect WhatsApp from the Marketing page"
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
