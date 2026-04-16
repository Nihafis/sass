"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

const BASE = "http://localhost:3000";

interface Org {
  id: string;
  name: string;
  createdAt: string;
  role: string;
  _count: { memberships: number; services: number };
}

interface Alert {
  type: string;
  serviceId: string;
  latency: number;
  threshold: number;
  timestamp: string;
}

// alerts แยกต่างหากต่อ orgId
type AlertMap = Record<string, Alert[]>;

export default function OrganizationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [alerts, setAlerts] = useState<AlertMap>({});
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const socketsRef = useRef<Record<string, Socket>>({});

  // ── fetch orgs ──────────────────────────────────────────────
  async function fetchOrgs(token: string) {
    const res = await fetch(`${BASE}/organizations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setOrgs(data);
    return data as Org[];
  }

  // ── connect socket per org ──────────────────────────────────
  function connectOrgSocket(token: string, orgId: string) {
    if (socketsRef.current[orgId]) return; // ไม่ connect ซ้ำ

    const socket = io(`${BASE}/metrics`, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("join-org", { orgId });
    });

    socket.on("alert", (alert: Alert) => {
      setAlerts((prev) => ({
        ...prev,
        [orgId]: [alert, ...(prev[orgId] ?? [])].slice(0, 20),
      }));
    });

    socketsRef.current[orgId] = socket;
  }

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) { router.push("/login"); return; }

    fetchOrgs(token).then((data) => {
      // connect socket ทุก org ที่ user อยู่
      data.forEach((org) => connectOrgSocket(token, org.id));
    });

    return () => {
      // disconnect ทั้งหมดเมื่อออกจากหน้า
      Object.values(socketsRef.current).forEach((s) => s.disconnect());
    };
  }, [router]);

  // ── create org ──────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    const token = localStorage.getItem("accessToken")!;
    setCreating(true);
    try {
      const res = await fetch(`${BASE}/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });
      const org = await res.json();
      setOrgs((prev) => [org, ...prev]);
      connectOrgSocket(token, org.id);
      setNewOrgName("");
    } finally {
      setCreating(false);
    }
  }

  // ── delete org ──────────────────────────────────────────────
  async function handleDelete(orgId: string) {
    if (!confirm("ลบ Organization นี้?")) return;
    const token = localStorage.getItem("accessToken")!;
    await fetch(`${BASE}/organizations/${orgId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    socketsRef.current[orgId]?.disconnect();
    delete socketsRef.current[orgId];
    setOrgs((prev) => prev.filter((o) => o.id !== orgId));
    setAlerts((prev) => { const next = { ...prev }; delete next[orgId]; return next; });
    if (selectedOrg === orgId) setSelectedOrg(null);
  }

  const selectedAlerts = selectedOrg ? (alerts[selectedOrg] ?? []) : [];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>

      {/* Navbar */}
      <nav className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ background: "rgba(10,15,30,0.8)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h4l3-8 4 16 3-8h4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold">SaaS<span style={{ color: "var(--accent)" }}>Monitor</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")}
            className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
            style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
            Dashboard
          </button>
          <button onClick={() => { localStorage.removeItem("accessToken"); router.push("/login"); }}
            className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
            style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Organizations</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Manage your organizations and monitor alerts</p>
        </div>

        {/* Create form */}
        <form onSubmit={handleCreate} className="flex gap-3 mb-8">
          <input
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="Organization name..."
            className="flex-1 px-4 py-2 rounded-lg text-sm outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
          <button type="submit" disabled={creating}
            className="px-5 py-2 rounded-lg text-sm font-medium cursor-pointer transition-opacity"
            style={{ background: "var(--accent)", color: "white", opacity: creating ? 0.6 : 1 }}>
            {creating ? "Creating..." : "+ Create"}
          </button>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Org list */}
          <div className="space-y-3">
            {orgs.length === 0 && (
              <div className="rounded-xl p-8 text-center border"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--muted)" }}>
                No organizations yet
              </div>
            )}
            {orgs.map((org) => {
              const orgAlerts = alerts[org.id] ?? [];
              const isSelected = selectedOrg === org.id;
              return (
                <div key={org.id} onClick={() => setSelectedOrg(isSelected ? null : org.id)}
                  className="rounded-xl p-5 border cursor-pointer transition-all"
                  style={{
                    background: "var(--surface)",
                    borderColor: isSelected ? "var(--accent)" : orgAlerts.length > 0 ? "rgba(239,68,68,0.4)" : "var(--border)",
                  }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{org.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                          {org.role}
                        </span>
                        {orgAlerts.length > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "rgba(239,68,68,0.15)", color: "var(--red)" }}>
                            ⚠ {orgAlerts.length} alert{orgAlerts.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 text-xs mt-2" style={{ color: "var(--muted)" }}>
                        <span>{org._count?.memberships ?? 0} members</span>
                        <span>{org._count?.services ?? 0} services</span>
                        <span>{new Date(org.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {org.role === "OWNER" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(org.id); }}
                        className="text-xs px-2 py-1 rounded cursor-pointer transition-colors"
                        style={{ color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)" }}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alert feed per org */}
          <div className="rounded-xl border overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}>
              <div>
                <h2 className="font-semibold text-sm">Alert Feed</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {selectedOrg
                    ? `${orgs.find((o) => o.id === selectedOrg)?.name} — ${selectedAlerts.length} alerts`
                    : "Click an organization to view alerts"}
                </p>
              </div>
              {selectedOrg && selectedAlerts.length > 0 && (
                <button onClick={() => setAlerts((prev) => ({ ...prev, [selectedOrg]: [] }))}
                  className="text-xs px-2 py-1 rounded cursor-pointer"
                  style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
                  Clear
                </button>
              )}
            </div>

            {!selectedOrg ? (
              <div className="flex items-center justify-center py-16"
                style={{ color: "var(--muted)" }}>
                <p className="text-sm">← Select an organization</p>
              </div>
            ) : selectedAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16"
                style={{ color: "var(--muted)" }}>
                <p className="text-sm">No alerts</p>
                <p className="text-xs mt-1 opacity-60">Listening for high latency events...</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {selectedAlerts.map((a, i) => (
                  <div key={i} className="px-5 py-4 animate-slide-in">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: "var(--red)" }}>
                        ⚠ {a.type.replace("_", " ")}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        {new Date(a.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs mt-1" style={{ color: "var(--muted)" }}>
                      <span className="font-mono">{a.serviceId.slice(0, 8)}...</span>
                      <span style={{ color: "var(--red)" }}>{a.latency}ms</span>
                      <span>threshold: {a.threshold}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}