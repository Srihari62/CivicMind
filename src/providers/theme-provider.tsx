/**
 * @file src/providers/theme-provider.tsx
 * @description Theme context provider for Light, Dark, and System modes.
 * Applies visual theme classes to the document root element, manages localStorage,
 * and responds to system theme media query shifts.
 */

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "civicmind-theme",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Access localStorage on client mount
    const savedTheme = localStorage.getItem(storageKey) as Theme | null;
    if (savedTheme) {
      setThemeState(savedTheme);
    }
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (currentTheme: Theme) => {
      root.classList.remove("light", "dark");

      let resolved: "light" | "dark" = "light";
      if (currentTheme === "system") {
        resolved = mediaQuery.matches ? "dark" : "light";
      } else {
        resolved = currentTheme;
      }

      root.classList.add(resolved);
      setResolvedTheme(resolved);
    };

    applyTheme(theme);

    // Event listener for real-time operating system theme toggles
    const handleSystemThemeChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [theme]);

  const setTheme = (nextTheme: Theme) => {
    localStorage.setItem(storageKey, nextTheme);
    setThemeState(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Custom hook to consume the ThemeContext safely.
 */
export const useTheme = () => useContext(ThemeContext);
