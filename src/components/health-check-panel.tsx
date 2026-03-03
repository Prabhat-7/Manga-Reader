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
    <section className="panel">
      <h2>FastAPI smoke test</h2>
      <p>Call any FastAPI endpoint through Next.js proxy.</p>
      <div className="row">
        <input
          value={endpoint}
          onChange={(event) => setEndpoint(event.target.value)}
          placeholder="/health"
        />
        <button type="button" onClick={runHealthCheck} disabled={loading}>
          {loading ? "Checking..." : "Call endpoint"}
        </button>
      </div>
      <pre>{result || "Result will appear here."}</pre>
    </section>
  );
}
