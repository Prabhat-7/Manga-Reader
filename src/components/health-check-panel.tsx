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
    <section className="rounded-[18px] border border-border bg-card p-6 shadow-md">
      <h2 className="mb-2 mt-0 text-[1.15rem] font-semibold text-card-foreground">
        FastAPI smoke test
      </h2>
      <p className="m-0 leading-relaxed text-muted-foreground">
        Call any FastAPI endpoint through Next.js proxy.
      </p>
      <div className="mt-3 grid items-center gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={endpoint}
          onChange={(event) => setEndpoint(event.target.value)}
          placeholder="/health"
          className="w-full rounded-[10px] border border-border bg-background px-3 py-[11px] font-mono text-[0.95rem] text-foreground outline-none transition focus:border-primary"
        />
        <button
          type="button"
          onClick={runHealthCheck}
          disabled={loading}
          className="rounded-[10px] bg-primary px-[14px] py-[11px] font-mono font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Checking..." : "Call endpoint"}
        </button>
      </div>
      <pre className="mt-4 min-h-[140px] overflow-auto rounded-[10px] bg-muted p-3 font-mono text-[0.85rem] text-muted-foreground">
        {result || "Result will appear here."}
      </pre>
    </section>
  );
}
