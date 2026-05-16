"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Store,
  Palette,
  Users,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Phone,
  MapPin,
  Mail,
  Globe,
  MessageSquare,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { BUSINESS_TEMPLATES, BusinessTemplate } from "@/lib/business-templates";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface StoreInfo {
  store_name: string;
  tagline: string;
  description: string;
  logo_url: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  whatsapp_number: string;
}

interface AdminAccount {
  full_name: string;
  username: string;
  password: string;
  confirm_password: string;
}

// Built-in theme presets (quick colours for the wizard)
const THEME_PRESETS = [
  { id: "violet",       name: "Violet",          primary: "#7c3aed", accent: "#06b6d4" },
  { id: "ocean-blue",   name: "Ocean Blue",      primary: "#3b82f6", accent: "#8b5cf6" },
  { id: "forest-green", name: "Forest Green",    primary: "#22c55e", accent: "#06b6d4" },
  { id: "royal-purple", name: "Royal Purple",    primary: "#a855f7", accent: "#ec4899" },
  { id: "crimson-red",  name: "Crimson Red",     primary: "#ef4444", accent: "#f97316" },
  { id: "minimal-dark", name: "Minimal Dark",    primary: "#6b7280", accent: "#9ca3af" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────────
function Steps({ current, isNewProfile, isFromSignup }: { current: number; isNewProfile: boolean; isFromSignup: boolean }) {
  const steps = [
    { label: "Business Type",     icon: Store },
    { label: "Store Details",     icon: MapPin },
    { label: "Customize Fields",  icon: SlidersHorizontal },
    { label: "Appearance",        icon: Palette },
    ...(isNewProfile || isFromSignup ? [] : [{ label: "Admin Account", icon: Users }]),
  ];
  return (
    <div className="flex items-center gap-2 mb-10 flex-wrap justify-center">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.label} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              active  ? "bg-violet-600 text-white shadow-sm" :
              done    ? "bg-green-100 text-green-700 border border-green-200" :
                        "bg-slate-100 text-slate-400"
            }`}>
              {done ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              {s.label}
            </div>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Wizard
// ─────────────────────────────────────────────────────────────────────────────
function SetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?new=1 means create an additional profile (skip admin account step)
  const isNewProfile = searchParams.get("new") === "1";
  // ?from_signup=1 means user just registered — account exists, skip admin step
  const isFromSignup = searchParams.get("from_signup") === "1";

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0 state
  const [selectedTemplate, setSelectedTemplate] = useState<BusinessTemplate>(BUSINESS_TEMPLATES[0]);

  // Step 1 state
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    store_name: "",
    tagline: "",
    description: "",
    logo_url: "/logo.png",
    phone: "",
    email: "",
    website: "",
    address: "",
    whatsapp_number: "",
  });

  // Step 2 state — terminology customisation (pre-filled from template)
  const [terminology, setTerminology] = useState<Partial<BusinessTemplate>>({});

  // Step 3 state
  const [selectedTheme, setSelectedTheme] = useState(THEME_PRESETS[0]);

  // Step 4 state (only for first-time setup)
  const [adminAccount, setAdminAccount] = useState<AdminAccount>({
    full_name: "",
    username: "",
    password: "",
    confirm_password: "",
  });

  const totalSteps = isNewProfile || isFromSignup ? 4 : 5; // 0-indexed: steps 0..3 or 0..4

  // Redirect if already set up (unless creating a new profile or from signup)
  useEffect(() => {
    if (isNewProfile || isFromSignup) return;
    const check = async () => {
      const res = await fetch("/api/business-config");
      const json = await res.json();
      if (json.success && json.config?.setup_completed) {
        // Use replace to avoid adding to browser history
        window.location.replace("/admin");
      }
    };
    check();
  }, [router, isNewProfile, isFromSignup]);

  // Pre-fill terminology whenever template changes
  useEffect(() => {
    setTerminology({
      product_name_singular: selectedTemplate.product_name_singular,
      product_name_plural: selectedTemplate.product_name_plural,
      category_label: selectedTemplate.category_label,
      subcategory_label: selectedTemplate.subcategory_label,
      variant_label: selectedTemplate.variant_label,
      seller_label: selectedTemplate.seller_label,
      identifier_label: selectedTemplate.identifier_label,
      order_prefix: selectedTemplate.order_prefix,
      primary_categories: selectedTemplate.primary_categories,
      use_condition_grades: selectedTemplate.use_condition_grades,
      use_battery_health: selectedTemplate.use_battery_health,
      enable_imei_check: selectedTemplate.enable_imei_check,
      enable_leads_module: selectedTemplate.enable_leads_module,
      enable_marketing_module: selectedTemplate.enable_marketing_module,
      enable_whatsapp_ai: selectedTemplate.enable_whatsapp_ai,
      gst_enabled: selectedTemplate.gst_enabled,
      gst_rate: selectedTemplate.gst_rate,
    });
    setStoreInfo((prev) => ({
      ...prev,
      tagline: prev.tagline || `Premium ${selectedTemplate.product_name_plural} — Quality Guaranteed`,
    }));
  }, [selectedTemplate]);

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation helpers
  // ─────────────────────────────────────────────────────────────────────────
  const canProceed = (): boolean => {
    if (step === 0) return true;
    if (step === 1) return storeInfo.store_name.trim().length > 0;
    if (step === 2) return true; // terminology — all optional
    if (step === 3) return true; // appearance
    if (step === 4) {            // admin account (first-time only)
      return (
        adminAccount.full_name.trim().length > 0 &&
        adminAccount.username.trim().length > 0 &&
        adminAccount.password.length >= 6 &&
        adminAccount.password === adminAccount.confirm_password
      );
    }
    return false;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Final submit
  // ─────────────────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    if (!canProceed()) return;
    setSaving(true);

    try {
      // Merge template with overridden terminology
      const configPayload = {
        ...selectedTemplate,
        ...terminology,
        display_name: storeInfo.store_name || selectedTemplate.name,
        setup_completed: true,
        setup_completed_at: new Date().toISOString(),
      };

      // For new profile or fresh signup: POST to /api/profiles (creates a new business_config row).
      // For a returning admin re-running setup: POST to /api/business-config (updates existing row).
      const configUrl = (isNewProfile || isFromSignup) ? "/api/profiles" : "/api/business-config";
      const configRes = await fetch(configUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configPayload),
      });
      const configJson = await configRes.json();
      if (!configRes.ok) throw new Error(configJson.error || "Failed to save business config");

      const newProfileId: string | undefined = (isNewProfile || isFromSignup)
        ? configJson.profile?.id
        : configJson.config?.id;

      // ── NEW: For signup flow, permanently link this admin_user ↔ business_config ──
      if (isFromSignup && newProfileId) {
        await fetch("/api/auth/link-profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile_id: newProfileId }),
        });
      }

      // Save store settings — pass profile_id so it writes to the correct tenant row
      const settingsRes = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...storeInfo,
          ...(newProfileId ? { profile_id: newProfileId } : {}),
          theme_config: {
            mode: "light",
            admin: { primaryColor: selectedTheme.primary, accentColor: selectedTheme.accent, sidebarStyle: "clean" },
            website: {
              primaryColor: selectedTheme.primary,
              secondaryColor: selectedTheme.accent,
              backgroundColor: "#ffffff",
              heroStyle: "gradient",
              cardStyle: "clean",
              enableNeonEffects: false,
              enableAnimatedOrbs: false,
              enableGlassmorphism: false,
              borderRadius: "lg",
              fontFamily: "geist",
            },
            preset: selectedTheme.id,
          },
          welcome_message: `Welcome to ${storeInfo.store_name}! How can we help you today?`,
          agent_name: `${storeInfo.store_name} Assistant`,
          ai_auto_reply: selectedTemplate.enable_whatsapp_ai,
        }),
      });
      if (!settingsRes.ok) {
        const settingsErr = await settingsRes.json().catch(() => ({}));
        throw new Error(settingsErr.error || `Failed to save settings (${settingsRes.status})`);
      }

      // Create admin user only on first-time setup (not from_signup, not new profile)
      if (!isNewProfile && !isFromSignup && adminAccount.username && adminAccount.password) {
        const adminRes = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: adminAccount.full_name,
            username: adminAccount.username,
            password: adminAccount.password,
            role: "super_admin",
            is_active: true,
          }),
        });
        if (!adminRes.ok) {
          const err = await adminRes.json();
          console.warn("Admin user creation warning:", err);
        }
      }

      // Switch the active_profile_id cookie to the newly created/updated profile
      if (newProfileId) {
        await fetch("/api/profiles/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile_id: newProfileId }),
        });
        
        // Wait a bit to ensure cookie is set on server
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success(isFromSignup ? "Your CRM is ready! Welcome aboard 🎉" : isNewProfile ? "New profile created! 🎉" : "Setup complete! Welcome to your CRM 🎉");
      
      // Mark setup as done in both sessionStorage and localStorage
      // This prevents the layout from ever redirecting back to setup
      if (newProfileId) {
        sessionStorage.setItem(`setup_done_${newProfileId}`, "1");
        localStorage.setItem(`setup_done_${newProfileId}`, "1");
      }

      // Use replace() so the setup page is removed from browser history.
      // This prevents the back button from returning to setup after completion.
      setTimeout(() => {
        window.location.replace("/admin?t=" + Date.now());
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start px-4 py-12">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-100 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100 rounded-full blur-3xl opacity-30 translate-y-1/3 -translate-x-1/4" />
      </div>

      {/* Header */}
      <div className="relative z-10 text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          {isFromSignup ? "Welcome! Let's set up your CRM" : isNewProfile ? "New Profile Setup" : "First-time Setup"}
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Set Up Your CRM</h1>
        <p className="text-slate-500 text-lg">Answer a few questions and your CRM will be ready in minutes.</p>
      </div>

      {/* Step Indicator */}
      <div className="relative z-10 w-full max-w-3xl">
        <Steps current={step} isNewProfile={isNewProfile} isFromSignup={isFromSignup} />

        {/* ─── Step 0: Business Type ─── */}
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">What kind of business do you run?</h2>
            <p className="text-slate-500 mb-6">Choose the template that best fits your business. You can customise everything later.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BUSINESS_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 bg-white ${
                    selectedTemplate.id === t.id
                      ? "border-violet-500 shadow-md shadow-violet-100"
                      : "border-slate-200 hover:border-violet-300 hover:shadow-sm"
                  }`}
                >
                  <div className="text-3xl mb-3">{t.icon}</div>
                  <div className="font-semibold text-sm text-slate-800 mb-1">{t.name}</div>
                  <div className="text-xs text-slate-500 leading-relaxed">{t.description}</div>
                  {selectedTemplate.id === t.id && (
                    <div className="mt-3">
                      <Badge className="bg-violet-600 text-white border-0 text-xs">Selected</Badge>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Template preview */}
            <div className="mt-6 p-5 rounded-2xl border border-slate-200 bg-white">
              <p className="text-sm text-slate-500 mb-3 font-medium">Preview: how terminology will appear in your CRM</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {[
                  ["Products called", selectedTemplate.product_name_plural],
                  [selectedTemplate.category_label, selectedTemplate.primary_categories.slice(0, 3).join(", ") + "…"],
                  ["ID / Tracking", selectedTemplate.identifier_label],
                  ["Order prefix", selectedTemplate.order_prefix + "YYMM####"],
                ].map(([label, val]) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-slate-400 text-xs mb-1">{label}</div>
                    <div className="font-semibold text-slate-800">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 1: Store Details ─── */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Tell us about your store</h2>
            <p className="text-slate-500 mb-6">This information will appear on your public website and invoices.</p>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 grid gap-5">
              {/* Logo */}
              <div>
                <Label className="text-slate-700">Store Logo URL</Label>
                <div className="mt-2 flex gap-3 items-center">
                  {storeInfo.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={storeInfo.logo_url} alt="logo" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                  )}
                  <Input
                    value={storeInfo.logo_url}
                    onChange={(e) => setStoreInfo((p) => ({ ...p, logo_url: e.target.value }))}
                    placeholder="Paste a logo image URL or upload via Settings later"
                    className="bg-white/5 border-gray-800 rounded-xl"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">You can upload a logo from Settings → Store Info after setup.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700">Store Name *</Label>
                  <div className="relative mt-1">
                    <Store className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      value={storeInfo.store_name}
                      onChange={(e) => setStoreInfo((p) => ({ ...p, store_name: e.target.value }))}
                      placeholder="e.g. QuickMobiles Delhi"
                      className="pl-9 border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-slate-700">Tagline</Label>
                  <Input
                    value={storeInfo.tagline}
                    onChange={(e) => setStoreInfo((p) => ({ ...p, tagline: e.target.value }))}
                    placeholder="e.g. Quality Phones at Best Prices"
                    className="mt-1 border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-700">Short Description</Label>
                <Textarea
                  value={storeInfo.description}
                  onChange={(e) => setStoreInfo((p) => ({ ...p, description: e.target.value }))}
                  placeholder="A brief description of your business for the website..."
                  rows={3}
                  className="mt-1 border-slate-200 rounded-xl resize-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700">Phone Number</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      value={storeInfo.phone}
                      onChange={(e) => setStoreInfo((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="pl-9 border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-slate-700">WhatsApp Number</Label>
                  <div className="relative mt-1">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      value={storeInfo.whatsapp_number}
                      onChange={(e) => setStoreInfo((p) => ({ ...p, whatsapp_number: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="pl-9 border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      value={storeInfo.email}
                      onChange={(e) => setStoreInfo((p) => ({ ...p, email: e.target.value }))}
                      placeholder="hello@yourstore.com"
                      className="pl-9 border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-slate-700">Website</Label>
                  <div className="relative mt-1">
                    <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      value={storeInfo.website}
                      onChange={(e) => setStoreInfo((p) => ({ ...p, website: e.target.value }))}
                      placeholder="https://yourstore.com"
                      className="pl-9 border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-slate-700">Store Address</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Textarea
                    value={storeInfo.address}
                    onChange={(e) => setStoreInfo((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Shop 12, Main Market, City - 110001"
                    rows={2}
                    className="pl-9 border-slate-200 rounded-xl resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: Customize Fields ─── */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Customize your fields &amp; features</h2>
            <p className="text-slate-500 mb-6">
              These defaults come from the <strong className="text-slate-800">{selectedTemplate.name}</strong> template. Adjust them to match your exact workflow.
            </p>

            {/* Terminology */}
            <div className="mb-4 p-5 rounded-2xl border border-slate-200 bg-white">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Terminology</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {([
                  ["product_name_singular", "Product (singular)", "e.g. Phone, Car, Book"],
                  ["product_name_plural",   "Product (plural)",   "e.g. Phones, Cars, Books"],
                  ["category_label",        "Category label",     "e.g. Brand, Make, Genre"],
                  ["subcategory_label",     "Sub-category label", "e.g. Model, Series"],
                  ["variant_label",         "Variant label",      "e.g. Color, Size, Edition"],
                  ["seller_label",          "Seller label",       "e.g. Seller, Supplier, Dealer"],
                  ["identifier_label",      "ID / tracking field","e.g. IMEI, VIN, ISBN"],
                  ["order_prefix",          "Order prefix",       "e.g. INV, ORD, SALE"],
                ] as [keyof BusinessTemplate, string, string][]).map(([key, label, placeholder]) => (
                  <div key={key}>
                    <Label className="text-xs text-slate-500">{label}</Label>
                    <Input
                      value={String(terminology[key] ?? "")}
                      onChange={(e) => setTerminology((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="mt-1 border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Label className="text-xs text-slate-500">Primary categories (comma-separated)</Label>
                <Textarea
                  value={(terminology.primary_categories ?? []).join(", ")}
                  onChange={(e) =>
                    setTerminology((p) => ({
                      ...p,
                      primary_categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    }))
                  }
                  placeholder="Apple, Samsung, Xiaomi, OnePlus"
                  rows={2}
                  className="mt-1 border-slate-200 rounded-xl text-sm resize-none"
                />
              </div>
            </div>

            {/* Feature toggles */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Features &amp; modules</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {([
                  ["use_condition_grades",      "Condition grades (A+, A, B…)"],
                  ["use_battery_health",         "Battery health tracking"],
                  ["enable_imei_check",          "IMEI / serial verification"],
                  ["enable_leads_module",        "Leads & enquiry module"],
                  ["enable_marketing_module",    "Marketing & campaigns"],
                  ["enable_whatsapp_ai",         "WhatsApp AI auto-reply"],
                  ["gst_enabled",                "GST billing"],
                ] as [keyof BusinessTemplate, string][]).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-3 py-1">
                    <Label className="text-sm text-slate-700 cursor-pointer" htmlFor={`toggle-${key}`}>
                      {label}
                    </Label>
                    <Switch
                      id={`toggle-${key}`}
                      checked={Boolean(terminology[key] ?? false)}
                      onCheckedChange={(val) => setTerminology((p) => ({ ...p, [key]: val }))}
                    />
                  </div>
                ))}
              </div>

              {terminology.gst_enabled && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <Label className="text-xs text-slate-500">GST rate (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={String(terminology.gst_rate ?? 18)}
                    onChange={(e) => setTerminology((p) => ({ ...p, gst_rate: Number(e.target.value) }))}
                    className="mt-1 w-32 border-slate-200 rounded-xl text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Step 3: Appearance ─── */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Choose your look</h2>
            <p className="text-slate-500 mb-6">Pick a colour preset. You can customise every detail later in Settings → Appearance.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedTheme(preset)}
                  className={`relative p-5 rounded-2xl border-2 transition-all duration-200 text-left bg-white ${
                    selectedTheme.id === preset.id
                      ? "border-violet-500 shadow-md shadow-violet-100"
                      : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full shadow-sm" style={{ background: preset.primary }} />
                    <div className="w-7 h-7 rounded-full shadow-sm" style={{ background: preset.accent }} />
                  </div>
                  <div className="text-sm font-semibold text-slate-700">{preset.name}</div>
                  {selectedTheme.id === preset.id && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="w-5 h-5 text-violet-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Live preview strip */}
            <div className="mt-6 p-5 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <p className="text-sm text-slate-500 mb-4">Preview</p>
              <div
                className="rounded-xl p-5"
                style={{ background: `linear-gradient(135deg, ${selectedTheme.primary}22, ${selectedTheme.accent}22)`, border: `1px solid ${selectedTheme.primary}44` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold" style={{ background: selectedTheme.primary }}>
                    {selectedTemplate.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{storeInfo.store_name || "Your Store Name"}</div>
                    <div className="text-xs" style={{ color: selectedTheme.primary }}>{storeInfo.tagline || "Your tagline here"}</div>
                  </div>
                </div>
                <div
                  className="text-xs text-white px-3 py-1.5 rounded-lg inline-block"
                  style={{ background: selectedTheme.primary }}
                >
                  Browse {selectedTemplate.product_name_plural}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 4: Admin Account ─── */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Create your admin account</h2>
            <p className="text-slate-500 mb-6">This will be the super-admin account. You can add more team members later.</p>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 grid gap-5">
              <div>
                <Label className="text-slate-700">Full Name *</Label>
                <Input
                  value={adminAccount.full_name}
                  onChange={(e) => setAdminAccount((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Rajesh Kumar"
                  className="mt-1 border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-slate-700">Username *</Label>
                <Input
                  value={adminAccount.username}
                  onChange={(e) => setAdminAccount((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, "") }))}
                  placeholder="admin"
                  className="mt-1 border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700">Password * (min 6 characters)</Label>
                  <Input
                    type="password"
                    value={adminAccount.password}
                    onChange={(e) => setAdminAccount((p) => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="mt-1 border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-slate-700">Confirm Password *</Label>
                  <Input
                    type="password"
                    value={adminAccount.confirm_password}
                    onChange={(e) => setAdminAccount((p) => ({ ...p, confirm_password: e.target.value }))}
                    placeholder="••••••••"
                    className={`mt-1 border-slate-200 rounded-xl ${
                      adminAccount.confirm_password && adminAccount.password !== adminAccount.confirm_password
                        ? "border-red-500"
                        : ""
                    }`}
                  />
                  {adminAccount.confirm_password && adminAccount.password !== adminAccount.confirm_password && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>
            </div>

            {/* Summary card */}
            <div className="mt-6 p-5 rounded-2xl border border-slate-200 bg-white">
              <p className="text-sm font-semibold mb-3 text-slate-700">Setup Summary</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Business Type", `${selectedTemplate.icon} ${selectedTemplate.name}`],
                  ["Store Name", storeInfo.store_name || "—"],
                  ["Products", selectedTemplate.product_name_plural],
                  ["Theme", selectedTheme.name],
                  ["Order Prefix", selectedTemplate.order_prefix],
                  ["GST", selectedTemplate.gst_enabled ? `${selectedTemplate.gst_rate}%` : "Disabled"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-slate-400">{k}: </span>
                      <span className="text-slate-800 font-medium">{v}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Navigation ─── */}
        <div className="flex justify-between items-center mt-8">
          <Button
            variant="ghost"
            className="text-slate-500 hover:text-slate-900"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {step < totalSteps - 1 ? (
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white px-8"
              onClick={handleFinish}
              disabled={!canProceed() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up…
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finish Setup
                </>
              )}
            </Button>
          )}
        </div>

        {/* Skip link — only for existing installs, not fresh signups */}
        {!isFromSignup && (
          <div className="text-center mt-4">
            <button
              onClick={() => window.location.replace("/admin")}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Skip — I already have an account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
// Suspense boundary required because SetupWizard calls useSearchParams
export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    }>
      <SetupWizard />
    </Suspense>
  );
}