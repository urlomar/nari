import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "nari-theme";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/**
 * Wraps the app so any component can read/toggle the theme. Every new
 * visitor defaults to dark (per Nya) regardless of OS `prefers-color-scheme`
 * — the blocking inline script in index.html sets data-theme="dark" unless
 * localStorage already holds an explicit prior "light" toggle, and React
 * never runs before that script does, so the initial DOM read here always
 * matches what the script already decided.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private-mode/unavailable localStorage — toggle still works for the
      // session, it just won't persist across reloads.
    }
  }, [theme]);

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    const applyNext = () => setTheme(next);
    // View Transitions API gives a smooth wipe/fade between themes; browsers
    // without support (no document.startViewTransition) just apply the swap
    // instantly — never gate the toggle itself on support existing.
    if (typeof document.startViewTransition === "function") {
      document.startViewTransition(applyNext);
    } else {
      applyNext();
    }
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
