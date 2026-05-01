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
  Palette,
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
    
    // Push a dummy state to prevent back navigation
    const disableBackButton = () => {
      window.history.pushState(null, "", window.location.href);
    };

    // Initial push
    disableBackButton();

    // Listen for popstate (back button) and push forward again
    const handlePopState = () => {
      disableBackButton();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [status]);

  // Dynamic nav built from bizConfig
  const navigation = useMemo(() => {
    const role = session?.user?.role;
    const permissions = session?.user?.permissions;
    const base: { name: string; href: string; icon: React.ComponentType<{ className?: string }>; badge?: string; module: string }[] = [
      { name: "Dashboard",                          href: "/admin",                 icon: LayoutDashboard, module: "dashboard" },
      { name: `${bizConfig.product_name_plural}`,   href: "/admin/inventory",       icon: Package, module: "inventory" },
      { name: "Customers",                          href: "/admin/customers",       icon: Users, module: "customers" },
    ];
    if (bizConfig.enable_leads_module)    base.push({ name: "Leads",     href: "/admin/leads",         icon: UserPlus, module: "leads" });
    if (bizConfig.enable_marketing_module) base.push({ name: "Marketing", href: "/admin/marketing",     icon: Zap, module: "marketing" });
    base.push({ name: "Orders",    href: "/admin/orders",       icon: ShoppingCart, module: "orders" });
    base.push({ name: "Conversations", href: "/admin/conversations", icon: MessageSquare, module: "conversations" });
    base.push({ name: "Communities", href: "/admin/communities", icon: Users, module: "communities" });
    base.push({ name: "Inquiries", href: "/admin/inquiries",    icon: MessageSquare, module: "inquiries" });
    base.push({ name: "Calendar",  href: "/admin/calendar",     icon: Calendar, module: "calendar" });
    base.push({ name: "Telegram",  href: "/admin/telegram",     icon: Bot, module: "telegram" });
    base.push({ name: "AI Assistant", href: "/admin/ai-assistant", icon: Sparkles, module: "ai_assistant" });
    base.push({ name: "Analytics", href: "/admin/analytics",    icon: BarChart2, module: "analytics" });
    base.push({ name: "Appearance", href: "/admin/appearance",  icon: Palette,   module: "settings" });
    if (hasPermission(role, "users", "read", permissions) && !hasPermission(role, "settings", "read", permissions)) {
      base.push({ name: "Team", href: "/admin/settings?tab=team", icon: Users, module: "users" });
    }
    base.push({ name: "Settings",  href: "/admin/settings",     icon: Settings, module: "settings" });
    return base.filter((item) => hasPermission(role, item.module, "read", permissions));
  }, [bizConfig, session?.user?.role, session?.user?.permissions]);

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

  // Redirect to setup wizard if the active profile hasn't been configured yet.
  // Only fires once bizConfig has loaded (bizConfig.id exists) so we don't
  // get a flash redirect while the context is still initialising.
  useEffect(() => {
    // Don't redirect if:
    // - Not authenticated
    // - Already on setup or login page
    // - Config is still loading
    // - No profile ID loaded yet
    if (
      status !== "authenticated" ||
      pathname.startsWith("/admin/setup") ||
      pathname === "/admin/login" ||
      configLoading ||
      !bizConfig.id
    ) return;

    // Only redirect to setup if the profile is truly incomplete:
    // - setup_completed is explicitly false (not undefined, not true)
    // - AND no display_name exists (brand new profile)
    // - AND we haven't already completed setup (check both storage types)
    // - AND setup_completed_at doesn't exist (never completed before)
    const setupExplicitlyIncomplete = bizConfig.setup_completed === false;
    const hasNoDisplayName = !bizConfig.display_name || bizConfig.display_name.trim() === "";
    const alreadyCompletedSession = sessionStorage.getItem(`setup_done_${bizConfig.id}`) === "1";
    const alreadyCompletedLocal = localStorage.getItem(`setup_done_${bizConfig.id}`) === "1";
    const hasCompletedBefore = !!(bizConfig as { setup_completed_at?: string }).setup_completed_at;
    const needsSetup = setupExplicitlyIncomplete && hasNoDisplayName && !alreadyCompletedSession && !alreadyCompletedLocal && !hasCompletedBefore;
    
    if (needsSetup) {
      console.log("Redirecting to setup - profile incomplete:", { 
        id: bizConfig.id, 
        setup_completed: bizConfig.setup_completed, 
        display_name: bizConfig.display_name 
      });
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

  // Show login page without layout
  if (pathname === "/admin/login" || pathname.startsWith("/admin/setup")) {
    return <>{children}</>;
  }

  // Show loading state while session loads
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  // Unauthenticated — middleware handles redirect but guard here too
  if (status === "unauthenticated") return null;

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col">

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo + Profile Switcher */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <Link href="/admin" className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {bizConfig.id && (bizConfig as { logo_url?: string }).logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(bizConfig as { logo_url?: string }).logo_url}
                      alt="logo"
                      className="w-9 h-9 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="p-2 rounded-lg" style={{ background: "var(--color-primary)" }}>
                      <Store className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-slate-900 truncate block">
                    {(bizConfig as { store_name?: string }).store_name || bizConfig.display_name || "My Store"}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--color-primary)" }}>CRM Dashboard</span>
                </div>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Switcher */}
            {profiles.length > 1 && (
              <div className="mt-3 relative">
                <button
                  onClick={() => setProfileDropOpen(o => !o)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-violet-300 transition-all text-sm"
                >
                  <span className="truncate text-slate-600">
                    {profiles.find(p => p.id === activeProfileId)?.display_name ||
                     profiles.find(p => p.id === activeProfileId)?.product_name_plural ||
                     "Select Profile"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {profileDropOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {profiles.map(p => (
                      <button
                        key={p.id}
                        onClick={() => switchProfile(p.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          p.id === activeProfileId
                            ? "bg-violet-50 text-violet-700"
                            : "hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{p.display_name || p.product_name_plural}</span>
                      </button>
                    ))}
                    <div className="border-t border-slate-100">
                      <Link
                        href="/admin/setup?new=1"
                        onClick={() => setProfileDropOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
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
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/admin" && pathname.startsWith(item.href));
              
              return (
                <Link key={item.name} href={item.href} onClick={() => setSidebarOpen(false)}>
                  <div className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-150 ${
                    isActive 
                      ? 'bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}>
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-[color:var(--color-primary)]' : ''}`} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    {item.badge && (
                      <Badge className="bg-[color:var(--color-primary)] text-white border-0 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-[color:var(--color-primary)]" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t border-slate-100">
            {/* User Info */}
            {adminUser && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: "var(--color-primary)" }}>
                    {(adminUser.full_name || adminUser.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{adminUser.full_name || adminUser.username}</p>
                    <p className="text-xs text-slate-400 capitalize">{adminUser.role?.replace("_", " ") || "Admin"}</p>
                  </div>
                </div>
              </div>
            )}
            
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
              >
                <Menu className="w-6 h-6 text-slate-600" />
              </button>
              
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder={`Search ${bizConfig.product_name_plural.toLowerCase()}, orders…`}
                  className="w-80 pl-10 bg-slate-50 border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <NotificationButton />
              
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "var(--color-primary)" }}>
                  {(adminUser?.full_name || adminUser?.username || "A").charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">{adminUser?.full_name || adminUser?.username || "Admin"}</p>
                  <p className="text-xs text-slate-400 capitalize">{adminUser?.role?.replace("_", " ") || "Administrator"}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 min-h-0 ${pathname === "/admin/conversations" ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`} data-main-content>
          <div className={pathname === "/admin/conversations" ? "flex flex-col flex-1 min-h-0" : "p-4 lg:p-6"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
