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
  Store,
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useBusinessConfig } from "@/contexts/BusinessContext";
import NotificationButton from "@/components/admin/notification-button";
import { hasPermission } from "@/lib/permissions";

interface Profile {
  id: string;
  display_name: string;
  business_type: string;
  product_name_plural: string;
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
    base.push({ name: "Conversations", href: "/admin/conversations", icon: MessageSquare, module: "conversations", group: "engage" });
    base.push({ name: "Communities",   href: "/admin/communities",   icon: Users,         module: "communities",   group: "engage" });
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
          <p className="text-slate-400 text-sm">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="h-screen overflow-hidden flex" style={{ background: "#f0f2f7", fontFamily: "'Inter', sans-serif" }}>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[240px] z-50 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          background: "linear-gradient(180deg, #0d1117 0%, #161b27 40%, #0d1117 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                style={{ background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)", boxShadow: "0 4px 15px rgba(59,130,246,0.4)" }}
              >
                {bizConfig.id && (bizConfig as { logo_url?: string }).logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(bizConfig as { logo_url?: string }).logo_url} alt="logo" className="w-9 h-9 rounded-xl object-cover" />
                ) : (
                  <Store className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate leading-tight">
                  {(bizConfig as { store_name?: string }).store_name || bizConfig.display_name || "My Store"}
                </p>
                <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: "#3b82f6" }}>CRM Pro</p>
              </div>
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
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}
              >
                <span className="truncate">
                  {profiles.find(p => p.id === activeProfileId)?.display_name || "Select Profile"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              </button>
              {profileDropOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-2xl"
                  style={{ background: "#1e2433", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {profiles.map(p => (
                    <button
                      key={p.id}
                      onClick={() => switchProfile(p.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left"
                      style={{ color: p.id === activeProfileId ? "#3b82f6" : "#94a3b8" }}
                    >
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{p.display_name || p.product_name_plural}</span>
                    </button>
                  ))}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <Link
                      href="/admin/setup?new=1"
                      onClick={() => setProfileDropOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                      style={{ color: "#64748b" }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Profile
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5 scrollbar-thin">
          {navGroups.map(group => {
            const items = navigation.filter(n => n.group === group.key);
            if (items.length === 0) return null;
            return (
              <div key={group.key}>
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#374151" }}>
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                    return (
                      <Link key={item.name} href={item.href} onClick={() => setSidebarOpen(false)}>
                        <div
                          className="group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer"
                          style={isActive ? {
                            background: "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(139,92,246,0.15) 100%)",
                            border: "1px solid rgba(59,130,246,0.3)",
                          } : {
                            border: "1px solid transparent",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                              style={isActive ? {
                                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                                boxShadow: "0 2px 8px rgba(59,130,246,0.4)",
                              } : {
                                background: "rgba(255,255,255,0.05)",
                              }}
                            >
                              <item.icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-500"}`} />
                            </div>
                            <span
                              className="text-sm font-medium"
                              style={{ color: isActive ? "#e2e8f0" : "#64748b" }}
                            >
                              {item.name}
                            </span>
                          </div>
                          {item.badge && (
                            <Badge className="text-white border-0 text-[10px] px-1.5 py-0.5" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
                              {item.badge}
                            </Badge>
                          )}
                          {isActive && <ChevronRight className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />}
                        </div>
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
            <div
              className="rounded-xl p-3 mb-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                  style={{ background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}
                >
                  {(adminUser.full_name || adminUser.username).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#e2e8f0" }}>
                    {adminUser.full_name || adminUser.username}
                  </p>
                  <p className="text-[11px] capitalize" style={{ color: "#475569" }}>
                    {adminUser.role?.replace("_", " ") || "Admin"}
                  </p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: "#ef4444" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="lg:pl-[240px] flex flex-col flex-1 min-h-0 min-w-0">

        {/* Top Header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-5 lg:px-8 py-3.5"
          style={{
            background: "rgba(240,242,247,0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-black/5 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Bar */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-2xl w-80 transition-all"
              style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: "#94a3b8" }} />
              <input
                placeholder={`Search ${bizConfig.product_name_plural?.toLowerCase() || "items"}, orders, customers…`}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 text-slate-700"
              />
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                <Command className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-medium">K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationButton />

            <div
              className="flex items-center gap-3 pl-3"
              style={{ borderLeft: "1px solid rgba(0,0,0,0.08)" }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                style={{ background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}
              >
                {(adminUser?.full_name || adminUser?.username || "A").charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{adminUser?.full_name || adminUser?.username || "Admin"}</p>
                <p className="text-[11px] text-slate-400 capitalize">{adminUser?.role?.replace("_", " ") || "Administrator"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className={`flex-1 min-h-0 ${pathname === "/admin/conversations" ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}
          data-main-content
        >
          <div className={pathname === "/admin/conversations" ? "flex flex-col flex-1 min-h-0" : "p-5 lg:p-7"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
