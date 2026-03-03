"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="theme-toggle-placeholder" aria-hidden="true" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Sun className="icon-sun" size={20} />
      ) : (
        <Moon className="icon-moon" size={20} />
      )}
    </button>
  );
}
