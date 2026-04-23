"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BusinessTemplate, getTemplateByType } from "@/lib/business-templates";

// ─── Types ────────────────────────────────────────────────────────────────────

// The shape that comes back from the DB (mirrors migration columns)
export interface BusinessConfig extends Omit<BusinessTemplate, 'id'> {
  /** DB row UUID — undefined when using in-memory template default */
  id?: string;
  display_name?: string;
  setup_completed?: boolean;
  setup_completed_at?: string;
  about_story?: string;
  about_founding_year?: string;
  about_location?: string;
  faqs: { question: string; answer: string }[];
  created_at?: string;
  updated_at?: string;
}

export interface ProfileSummary {
  id: string;
  business_type: string;
  display_name: string;
  product_name_singular: string;
  product_name_plural: string;
  order_prefix: string;
  setup_completed: boolean;
  created_at: string;
}

interface BusinessContextValue {
  config: BusinessConfig;
  profiles: ProfileSummary[];
  isLoading: boolean;
  isSetupComplete: boolean;
  refreshConfig: () => Promise<void>;
  updateConfig: (updates: Partial<BusinessConfig>) => Promise<boolean>;
  switchProfile: (profileId: string) => Promise<void>;
}

const defaultConfig: BusinessConfig = getTemplateByType("mobile_phones") as BusinessConfig;

const BusinessContext = createContext<BusinessContextValue>({
  config: defaultConfig,
  profiles: [],
  isLoading: true,
  isSetupComplete: true,
  refreshConfig: async () => {},
  updateConfig: async () => false,
  switchProfile: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<BusinessConfig>(defaultConfig);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  
  // Use searchParams safely - wrap in try-catch for SSR/build compatibility
  let searchParams: ReturnType<typeof useSearchParams> | null = null;
  try {
    searchParams = useSearchParams();
  } catch {
    // During build/SSR, useSearchParams might not be available
    searchParams = null;
  }

  // Fetch the active profile config (server reads active_profile_id cookie)
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/business-config");
      const json = await res.json();
      if (json.success && json.config) {
        setConfig(json.config as BusinessConfig);
      }
    } catch (err) {
      console.error("Failed to load business config:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch all profiles for the switcher dropdown
  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/profiles");
      const json = await res.json();
      if (json.success) setProfiles(json.profiles);
    } catch {/* silent */}
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchProfiles();
  }, [fetchConfig, fetchProfiles]);

  // Listen for profile changes (e.g., after setup completion)
  // This ensures fresh data is loaded when returning from setup
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh config when tab becomes visible
        fetchConfig();
        fetchProfiles();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchConfig, fetchProfiles]);

  // Refresh when URL changes (e.g., cache-busting timestamp from setup)
  useEffect(() => {
    const timestamp = searchParams?.get('t');
    if (timestamp && pathname === '/admin') {
      // Force refresh when coming from setup with timestamp
      setIsLoading(true);
      fetchConfig();
      fetchProfiles();
    }
  }, [pathname, searchParams, fetchConfig, fetchProfiles]);

  const updateConfig = useCallback(async (updates: Partial<BusinessConfig>): Promise<boolean> => {
    try {
      const res = await fetch("/api/business-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, ...updates }),
      });
      const json = await res.json();
      if (json.success) {
        setConfig(json.config as BusinessConfig);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to update business config:", err);
      return false;
    }
  }, [config]);

  const switchProfile = useCallback(async (profileId: string) => {
    const res = await fetch("/api/profiles/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId }),
    });
    if (res.ok) {
      setIsLoading(true);
      await fetchConfig();
      await fetchProfiles();
    }
  }, [fetchConfig, fetchProfiles]);

  const isSetupComplete = config.setup_completed ?? false;

  return (
    <BusinessContext.Provider value={{
      config, profiles, isLoading, isSetupComplete,
      refreshConfig: fetchConfig,
      updateConfig,
      switchProfile,
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessConfig() {
  return useContext(BusinessContext);
}

// Convenience hook – returns only the config object
export function useBusiness() {
  return useContext(BusinessContext).config;
}
