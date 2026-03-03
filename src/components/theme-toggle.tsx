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
      <div
        className="fixed right-2.5 top-2.5 z-[60] h-[38px] w-[38px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] sm:right-3.5 sm:top-3.5 sm:h-[42px] sm:w-[42px]"
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      className="group fixed right-2.5 top-2.5 z-[60] flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text)] shadow-[var(--shadow)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:right-3.5 sm:top-3.5 sm:h-[42px] sm:w-[42px] sm:p-2.5"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Sun
          className="transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:rotate-45 group-hover:text-amber-400"
          size={20}
        />
      ) : (
        <Moon
          className="transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:rotate-[-15deg] group-hover:text-indigo-400"
          size={20}
        />
      )}
    </button>
  );
}
