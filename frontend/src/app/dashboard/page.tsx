"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

const ORG_ID = "33637a3b-c014-4917-8244-42145ac47bd0"; // TODO: ดึงจาก API จริง

interface Metric {
  id: string;
  serviceId: string;
  latency: number;
  status: string;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const isOk = status === "OK";
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        background: isOk ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
        color: isOk ? "var(--green)" : "var(--red)",
        border: `1px solid ${isOk ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
      }}>
      <span className="w-1.5 h-1.5 rounded-full"
        style={{ background: isOk ? "var(--green)" : "var(--red)" }}/>
      {status}
    </span>
  );
}

function LatencyBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value < 100 ? "var(--green)" : value < 300 ? "var(--yellow)" : "var(--red)";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}/>
      </div>
      <span className="text-xs font-mono w-14 text-right" style={{ color }}>
        {value}ms
      </span>
    </div>
  );
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl p-5 border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: color ?? "var(--foreground)" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [connected, setConnected] = useState(false);
  const [orgJoined, setOrgJoined] = useState(false);

  const avgLatency = metrics.length > 0
    ? Math.round(metrics.reduce((s, m) => s + m.latency, 0) / metrics.length)
    : 0;

  const errorCount = metrics.filter(m => m.status !== "OK").length;
  const maxLatency = metrics.length > 0 ? Math.max(...metrics.map(m => m.latency)) : 300;

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) { router.push("/login"); return; }

    const socket = io("http://localhost:3000/metrics", {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      // join org room
      socket.emit("join-org", { orgId: ORG_ID }, () => {
        setOrgJoined(true);
      });
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setOrgJoined(false);
    });

    // รับ real-time metric จาก Redis pub/sub
    socket.on("metric-update", (metric: Metric) => {
      setMetrics(prev => [metric, ...prev].slice(0, 50)); // เก็บแค่ 50 รายการล่าสุด
    });

    return () => { socket.disconnect(); };
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("accessToken");
    socketRef.current?.disconnect();
    router.push("/login");
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>

      {/* Navbar */}
      <nav className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{
          background: "rgba(10,15,30,0.8)",
          borderColor: "var(--border)",
          backdropFilter: "blur(12px)",
        }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)", boxShadow: "0 0 16px rgba(59,130,246,0.4)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h4l3-8 4 16 3-8h4" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold">
            SaaS<span style={{ color: "var(--accent)" }}>Monitor</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* connection status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              background: connected ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${connected ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
              color: connected ? "var(--green)" : "var(--red)",
            }}>
            <span className="w-1.5 h-1.5 rounded-full"
              style={{
                background: connected ? "var(--green)" : "var(--red)",
                animation: connected ? "pulse-glow 2s infinite" : "none",
              }}/>
            {connected ? (orgJoined ? "Live" : "Joining...") : "Disconnected"}
          </div>

          <button onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
            Overview
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Real-time metrics from your services
          </p>
        </div>

        {/* stat cards */}
        <div className="grid grid-cols-2 gap-4 mb-8 animate-fade-in"
          style={{ animationDelay: "0.1s" }}>
          <StatCard
            label="Total Events"
            value={metrics.length}
            sub="since connected"
          />
          <StatCard
            label="Avg Latency"
            value={`${avgLatency}ms`}
            sub="across all services"
            color={avgLatency < 100 ? "var(--green)" : avgLatency < 300 ? "var(--yellow)" : "var(--red)"}
          />
          <StatCard
            label="Errors"
            value={errorCount}
            sub="non-OK status"
            color={errorCount > 0 ? "var(--red)" : "var(--green)"}
          />
          <StatCard
            label="Peak Latency"
            value={`${maxLatency}ms`}
            sub="highest recorded"
            color={maxLatency < 200 ? "var(--green)" : "var(--yellow)"}
          />
        </div>

        {/* metrics feed */}
        <div className="rounded-2xl border overflow-hidden animate-fade-in"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            animationDelay: "0.2s",
          }}>

          {/* table header */}
          <div className="px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold text-sm">Live Metrics Feed</h2>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {metrics.length} events
            </span>
          </div>

          {metrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20"
              style={{ color: "var(--muted)" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mb-4 opacity-30">
                <path d="M3 12h4l3-8 4 16 3-8h4" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-sm">Waiting for metrics...</p>
              <p className="text-xs mt-1 opacity-60">
                {connected ? "Send a metric via WebSocket to see it here" : "Connecting to WebSocket..."}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {/* column headers */}
              <div className="grid grid-cols-4 px-6 py-3 text-xs uppercase tracking-wider"
                style={{ color: "var(--muted)", background: "var(--surface-2)" }}>
                <span>Service ID</span>
                <span>Status</span>
                <span>Latency</span>
                <span>Time</span>
              </div>

              {metrics.map((m, i) => (
                <div key={m.id}
                  className="grid grid-cols-4 px-6 py-4 items-center animate-slide-in hover:bg-white/5 transition-colors"
                  style={{ animationDelay: `${i * 0.03}s` }}>

                  <span className="text-xs font-mono truncate pr-4"
                    style={{ color: "var(--muted)" }}>
                    {m.serviceId.slice(0, 8)}...
                  </span>

                  <StatusBadge status={m.status} />

                  <LatencyBar value={m.latency} max={Math.max(maxLatency, 300)} />

                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
