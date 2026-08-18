"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { StoreConfig } from "@/lib/stores/config";

interface ThemeContextType {
  store: StoreConfig;
  theme: StoreConfig["theme"];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within StoreProvider");
  }
  return context;
}

interface StoreProviderProps {
  store: StoreConfig;
  children: React.ReactNode;
}

export function StoreProvider({ store, children }: StoreProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply theme CSS variables to root
  useEffect(() => {
    if (!mounted) return;

    const t = store.theme;
    const root = document.documentElement;

    // Background
    root.style.setProperty("--bg-primary", t.background);
    root.style.setProperty("--bg-secondary", t.backgroundAlt);
    root.style.setProperty("--bg-surface", t.surface);
    root.style.setProperty("--bg-surface-hover", t.surfaceHover);

    // Primary
    root.style.setProperty("--color-primary", t.primary);
    root.style.setProperty("--color-primary-hover", t.primaryHover);
    root.style.setProperty("--color-primary-muted", t.primaryMuted);

    // Secondary & Accent
    root.style.setProperty("--color-secondary", t.secondary);
    root.style.setProperty("--color-accent", t.accent);

    // Text
    root.style.setProperty("--text-primary", t.text);
    root.style.setProperty("--text-secondary", t.textSecondary);
    root.style.setProperty("--text-muted", t.textMuted);
    root.style.setProperty("--text-inverse", t.textInverse);

    // Border
    root.style.setProperty("--border-color", t.border);
    root.style.setProperty("--border-hover", t.borderHover);

    // Effects
    root.style.setProperty("--glow-color", t.glow);
    root.style.setProperty("--overlay-color", t.overlay);

    // Gradients
    root.style.setProperty("--gradient-start", t.gradientStart);
    root.style.setProperty("--gradient-end", t.gradientEnd);
    root.style.setProperty("--gradient-accent", t.gradientAccent);

    // Shadows
    root.style.setProperty("--shadow-sm", t.shadowSm);
    root.style.setProperty("--shadow-md", t.shadowMd);
    root.style.setProperty("--shadow-lg", t.shadowLg);
    root.style.setProperty("--shadow-glow", t.shadowGlow);

    // Set body background
    document.body.style.background = t.background;
    document.body.style.color = t.text;

    return () => {
      root.style.removeProperty("--bg-primary");
      root.style.removeProperty("--color-primary");
    };
  }, [store, mounted]);

  if (!mounted) {
    return (
      <div style={{ background: store.theme.background, minHeight: "100vh" }}>
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ store, theme: store.theme }}>
      <div
        className="min-h-screen transition-colors duration-500"
        style={{ background: store.theme.background, color: store.theme.text }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
