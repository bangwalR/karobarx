"use client";

import { useState, useEffect } from "react";
import { Palette, Save, Loader2, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ColorPicker } from "@/components/ui/color-picker";

interface ThemeConfig {
  mode: "dark" | "light" | "system";
  admin: {
    primaryColor: string;
    accentColor: string;
    sidebarStyle: "glass" | "solid";
  };
  website: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    heroStyle: "gradient" | "solid" | "image";
    cardStyle: "glass" | "solid" | "bordered";
    enableNeonEffects: boolean;
    enableAnimatedOrbs: boolean;
    enableGlassmorphism: boolean;
    borderRadius: "none" | "sm" | "md" | "lg" | "xl";
    fontFamily: "geist" | "inter" | "poppins";
  };
  preset?: string;
}

const DEFAULT_THEME: ThemeConfig = {
  mode: "light",
  admin: { primaryColor: "#7c3aed", accentColor: "#06b6d4", sidebarStyle: "solid" },
  website: {
    primaryColor: "#7c3aed",
    secondaryColor: "#06b6d4",
    backgroundColor: "#ffffff",
    heroStyle: "gradient",
    cardStyle: "bordered",
    enableNeonEffects: false,
    enableAnimatedOrbs: false,
    enableGlassmorphism: false,
    borderRadius: "lg",
    fontFamily: "geist",
  },
};

const PRESETS = [
  { id: "violet",   name: "Violet",       primary: "#7c3aed", accent: "#06b6d4" },
  { id: "blue",     name: "Ocean Blue",   primary: "#3b82f6", accent: "#8b5cf6" },
  { id: "green",    name: "Forest",       primary: "#22c55e", accent: "#06b6d4" },
  { id: "purple",   name: "Royal Purple", primary: "#a855f7", accent: "#ec4899" },
  { id: "red",      name: "Crimson",      primary: "#ef4444", accent: "#f97316" },
  { id: "orange",   name: "Neon Orange",  primary: "#f97316", accent: "#06b6d4" },
  { id: "pink",     name: "Rose",         primary: "#ec4899", accent: "#8b5cf6" },
  { id: "slate",    name: "Minimal",      primary: "#475569", accent: "#94a3b8" },
];

function applyThemeToDOM(theme: ThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.admin.primaryColor);
  root.style.setProperty("--color-accent", theme.admin.accentColor);
  const hexToRgb = (hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1], 16)} ${parseInt(r[2], 16)} ${parseInt(r[3], 16)}` : "124 58 237";
  };
  root.style.setProperty("--color-primary-rgb", hexToRgb(theme.admin.primaryColor));
  root.style.setProperty("--color-accent-rgb", hexToRgb(theme.admin.accentColor));
}

export default function AppearancePage() {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.settings?.theme_config) {
          setTheme(data.settings.theme_config);
          applyThemeToDOM(data.settings.theme_config);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateAdmin = (key: keyof ThemeConfig["admin"], value: string) => {
    const updated = { ...theme, admin: { ...theme.admin, [key]: value } };
    setTheme(updated);
    applyThemeToDOM(updated);
  };

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    const updated: ThemeConfig = {
      ...theme,
      preset: preset.id,
      admin: { ...theme.admin, primaryColor: preset.primary, accentColor: preset.accent },
      website: { ...theme.website, primaryColor: preset.primary, secondaryColor: preset.accent },
    };
    setTheme(updated);
    applyThemeToDOM(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_config: theme }),
      });

      if (res.status === 401) {
        await fetch("/api/profiles/init", { method: "POST" });
        res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme_config: theme }),
        });
      }

      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) {
        throw new Error(result?.error || "Failed to save appearance");
      }

      toast.success("Appearance saved!");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // Notify ThemeContext to reload across the app
      window.dispatchEvent(new Event("theme-updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save appearance");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTheme(DEFAULT_THEME);
    applyThemeToDOM(DEFAULT_THEME);
    toast.success("Reset to defaults");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Palette className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Appearance</h1>
            <p className="text-sm text-slate-500">Customise your admin panel colours and style</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Reset
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Colour Presets */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Colour Presets</h2>
        <p className="text-sm text-slate-500 mb-4">Pick a preset to apply instantly, or customise below</p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {PRESETS.map((p) => {
            const active = theme.preset === p.id || (theme.admin.primaryColor === p.primary && theme.admin.accentColor === p.accent);
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                title={p.name}
                className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                  active ? "border-slate-900 shadow-md" : "border-transparent hover:border-slate-200"
                }`}
              >
                <div className="flex gap-1">
                  <div className="w-5 h-5 rounded-full shadow-sm" style={{ background: p.primary }} />
                  <div className="w-5 h-5 rounded-full shadow-sm" style={{ background: p.accent }} />
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-tight text-center">{p.name}</span>
                {active && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-slate-900 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Colours */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Custom Colours</h2>
        <p className="text-sm text-slate-500 mb-6">Fine-tune your exact brand colours</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Primary Colour</label>
            <ColorPicker
              color={theme.admin.primaryColor}
              onChange={(c) => updateAdmin("primaryColor", c)}
              label="Primary"
            />
            <p className="text-xs text-slate-400 mt-1">Used for buttons, active nav, badges</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Accent Colour</label>
            <ColorPicker
              color={theme.admin.accentColor}
              onChange={(c) => updateAdmin("accentColor", c)}
              label="Accent"
            />
            <p className="text-xs text-slate-400 mt-1">Used for highlights and secondary elements</p>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Live Preview</h2>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {/* Mock sidebar */}
          <div className="flex h-40">
            <div className="w-36 flex flex-col p-3 gap-1.5" style={{ background: theme.admin.primaryColor + "10", borderRight: `1px solid ${theme.admin.primaryColor}20` }}>
              {["Dashboard", "Inventory", "Customers", "Orders"].map((item, i) => (
                <div
                  key={item}
                  className="px-2 py-1 rounded-lg text-xs font-medium"
                  style={
                    i === 0
                      ? { background: theme.admin.primaryColor, color: "#fff" }
                      : { color: "#64748b" }
                  }
                >
                  {item}
                </div>
              ))}
            </div>
            {/* Mock content */}
            <div className="flex-1 p-4 bg-slate-50">
              <div className="flex gap-2 mb-3">
                {[theme.admin.primaryColor, theme.admin.accentColor, "#f1f5f9"].map((c, i) => (
                  <div key={i} className="flex-1 h-10 rounded-lg" style={{ background: c, opacity: i === 2 ? 1 : 0.9 }} />
                ))}
              </div>
              <div className="space-y-1.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-3 rounded bg-slate-200" style={{ width: `${90 - i * 15}%` }} />
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <div className="px-3 py-1 rounded-lg text-xs text-white font-medium" style={{ background: theme.admin.primaryColor }}>
                  Save
                </div>
                <div className="px-3 py-1 rounded-lg text-xs font-medium border" style={{ color: theme.admin.accentColor, borderColor: theme.admin.accentColor + "50" }}>
                  Cancel
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">Changes apply immediately to the admin panel. Click Save to persist.</p>
      </div>
    </div>
  );
}
