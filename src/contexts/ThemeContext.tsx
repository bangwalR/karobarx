"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface AdminTheme { 
  primaryColor: string; 
  accentColor: string; 
  sidebarStyle: "glass" | "solid"; 
}

export interface WebsiteTheme { 
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
}

export interface ThemeConfig { 
  mode: "dark" | "light" | "system"; 
  admin: AdminTheme; 
  website: WebsiteTheme; 
  preset?: string; 
}

export interface ThemePreset { 
  id: string; 
  name: string; 
  slug: string; 
  description: string; 
  is_default: boolean; 
  is_custom: boolean; 
  theme_config: ThemeConfig; 
  preview_colors: string[]; 
}

export const defaultThemeConfig: ThemeConfig = { 
  mode: "light", 
  admin: { 
    primaryColor: "#7c3aed", 
    accentColor: "#06b6d4", 
    sidebarStyle: "solid" 
  }, 
  website: { 
    primaryColor: "#7c3aed", 
    secondaryColor: "#06b6d4", 
    backgroundColor: "#ffffff", 
    heroStyle: "solid", 
    cardStyle: "bordered", 
    enableNeonEffects: false, 
    enableAnimatedOrbs: false, 
    enableGlassmorphism: false, 
    borderRadius: "md", 
    fontFamily: "geist" 
  }, 
  preset: "white" 
};

interface ThemeContextType { 
  theme: ThemeConfig; 
  setTheme: (theme: ThemeConfig) => void; 
  updateTheme: (updates: Partial<ThemeConfig>) => void; 
  updateAdminTheme: (updates: Partial<AdminTheme>) => void; 
  updateWebsiteTheme: (updates: Partial<WebsiteTheme>) => void; 
  applyPreset: (preset: ThemePreset) => void; 
  presets: ThemePreset[]; 
  isLoading: boolean; 
  saveTheme: () => Promise<void>; 
  isDirty: boolean; 
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(defaultThemeConfig);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from settings on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings?.theme_config) {
            setTheme(data.settings.theme_config);
            applyThemeToDOM(data.settings.theme_config);
          } else {
            applyThemeToDOM(defaultThemeConfig);
          }
        } else {
          applyThemeToDOM(defaultThemeConfig);
        }
      } catch (error) {
        console.error("Failed to load theme:", error);
        applyThemeToDOM(defaultThemeConfig);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();

    // Re-apply theme whenever the appearance page saves it
    const handleThemeChange = () => { loadTheme(); };
    window.addEventListener("theme-updated", handleThemeChange);
    return () => window.removeEventListener("theme-updated", handleThemeChange);
  }, []);

  // Apply theme colors to DOM using CSS variables
  const applyThemeToDOM = (themeConfig: ThemeConfig) => {
    const root = document.documentElement;
    
    // Apply admin theme colors
    root.style.setProperty('--color-primary', themeConfig.admin.primaryColor);
    root.style.setProperty('--color-accent', themeConfig.admin.accentColor);
    
    // Convert hex to RGB for Tailwind opacity utilities
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result 
        ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
        : '124 58 237'; // fallback to violet
    };
    
    root.style.setProperty('--color-primary-rgb', hexToRgb(themeConfig.admin.primaryColor));
    root.style.setProperty('--color-accent-rgb', hexToRgb(themeConfig.admin.accentColor));
  };

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    const newTheme = { ...theme, ...updates };
    setTheme(newTheme);
    applyThemeToDOM(newTheme);
  };

  const updateAdminTheme = (updates: Partial<AdminTheme>) => {
    const newTheme = { ...theme, admin: { ...theme.admin, ...updates } };
    setTheme(newTheme);
    applyThemeToDOM(newTheme);
  };

  const updateWebsiteTheme = (updates: Partial<WebsiteTheme>) => {
    const newTheme = { ...theme, website: { ...theme.website, ...updates } };
    setTheme(newTheme);
    applyThemeToDOM(newTheme);
  };

  const applyPreset = (preset: ThemePreset) => {
    setTheme(preset.theme_config);
    applyThemeToDOM(preset.theme_config);
  };

  const saveTheme = async () => {
    // Save theme to settings
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme_config: theme }),
    });
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        setTheme: (newTheme) => {
          setTheme(newTheme);
          applyThemeToDOM(newTheme);
        }, 
        updateTheme, 
        updateAdminTheme, 
        updateWebsiteTheme, 
        applyPreset, 
        presets: [], 
        isLoading, 
        saveTheme, 
        isDirty: false 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { 
  const context = useContext(ThemeContext); 
  if (context === undefined) { 
    throw new Error("useTheme must be used within a ThemeProvider"); 
  } 
  return context; 
}

export function useThemeConfig(): ThemeConfig { 
  const context = useContext(ThemeContext); 
  return context?.theme ?? defaultThemeConfig; 
}
