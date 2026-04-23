"use client";

import { useState, useEffect } from "react";
import {
  Users, Plus, Send, RefreshCw, Trash2, Eye, MessageSquare,
  WifiOff, CheckCircle2, AlertCircle, Image as ImageIcon,
  Search, X, ChevronRight, Settings, UserPlus, UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Community {
  id: string;
  community_id: string;
  name: string;
  description?: string;
  icon_url?: string;
  member_count: number;
  group_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  timestamp?: number;
  isGroup: boolean;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface WaStatus {
  isReady: boolean;
  isAuthenticated: boolean;
  hasQr: boolean;
  clientInfo?: { name: string; phone: string };
}

const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CommunitiesPage() {
  const [tab, setTab] = useState<"list" | "create" | "announce">("list");
  const [viewMode, setViewMode] = useState<"communities" | "groups">("groups");
  const [waStatus, setWaStatus] = useState<WaStatus>({
    isReady: false,
    isAuthenticated: false,
    hasQr: false,
  });

  // Communities
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Create Group
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [customerSearch, setCustomerSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);

  // Announcement
  const [selectedItem, setSelectedItem] = useState<Community | Group | null>(null);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  // ── Fetch WhatsApp Status ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${WA_BACKEND}/status`);
        const data = await res.json();
        setWaStatus(data);
      } catch (_) {}
    };
    fetchStatus();
    const iv = setInterval(fetchStatus, 5000);
    return () => clearInterval(iv);
  }, []);

  // ── Fetch Communities ──────────────────────────────────────────────────────
  const fetchCommunities = async () => {
    try {
      const res = await fetch("/api/communities");
      const data = await res.json();
      setCommunities(data.communities || []);
    } catch (_) {}
    setLoadingCommunities(false);
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  // ── Fetch Groups ───────────────────────────────────────────────────────────
  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (_) {}
    setLoadingGroups(false);
  };

  useEffect(() => {
    if (viewMode === "groups") {
      fetchGroups();
    }
  }, [viewMode]);

  // ── Fetch Customers ────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "create") return;
    setLoadingCustomers(true);
    fetch("/api/customers?limit=500")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers || []))
      .catch(() => {})
      .finally(() => setLoadingCustomers(false));
  }, [tab]);

  // ── Sync Communities ───────────────────────────────────────────────────────
  const handleSync = async () => {
    if (!waStatus.isReady) {
      alert("Connect WhatsApp first in Marketing page.");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/communities/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await fetchCommunities();
        alert(`Synced ${data.synced} communities successfully!`);
      } else {
        alert(data.error || "Failed to sync communities");
      }
    } catch (err: any) {
      alert(err.message || "Failed to sync");
    } finally {
      setSyncing(false);
    }
  };

  // ── Create Group ───────────────────────────────────────────────────────────
  const handleCreateGroup = async () => {
    setCreateError("");
    setCreateSuccess(false);

    if (!groupName.trim()) {
      setCreateError("Group name is required");
      return;
    }

    if (selectedMembers.size === 0) {
      setCreateError("Select at least one member");
      return;
    }

    if (!waStatus.isReady) {
      setCreateError("WhatsApp not connected");
      return;
    }

    setCreating(true);

    try {
      const participants = Array.from(selectedMembers)
        .map((id) => customers.find((c) => c.id === id)?.phone)
        .filter(Boolean) as string[];

      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          participants,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || "Failed to create group");
        return;
      }

      setCreateSuccess(true);
      setGroupName("");
      setGroupDescription("");
      setSelectedMembers(new Set());
      
      // Refresh groups list
      await fetchGroups();
      
      setTimeout(() => {
        setCreateSuccess(false);
        setTab("list");
        setViewMode("groups");
      }, 2000);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  // ── Send Announcement ──────────────────────────────────────────────────────
  const handleSendAnnouncement = async () => {
    if (!selectedItem) {
      setSendError("Please select a group or community");
      return;
    }
    if (!announcementMessage.trim() && !mediaUrl.trim()) {
      setSendError("Please enter a message or media URL");
      return;
    }
    if (!waStatus.isReady) {
      setSendError("WhatsApp not connected");
      return;
    }

    setSending(true);
    setSendError("");
    setSendSuccess(false);

    try {
      // Check if it's a community or group
      const isCommunity = "community_id" in selectedItem;
      const targetId = isCommunity
        ? (selectedItem as Community).id
        : (selectedItem as Group).id;

      const endpoint = isCommunity
        ? `/api/communities/${targetId}/announce`
        : `${WA_BACKEND}/groups/${encodeURIComponent(targetId)}/announce`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: announcementMessage,
          media_url: mediaUrl || undefined,
          mediaUrl: mediaUrl || undefined,
          media_type: mediaUrl ? "image" : "none",
          target_type: "all",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSendError(data.error || "Failed to send announcement");
        return;
      }

      setSendSuccess(true);
      setAnnouncementMessage("");
      setMediaUrl("");
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err: any) {
      setSendError(err.message || "Failed to send announcement");
    } finally {
      setSending(false);
    }
  };

  // ── Delete Community ───────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this community? This will not delete it from WhatsApp.")) return;
    try {
      await fetch(`/api/communities/${id}`, { method: "DELETE" });
      fetchCommunities();
    } catch (_) {}
  };

  // ── Toggle Member Selection ────────────────────────────────────────────────
  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAllMembers = () => {
    const filtered = customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
    );
    if (selectedMembers.size === filtered.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filtered.map((c) => c.id)));
    }
  };

  // ── Filtered Data ──────────────────────────────────────────────────────────
  const filteredCommunities = communities.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
  );

  const activeList = viewMode === "communities" ? filteredCommunities : filteredGroups;
  const activeLoading = viewMode === "communities" ? loadingCommunities : loadingGroups;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">WhatsApp Groups & Communities</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Create groups, manage communities, and send announcements
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Status badge */}
            {waStatus.isReady ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Connected
                {waStatus.clientInfo ? ` · ${waStatus.clientInfo.name}` : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Disconnected
              </span>
            )}

            {tab === "list" && viewMode === "communities" && (
              <Button
                size="sm"
                onClick={handleSync}
                disabled={!waStatus.isReady || syncing}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Communities"}
              </Button>
            )}

            {tab === "list" && (
              <Button
                size="sm"
                onClick={() => setTab("create")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create Group
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {[
            { id: "list", label: "Groups & Communities", icon: Users },
            { id: "create", label: "Create Group", icon: Plus },
            { id: "announce", label: "Send Announcement", icon: Send },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as typeof tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* ══ LIST TAB ═════════════════════════════════════════════════════════ */}
        {tab === "list" && (
          <div className="space-y-4">
            {/* View mode toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("groups")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === "groups"
                      ? "bg-violet-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 inline mr-1.5" />
                  Groups ({groups.length})
                </button>
                <button
                  onClick={() => setViewMode("communities")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === "communities"
                      ? "bg-violet-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-1.5" />
                  Communities ({communities.length})
                </button>
              </div>

              <div className="relative flex-1 max-w-md ml-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${viewMode}...`}
                  className="pl-9 border-slate-200"
                />
              </div>
            </div>

            {activeLoading && (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Loading {viewMode}...
              </div>
            )}

            {!activeLoading && activeList.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 mb-4">
                  {viewMode === "groups" ? (
                    <MessageSquare className="w-7 h-7 text-violet-500" />
                  ) : (
                    <Users className="w-7 h-7 text-violet-500" />
                  )}
                </div>
                <p className="text-slate-600 font-medium">
                  No {viewMode} yet
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {viewMode === "groups"
                    ? "Click 'Create Group' to create your first WhatsApp group"
                    : waStatus.isReady
                    ? "Click 'Sync Communities' to import from WhatsApp"
                    : "Connect WhatsApp first to sync communities"}
                </p>
                {viewMode === "groups" ? (
                  <Button
                    size="sm"
                    onClick={() => setTab("create")}
                    disabled={!waStatus.isReady}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create Group
                  </Button>
                ) : waStatus.isReady ? (
                  <Button
                    size="sm"
                    onClick={handleSync}
                    disabled={syncing}
                    className="mt-4 bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <RefreshCw className={`w-4 h-4 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
                    Sync Communities
                  </Button>
                ) : null}
              </div>
            )}

            {/* Items grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {viewMode === "communities" &&
                filteredCommunities.map((community) => (
                  <div
                    key={community.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shrink-0">
                          {community.name[0]?.toUpperCase() || "C"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {community.name}
                          </h3>
                          {community.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                              {community.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {community.member_count} members
                            </span>
                            {community.group_count > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5" />
                                {community.group_count} groups
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(community.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                        title="Remove from list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedItem(community);
                          setTab("announce");
                        }}
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Send Announcement
                      </Button>
                    </div>
                  </div>
                ))}

              {viewMode === "groups" &&
                filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-semibold text-lg shrink-0">
                          {group.name[0]?.toUpperCase() || "G"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {group.name}
                          </h3>
                          {group.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                              {group.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {group.memberCount} members
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedItem(group);
                          setTab("announce");
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Send Message
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ══ CREATE GROUP TAB ═════════════════════════════════════════════════ */}
        {tab === "create" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-slate-900">Create WhatsApp Group</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Create a new WhatsApp group with selected customers
                </p>
              </div>

              {createError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {createError}
                </div>
              )}

              {createSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Group created successfully!
                </div>
              )}

              {/* Group Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Group Name</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Premium Customers"
                  className="border-slate-200"
                />
              </div>

              {/* Group Description */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  Description (optional)
                </Label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Enter group description..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                />
              </div>

              {/* Member Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-slate-700">
                    Select Members ({selectedMembers.size} selected)
                  </Label>
                  <button
                    onClick={toggleAllMembers}
                    className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                  >
                    {selectedMembers.size === filteredCustomers.length && filteredCustomers.length > 0
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customers..."
                    className="pl-9 border-slate-200"
                  />
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                  {loadingCustomers && (
                    <div className="flex items-center justify-center py-12 text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Loading customers...
                    </div>
                  )}

                  {!loadingCustomers && filteredCustomers.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      No customers found
                    </div>
                  )}

                  {filteredCustomers.map((customer) => (
                    <label
                      key={customer.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                    >
                      <Checkbox
                        checked={selectedMembers.has(customer.id)}
                        onCheckedChange={() => toggleMember(customer.id)}
                        className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                      />
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-50 shrink-0">
                        <span className="text-xs font-semibold text-violet-600">
                          {customer.name?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {customer.name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-400">{customer.phone}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Create Button */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setTab("list")}
                  className="border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={creating || !waStatus.isReady || !groupName.trim() || selectedMembers.size === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Group
                    </>
                  )}
                </Button>
              </div>

              {!waStatus.isReady && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                  <WifiOff className="w-4 h-4 shrink-0" />
                  WhatsApp not connected. Go to Marketing page to connect.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ ANNOUNCE TAB ═════════════════════════════════════════════════════ */}
        {tab === "announce" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-slate-900">Send Announcement</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Broadcast a message to all members of a group or community
                </p>
              </div>

              {sendError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {sendError}
                </div>
              )}

              {sendSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Announcement sent successfully!
                </div>
              )}

              {/* Target selector */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Select Target</Label>
                <select
                  value={selectedItem ? ("community_id" in selectedItem ? `community-${selectedItem.id}` : `group-${selectedItem.id}`) : ""}
                  onChange={(e) => {
                    const [type, id] = e.target.value.split("-");
                    if (type === "community") {
                      const comm = communities.find((c) => c.id === id);
                      setSelectedItem(comm || null);
                    } else if (type === "group") {
                      const grp = groups.find((g) => g.id === id);
                      setSelectedItem(grp || null);
                    } else {
                      setSelectedItem(null);
                    }
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                >
                  <option value="">— Choose a group or community —</option>
                  {groups.length > 0 && (
                    <optgroup label="Groups">
                      {groups.map((g) => (
                        <option key={g.id} value={`group-${g.id}`}>
                          {g.name} ({g.memberCount} members)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {communities.length > 0 && (
                    <optgroup label="Communities">
                      {communities.map((c) => (
                        <option key={c.id} value={`community-${c.id}`}>
                          {c.name} ({c.member_count} members)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-slate-700">Message</Label>
                  <span className="text-xs text-slate-400">
                    {announcementMessage.length} chars
                  </span>
                </div>
                <textarea
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  placeholder="Enter your announcement message..."
                  rows={6}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                />
              </div>

              {/* Media URL */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  Image URL (optional)
                </Label>
                <Input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="border-slate-200"
                />
                {mediaUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl}
                    alt="preview"
                    className="mt-2 h-32 w-auto rounded-lg object-cover border border-slate-200"
                  />
                )}
              </div>

              {/* Send button */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSendAnnouncement}
                  disabled={sending || !waStatus.isReady || !selectedItem}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Announcement
                    </>
                  )}
                </Button>
              </div>

              {!waStatus.isReady && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                  <WifiOff className="w-4 h-4 shrink-0" />
                  WhatsApp not connected. Go to Marketing page to connect.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
