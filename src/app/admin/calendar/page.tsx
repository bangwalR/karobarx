"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Clock,
  MapPin,
  User,
  Phone,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Video,
  CalendarDays,
  List,
  Zap,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_at: string;
  end_at: string;
  location: string | null;
  status: string;
  google_event_id: string | null;
  google_meet_link: string | null;
  reminder_minutes: number;
  linked_lead_id: string | null;
  linked_customer_id: string | null;
  leads?: { id: string; name: string; phone: string } | null;
  customers?: { id: string; name: string; phone: string } | null;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  meeting: { label: "Meeting", color: "text-blue-400", bg: "bg-blue-500/20" },
  call: { label: "Call", color: "text-green-400", bg: "bg-green-500/20" },
  demo: { label: "Demo", color: "text-purple-400", bg: "bg-purple-500/20" },
  follow_up: { label: "Follow-up", color: "text-orange-400", bg: "bg-orange-500/20" },
  reminder: { label: "Reminder", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  other: { label: "Other", color: "text-gray-400", bg: "bg-gray-500/20" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "bg-blue-500/20 text-blue-400" },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400" },
  cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-400" },
  rescheduled: { label: "Rescheduled", color: "bg-yellow-500/20 text-yellow-400" },
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "list">("month");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const searchParams = useSearchParams();
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_type: "meeting",
    start_at: "",
    end_at: "",
    location: "",
    reminder_minutes: 30,
    attendee_emails: "", // comma-separated
  });

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/oauth");
      const data = await res.json();
      setGoogleConnected(data.connected === true);
      setGoogleEmail(data.email || null);
    } catch {
      setGoogleConnected(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const monthStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/calendar/events?month=${monthStr}`);
      const data = await res.json();
      setEvents(data.events || []);
      // Update Google connection status from the events API too
      if (typeof data.google_connected === "boolean") {
        setGoogleConnected(data.google_connected);
      }
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  const handleGoogleConnect = async () => {
    setGoogleConnecting(true);
    try {
      const res = await fetch("/api/calendar/oauth");
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.connected) {
        toast.info("Already connected!");
        fetchGoogleStatus();
      }
    } catch {
      toast.error("Failed to start Google Calendar connection");
    } finally {
      setGoogleConnecting(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!confirm("Disconnect Google Calendar? Events will no longer sync.")) return;
    try {
      await fetch("/api/calendar/oauth", { method: "DELETE" });
      setGoogleConnected(false);
      setGoogleEmail(null);
      toast.success("Google Calendar disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchGoogleStatus();
  }, [fetchGoogleStatus]);

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      toast.success("Google Calendar connected successfully! 🎉");
      fetchGoogleStatus();
    }
    if (searchParams.get("error")) {
      const err = searchParams.get("error");
      if (err === "no_refresh_token" || err?.includes("refresh_token")) {
        toast.error("OAuth error: please revoke access at myaccount.google.com and try again");
      } else {
        toast.error(`Google Calendar OAuth error: ${err}`);
      }
    }
  }, [searchParams, fetchGoogleStatus]);

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.start_at || !newEvent.end_at) {
      toast.error("Title, start time and end time are required");
      return;
    }
    if (new Date(newEvent.end_at) <= new Date(newEvent.start_at)) {
      toast.error("End time must be after start time");
      return;
    }

    setSaving(true);
    try {
      const emails = newEvent.attendee_emails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.includes("@"));
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newEvent, attendee_emails: emails }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        const synced = data.event?.google_event_id;
        const invited = emails.length > 0;
        toast.success(
          synced && invited
            ? "Event added, synced to Google Calendar & invites sent! 🎉"
            : synced
            ? "Event added & synced to Google Calendar! 🗓️"
            : invited
            ? "Event added & invites sent! 📧"
            : "Event added!"
        );
        setShowAddModal(false);
        setNewEvent({
          title: "",
          description: "",
          event_type: "meeting",
          start_at: "",
          end_at: "",
          location: "",
          reminder_minutes: 30,
          attendee_emails: "",
        });
        fetchEvents();
      }
    } catch {
      toast.error("Failed to add event");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/calendar/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else {
        toast.success("Event updated");
        fetchEvents();
        setShowDetailModal(false);
      }
    } catch {
      toast.error("Failed to update event");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      const res = await fetch(`/api/calendar/events?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else {
        toast.success("Event deleted");
        setShowDetailModal(false);
        fetchEvents();
      }
    } catch {
      toast.error("Failed to delete event");
    }
  };

  // Build calendar grid
  const buildCalendarDays = () => {
    const firstDay = new Date(currentMonth.year, currentMonth.month, 1).getDay();
    const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.start_at.startsWith(dateStr));
  };

  const isToday = (day: number) => {
    return (
      today.getFullYear() === currentMonth.year &&
      today.getMonth() === currentMonth.month &&
      today.getDate() === day
    );
  };

  const prevMonth = () => {
    setCurrentMonth((m) => {
      if (m.month === 0) return { year: m.year - 1, month: 11 };
      return { year: m.year, month: m.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth((m) => {
      if (m.month === 11) return { year: m.year + 1, month: 0 };
      return { year: m.year, month: m.month + 1 };
    });
  };

  const upcomingEvents = events
    .filter((e) => new Date(e.start_at) >= new Date() && e.status === "scheduled")
    .slice(0, 10);

  const todayEvents = getEventsForDay(today.getDate());

  const calendarDays = buildCalendarDays();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-7 h-7 text-violet-500" />
            Calendar
          </h1>
          <p className="text-gray-400 mt-1">Schedule meetings, calls, and follow-ups</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Google Calendar OAuth connect/disconnect */}
          {googleConnected ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-green-500/10 text-green-400 border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="hidden sm:inline">{googleEmail ? `Synced · ${googleEmail}` : "Google Calendar Synced"}</span>
                <span className="sm:hidden">Synced</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoogleDisconnect}
                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 px-2"
                title="Disconnect Google Calendar"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoogleConnect}
              disabled={googleConnecting}
              className="border-gray-600 hover:border-violet-500 hover:bg-violet-500/10 gap-2 text-gray-300 hover:text-violet-300"
            >
              {googleConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Connect Google Calendar
            </Button>
          )}

          <div className="flex rounded-xl overflow-hidden border border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("month")}
              className={`rounded-none px-3 ${view === "month" ? "bg-violet-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}
            >
              <CalendarDays className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("list")}
              className={`rounded-none px-3 ${view === "list" ? "bg-violet-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={fetchEvents}
            className="border-gray-700 hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-violet-600 hover:bg-violet-700 border-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today", value: todayEvents.length, color: "text-orange-400", icon: Clock },
          { label: "This Month", value: events.length, color: "text-blue-400", icon: Calendar },
          { label: "Upcoming", value: upcomingEvents.length, color: "text-green-400", icon: CheckCircle },
          { label: "Completed", value: events.filter(e => e.status === "completed").length, color: "text-purple-400", icon: Zap },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white/5 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : view === "month" ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold">
                {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
              </h2>
              <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const dayEvents = day ? getEventsForDay(day) : [];
                const todayFlag = day ? isToday(day) : false;
                return (
                  <div
                    key={idx}
                    className={`min-h-[80px] p-1.5 rounded-lg transition-colors ${
                      day ? "cursor-pointer hover:bg-white/5" : ""
                    } ${todayFlag ? "ring-2 ring-violet-500 bg-violet-500/10" : ""}`}
                    onClick={() => {
                      if (!day) return;
                      const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      setNewEvent((prev) => ({
                        ...prev,
                        start_at: `${dateStr}T09:00`,
                        end_at: `${dateStr}T10:00`,
                      }));
                      setShowAddModal(true);
                    }}
                  >
                    {day && (
                      <>
                        <span className={`text-sm font-medium ${todayFlag ? "text-violet-400" : "text-gray-300"}`}>
                          {day}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 2).map((ev) => {
                            const cfg = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.other;
                            return (
                              <div
                                key={ev.id}
                                className={`text-[10px] px-1 py-0.5 rounded truncate ${cfg.bg} ${cfg.color} cursor-pointer`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(ev);
                                  setShowDetailModal(true);
                                }}
                              >
                                {ev.title}
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] text-gray-500 px-1">+{dayEvents.length - 2} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Events sidebar */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-violet-500" />
              Upcoming
            </h3>

            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400 text-sm">No upcoming events</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                  className="mt-3 border-gray-700"
                >
                  Schedule one
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((ev) => {
                  const cfg = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.other;
                  const start = new Date(ev.start_at);
                  return (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-gray-800"
                      onClick={() => {
                        setSelectedEvent(ev);
                        setShowDetailModal(true);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ev.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            {" "}
                            {start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <Badge className={`border-0 text-[10px] shrink-0 ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                      {ev.leads && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3" /> {ev.leads.name}
                        </p>
                      )}
                      {ev.customers && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3" /> {ev.customers.name}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-1.5 hover:bg-white/10 rounded-lg">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="font-semibold">{MONTH_NAMES[currentMonth.month]} {currentMonth.year}</h2>
              <button onClick={nextMonth} className="p-1.5 hover:bg-white/10 rounded-lg">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-400">{events.length} events</p>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No events this month</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {events.map((ev) => {
                const cfg = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.other;
                const statusCfg = STATUS_CONFIG[ev.status] || STATUS_CONFIG.scheduled;
                const start = new Date(ev.start_at);
                const end = new Date(ev.end_at);
                return (
                  <div
                    key={ev.id}
                    className="p-4 hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-4"
                    onClick={() => { setSelectedEvent(ev); setShowDetailModal(true); }}
                  >
                    <div className="text-center min-w-[50px]">
                      <p className="text-2xl font-bold">{start.getDate()}</p>
                      <p className="text-xs text-gray-500">{MONTH_NAMES[start.getMonth()].slice(0, 3)}</p>
                    </div>
                    <div className={`w-1 h-12 rounded-full ${cfg.bg.replace("/20", "")}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{ev.title}</p>
                        <Badge className={`border-0 text-xs ${cfg.bg} ${cfg.color}`}>{cfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} –{" "}
                          {end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {ev.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ev.google_meet_link && (
                        <a
                          href={ev.google_meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                          title="Join Google Meet"
                        >
                          <Video className="w-4 h-4" />
                        </a>
                      )}
                      <Badge className={`border-0 text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Event Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-500" />
              Add Event
            </DialogTitle>
            <DialogDescription>Schedule a new meeting, call, or reminder</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label>Title *</Label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="e.g., Demo call with Rahul"
                className="mt-1 bg-gray-800 border-gray-700"
              />
            </div>

            <div>
              <Label>Event Type</Label>
              <Select
                value={newEvent.event_type}
                onValueChange={(v) => setNewEvent({ ...newEvent, event_type: v })}
              >
                <SelectTrigger className="mt-1 bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start *</Label>
                <Input
                  type="datetime-local"
                  value={newEvent.start_at}
                  onChange={(e) => setNewEvent({ ...newEvent, start_at: e.target.value })}
                  className="mt-1 bg-gray-800 border-gray-700"
                />
              </div>
              <div>
                <Label>End *</Label>
                <Input
                  type="datetime-local"
                  value={newEvent.end_at}
                  onChange={(e) => setNewEvent({ ...newEvent, end_at: e.target.value })}
                  className="mt-1 bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            <div>
              <Label>Location</Label>
              <Input
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                placeholder="Nehru Place, Delhi / Google Meet"
                className="mt-1 bg-gray-800 border-gray-700"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Meeting notes, agenda..."
                className="mt-1 bg-gray-800 border-gray-700"
                rows={2}
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                Invite Attendees
                <span className="text-xs text-gray-500 font-normal">(optional — sends email invite)</span>
              </Label>
              <Input
                value={newEvent.attendee_emails}
                onChange={(e) => setNewEvent({ ...newEvent, attendee_emails: e.target.value })}
                placeholder="rahul@example.com, priya@example.com"
                className="mt-1 bg-gray-800 border-gray-700"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
            </div>

            <div>
              <Label>Reminder (minutes before)</Label>
              <Select
                value={String(newEvent.reminder_minutes)}
                onValueChange={(v) => setNewEvent({ ...newEvent, reminder_minutes: Number(v) })}
              >
                <SelectTrigger className="mt-1 bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="1440">1 day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {googleConnected && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <p className="text-sm text-green-400">Will sync to Google Calendar</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1 border-gray-700">
                Cancel
              </Button>
              <Button
                onClick={handleAddEvent}
                disabled={saving}
                className="flex-1 bg-violet-600 hover:bg-violet-700 border-0"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Event Details</span>
              {selectedEvent && (
                <Badge
                  className={`border-0 text-xs ${STATUS_CONFIG[selectedEvent.status]?.color || ""}`}
                >
                  {STATUS_CONFIG[selectedEvent.status]?.label || selectedEvent.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 mt-2">
              <div>
                <h3 className="text-lg font-bold">{selectedEvent.title}</h3>
                {selectedEvent.description && (
                  <p className="text-sm text-gray-400 mt-1">{selectedEvent.description}</p>
                )}
              </div>

              <div className="space-y-2 p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>
                    {new Date(selectedEvent.start_at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" "}&mdash;{" "}
                    {new Date(selectedEvent.end_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    {selectedEvent.location}
                  </div>
                )}
                {selectedEvent.google_meet_link && (
                  <a
                    href={selectedEvent.google_meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                  >
                    <Video className="w-4 h-4" />
                    Join Google Meet
                  </a>
                )}
                {selectedEvent.leads && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <User className="w-4 h-4 text-gray-500" />
                    Lead: {selectedEvent.leads.name}
                    {selectedEvent.leads.phone && (
                      <a href={`tel:${selectedEvent.leads.phone}`} className="text-orange-400 hover:text-orange-300">
                        <Phone className="w-3 h-3 inline ml-1" />
                      </a>
                    )}
                  </div>
                )}
                {selectedEvent.customers && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <User className="w-4 h-4 text-gray-500" />
                    Customer: {selectedEvent.customers.name}
                  </div>
                )}
                {selectedEvent.google_event_id && (
                  <div className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Synced to Google Calendar
                  </div>
                )}
              </div>

              {selectedEvent.status === "scheduled" && (
                <div>
                  <Label>Update Status</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={() => handleUpdateStatus(selectedEvent.id, "completed")}
                      className="flex-1 bg-green-600 hover:bg-green-700 border-0 text-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark Complete
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(selectedEvent.id, "cancelled")}
                      variant="outline"
                      className="flex-1 border-red-800 text-red-400 hover:bg-red-900/20 text-sm"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <Button
                onClick={() => handleDelete(selectedEvent.id)}
                variant="outline"
                className="w-full border-red-900 text-red-400 hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Event
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
