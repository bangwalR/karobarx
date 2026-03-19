"use client";

import React, { createContext, useContext } from "react";

export interface AdminTheme { primaryColor: string; accentColor: string; sidebarStyle: "glass" | "solid"; }

export interface WebsiteTheme { primaryColor: string; secondaryColor: string; backgroundColor: string; heroStyle: "gradient" | "solid" | "image"; cardStyle: "glass" | "solid" | "bordered"; enableNeonEffects: boolean; enableAnimatedOrbs: boolean; enableGlassmorphism: boolean; borderRadius: "none" | "sm" | "md" | "lg" | "xl"; fontFamily: "geist" | "inter" | "poppins"; }

export interface ThemeConfig { mode: "dark" | "light" | "system"; admin: AdminTheme; website: WebsiteTheme; preset?: string; }

export interface ThemePreset { id: string; name: string; slug: string; description: string; is_default: boolean; is_custom: boolean; theme_config: ThemeConfig; preview_colors: string[]; }

export const defaultThemeConfig: ThemeConfig = { mode: "light", admin: { primaryColor: "#7c3aed", accentColor: "#06b6d4", sidebarStyle: "solid" }, website: { primaryColor: "#7c3aed", secondaryColor: "#06b6d4", backgroundColor: "#ffffff", heroStyle: "solid", cardStyle: "bordered", enableNeonEffects: false, enableAnimatedOrbs: false, enableGlassmorphism: false, borderRadius: "md", fontFamily: "geist" }, preset: "white" };

interface ThemeContextType { theme: ThemeConfig; setTheme: (theme: ThemeConfig) => void; updateTheme: (updates: Partial<ThemeConfig>) => void; updateAdminTheme: (updates: Partial<AdminTheme>) => void; updateWebsiteTheme: (updates: Partial<WebsiteTheme>) => void; applyPreset: (preset: ThemePreset) => void; presets: ThemePreset[]; isLoading: boolean; saveTheme: () => Promise<void>; isDirty: boolean; }

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const noop = async () => {};
  return (<ThemeContext.Provider value={{ theme: defaultThemeConfig, setTheme: () => {}, updateTheme: () => {}, updateAdminTheme: () => {}, updateWebsiteTheme: () => {}, applyPreset: () => {}, presets: [], isLoading: false, saveTheme: noop, isDirty: false }}>{children}</ThemeContext.Provider>);
}

export function useTheme() { const context = useContext(ThemeContext); if (context === undefined) { throw new Error("useTheme must be used within a ThemeProvider"); } return context; }

export function useThemeConfig(): ThemeConfig { const context = useContext(ThemeContext); return context?.theme ?? defaultThemeConfig; }
