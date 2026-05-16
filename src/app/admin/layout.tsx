"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Package,
  Users, 
  ShoppingCart, 
  MessageSquare, 
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  ChevronRight,
  Zap,
  Loader2,
  UserPlus,
  ChevronDown,
  Plus,
  RefreshCw,
  Calendar,
  Bot,
  BarChart2,
  Sparkles,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useBusinessConfig } from "@/contexts/BusinessContext";
import NotificationButton from "@/components/admin/notification-button";
import { hasPermission } from "@/lib/permissions";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";

interface Profile {
  id: string;
  display_name: string;
  business_type: string;
  product_name_plural: string;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileDropOpen, setProfileDropOpen] = useState(false);
  const [profileSwitchPreviewId, setProfileSwitchPreviewId] = useState<string | null>(null);
  const { config: bizConfig, refreshConfig, isLoading: configLoading } = useBusinessConfig();
  const activeProfileId = profileSwitchPreviewId ?? bizConfig.id ?? session?.user?.profile_id ?? null;

  // Disable browser back button while logged in to admin
  useEffect(() => {
    if (status !== "authenticated") return;
    const disableBackButton = () => {
      window.history.pushState(null, "", window.location.href);
    };
    disableBackButton();
    const handlePopState = () => { disableBackButton(); };
    window.addEventListener("popstate", handlePopState);
    return () => { window.removeEventListener("popstate", handlePopState); };
  }, [status]);

  // Dynamic nav built from bizConfig
  const navigation = useMemo(() => {
    const role = session?.user?.role;
    const permissions = session?.user?.permissions;
    const base: { name: string; href: string; icon: React.ComponentType<{ className?: string }>; badge?: string; module: string; group?: string }[] = [
      { name: "Dashboard",                          href: "/admin",                 icon: LayoutDashboard, module: "dashboard",      group: "main" },
      { name: `${bizConfig.product_name_plural}`,   href: "/admin/inventory",       icon: Package,         module: "inventory",      group: "main" },
      { name: "Customers",                          href: "/admin/customers",       icon: Users,           module: "customers",      group: "main" },
    ];
    if (bizConfig.enable_leads_module)     base.push({ name: "Leads",         href: "/admin/leads",         icon: UserPlus,    module: "leads",         group: "sales" });
    if (bizConfig.enable_marketing_module) base.push({ name: "Marketing",     href: "/admin/marketing",     icon: Zap,         module: "marketing",     group: "sales" });
    base.push({ name: "Orders",        href: "/admin/orders",        icon: ShoppingCart, module: "orders",        group: "sales" });
    base.push({ name: "Conversations", href: "/admin/conversations",    icon: MessageSquare, module: "conversations",    group: "engage" });
    base.push({ name: "WA Agents",     href: "/admin/whatsapp-agents", icon: WhatsAppIcon,  module: "whatsapp_agents", group: "engage" });
    base.push({ name: "Communities",   href: "/admin/communities",      icon: Users,         module: "communities",     group: "engage" });
    base.push({ name: "Inquiries",     href: "/admin/inquiries",     icon: MessageSquare, module: "inquiries",     group: "engage" });
    base.push({ name: "Calendar",      href: "/admin/calendar",      icon: Calendar,      module: "calendar",      group: "engage" });
    base.push({ name: "Telegram",      href: "/admin/telegram",      icon: Bot,           module: "telegram",      group: "engage" });
    base.push({ name: "AI Assistant",  href: "/admin/ai-assistant",  icon: Sparkles,      module: "ai_assistant",  group: "tools" });
    base.push({ name: "Analytics",     href: "/admin/analytics",     icon: BarChart2,     module: "analytics",     group: "tools" });

    if (hasPermission(role, "users", "read", permissions) && !hasPermission(role, "settings", "read", permissions)) {
      base.push({ name: "Team", href: "/admin/settings?tab=team", icon: Users, module: "users", group: "tools" });
    }
    base.push({ name: "Settings",      href: "/admin/settings",      icon: Settings,      module: "settings",      group: "tools" });
    return base.filter((item) => hasPermission(role, item.module, "read", permissions));
  }, [bizConfig, session?.user?.role, session?.user?.permissions]);

  const navGroups = [
    { key: "main",   label: "Overview" },
    { key: "sales",  label: "Sales" },
    { key: "engage", label: "Engage" },
    { key: "tools",  label: "Tools" },
  ];

  // Load profiles list for the switcher
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profiles")
      .then(r => r.json())
      .then(json => { if (json.success) setProfiles(json.profiles); })
      .catch(() => {});
  }, [status]);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/admin/login" && !pathname.startsWith("/admin/setup")) {
      router.push("/admin/login");
    }
  }, [status, pathname, router]);

  useEffect(() => {
    if (
      status !== "authenticated" ||
      pathname.startsWith("/admin/setup") ||
      pathname === "/admin/login" ||
      configLoading ||
      !bizConfig.id
    ) return;
    const setupExplicitlyIncomplete = bizConfig.setup_completed === false;
    const hasNoDisplayName = !bizConfig.display_name || bizConfig.display_name.trim() === "";
    const alreadyCompletedSession = sessionStorage.getItem(`setup_done_${bizConfig.id}`) === "1";
    const alreadyCompletedLocal = localStorage.getItem(`setup_done_${bizConfig.id}`) === "1";
    const hasCompletedBefore = !!(bizConfig as { setup_completed_at?: string }).setup_completed_at;
    const needsSetup = setupExplicitlyIncomplete && hasNoDisplayName && !alreadyCompletedSession && !alreadyCompletedLocal && !hasCompletedBefore;
    if (needsSetup) {
      router.push("/admin/setup?from_signup=1");
    }
  }, [status, bizConfig.setup_completed, bizConfig.id, bizConfig.display_name, pathname, router, configLoading]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/admin/login" });
  };

  const switchProfile = async (profileId: string) => {
    setProfileDropOpen(false);
    const res = await fetch("/api/profiles/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId }),
    });
    if (res.ok) {
      setProfileSwitchPreviewId(profileId);
      await refreshConfig();
      router.refresh();
    }
  };

  const adminUser = session?.user
    ? { username: session.user.username || session.user.name || "Admin", full_name: session.user.name, role: session.user.role }
    : null;

  if (pathname === "/admin/login" || pathname.startsWith("/admin/setup")) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] relative overflow-hidden">
        <div className="absolute inset-0 particle-grid" />
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[100px] animate-pulse" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center relative z-10"
        >
          <div className="relative inline-block">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            </div>
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-xl animate-pulse" />
            <motion.div
              className="absolute -inset-1 rounded-2xl border border-indigo-500/30"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <p className="text-slate-500 text-xs font-mono tracking-[0.2em] mt-5 uppercase">Initializing workspace</p>
          <motion.div
            className="mt-3 h-0.5 w-32 mx-auto rounded-full overflow-hidden bg-white/5"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="h-screen overflow-hidden flex bg-[#f8f9fc]">

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ── */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[260px] z-50 flex flex-col transform transition-transform duration-300 ease-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          background: "linear-gradient(180deg, #070b14 0%, #0c1222 50%, #070b14 100%)",
          borderRight: "1px solid rgba(99,102,241,0.1)",
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        {/* Side glow accent */}
        <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-transparent" />
        {/* Logo Section */}
        <div className="px-5 pt-6 pb-5 relative" style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}>
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={(bizConfig as { logo_url?: string }).logo_url || "/logo.png"} alt="logo" className="w-40 h-auto object-contain" />
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Switcher */}
          {profiles.length > 1 && (
            <div className="mt-4 relative">
              <button
                onClick={() => setProfileDropOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-white/5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="truncate text-slate-300 text-xs font-medium">
                  {profiles.find(p => p.id === activeProfileId)?.display_name || "Select Profile"}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform duration-200 ${profileDropOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {profileDropOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-2xl"
                    style={{ background: "#1a2035", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    {profiles.map(p => (
                      <button
                        key={p.id}
                        onClick={() => switchProfile(p.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left hover:bg-white/5 ${p.id === activeProfileId ? "text-indigo-400" : "text-slate-400"}`}
                      >
                        <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{p.display_name || p.product_name_plural}</span>
                      </button>
                    ))}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <Link
                        href="/admin/setup?new=1"
                        onClick={() => setProfileDropOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-slate-500 hover:text-slate-300 hover:bg-white/5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New Profile
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-6 sidebar-scroll">
          {navGroups.map(group => {
            const items = navigation.filter(n => n.group === group.key);
            if (items.length === 0) return null;
            return (
              <div key={group.key}>
                <p className="px-3 mb-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {items.map(item => {
                    const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                    return (
                      <Link key={item.name} href={item.href} onClick={() => setSidebarOpen(false)}>
                        <motion.div
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer relative ${isActive ? "nav-item-active" : "hover:bg-white/[0.04]"}`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="nav-indicator"
                              className="absolute inset-0 rounded-xl"
                              style={{
                                background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)",
                                border: "1px solid rgba(99,102,241,0.25)",
                              }}
                              transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            />
                          )}
                          <div className="flex items-center gap-3 relative z-10">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                                isActive
                                  ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/30"
                                  : "bg-white/[0.04] group-hover:bg-white/[0.08]"
                              }`}
                            >
                              <item.icon className={`w-4 h-4 transition-colors ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                            </div>
                            <span className={`text-[13px] font-medium transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}>
                              {item.name}
                            </span>
                          </div>
                          <div className="relative z-10 flex items-center gap-2">
                            {item.badge && (
                              <Badge className="text-white border-0 text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-600">
                                {item.badge}
                              </Badge>
                            )}
                            {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                          </div>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom User Card */}
        <div className="px-3 pb-5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {adminUser && (
            <div className="rounded-xl p-3 mb-3 bg-gradient-to-r from-white/[0.03] to-white/[0.06] border border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600" />
                  <div className="absolute inset-[-2px] rounded-full border-2 border-indigo-500/30 animate-pulse" />
                  <span className="relative z-10">
                    {(adminUser.full_name || adminUser.username).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-white">
                    {adminUser.full_name || adminUser.username}
                  </p>
                  <p className="text-[11px] capitalize text-slate-500">
                    {adminUser.role?.replace("_", " ") || "Admin"}
                  </p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="lg:pl-[260px] flex flex-col flex-1 min-h-0 min-w-0">

        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 lg:px-8 py-3.5 bg-white/70 backdrop-blur-2xl border-b border-slate-200/50 shadow-sm shadow-slate-100/50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Bar */}
            <div className="hidden md:flex items-center gap-2.5 px-4 py-2.5 rounded-xl w-80 bg-slate-50/80 border border-slate-200/60 hover:border-indigo-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/5 focus-within:bg-white transition-all duration-300 group">
              <Search className="w-4 h-4 shrink-0 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                placeholder={`Search ${bizConfig.product_name_plural?.toLowerCase() || "items"}, orders, customers…`}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 text-slate-700"
              />
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 shadow-sm">
                <Command className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-mono">K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationButton />

            <div className="flex items-center gap-3 pl-3 border-l border-slate-200/60">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg relative overflow-hidden group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500" />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 blur-md opacity-0 group-hover:opacity-50 transition-opacity" />
                <span className="relative z-10">
                  {(adminUser?.full_name || adminUser?.username || "A").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{adminUser?.full_name || adminUser?.username || "Admin"}</p>
                <p className="text-[11px] text-slate-400 capitalize font-medium">{adminUser?.role?.replace("_", " ") || "Administrator"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content with transition */}
        <main
          className={`flex-1 min-h-0 ${pathname === "/admin/conversations" || pathname === "/admin/whatsapp-agents" ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}
          data-main-content
        >
          <div className={pathname === "/admin/conversations" || pathname === "/admin/whatsapp-agents" ? "flex flex-col flex-1 min-h-0" : "p-5 lg:p-7"}>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={pathname === "/admin/conversations" || pathname === "/admin/whatsapp-agents" ? "flex flex-col flex-1 min-h-0" : ""}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
