"use client";

import { useState } from "react";

import { ApiError, apiFetch } from "@/lib/fastapi-client";

export function HealthCheckPanel() {
  const [endpoint, setEndpoint] = useState("/health");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const runHealthCheck = async () => {
    setLoading(true);
    setResult("");

    try {
      const payload = await apiFetch<unknown>(endpoint, {
        method: "GET",
        cache: "no-store",
      });
      setResult(JSON.stringify(payload, null, 2));
    } catch (error) {
      if (error instanceof ApiError) {
        setResult(
          JSON.stringify(
            { message: error.message, status: error.status, data: error.data },
            null,
            2,
          ),
        );
      } else if (error instanceof Error) {
        setResult(error.message);
      } else {
        setResult("Unknown error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
      <h2 className="mb-2 mt-0 text-[1.15rem] font-semibold text-[var(--text)]">
        FastAPI smoke test
      </h2>
      <p className="m-0 leading-relaxed text-[var(--muted)]">
        Call any FastAPI endpoint through Next.js proxy.
      </p>
      <div className="mt-3 grid items-center gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={endpoint}
          onChange={(event) => setEndpoint(event.target.value)}
          placeholder="/health"
          className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-[11px] font-mono text-[0.95rem] text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
        />
        <button
          type="button"
          onClick={runHealthCheck}
          disabled={loading}
          className="rounded-[10px] bg-[var(--primary)] px-[14px] py-[11px] font-mono font-bold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Checking..." : "Call endpoint"}
        </button>
      </div>
      <pre className="mt-4 min-h-[140px] overflow-auto rounded-[10px] bg-[var(--code-bg)] p-3 font-mono text-[0.85rem] text-[var(--code-text)]">
        {result || "Result will appear here."}
      </pre>
    </section>
  );
}
