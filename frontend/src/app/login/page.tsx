"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        console.log(e);
        
        try {
            const res = await axios.post("http://localhost:3000/auth/login", {
                email,
                password,
            });
            console.log(res);

            const { accessToken } = res.data;
            localStorage.setItem("accessToken", accessToken);
            router.push("/dashboard");
        } catch (error) {
            console.log(error);
            setError("Invalid email or password");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-4"
            style={{ background: "var(--background)" }}>

            {/* background grid */}
            <div className="fixed inset-0 pointer-events-none"
                style={{
                    backgroundImage: "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 60%)",
                }}
            />

            <div className="w-full max-w-md animate-fade-in">
                {/* logo */}
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: "var(--accent)", boxShadow: "0 0 20px rgba(59,130,246,0.4)" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M3 12h4l3-8 4 16 3-8h4" stroke="white" strokeWidth="2.5"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="text-xl font-semibold tracking-tight"
                        style={{ color: "var(--foreground)" }}>
                        SaaS<span style={{ color: "var(--accent)" }}>Monitor</span>
                    </span>
                </div>

                {/* card */}
                <div className="rounded-2xl p-8 border"
                    style={{
                        background: "var(--surface)",
                        borderColor: "var(--border)",
                        boxShadow: "0 0 40px rgba(0,0,0,0.4)",
                    }}>

                    <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
                        Welcome back
                    </h1>
                    <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
                        Sign in to your monitoring dashboard
                    </p>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* email */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium uppercase tracking-wider"
                                style={{ color: "var(--muted)" }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                required
                                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                                style={{
                                    background: "var(--surface-2)",
                                    border: "1px solid var(--border)",
                                    color: "var(--foreground)",
                                }}
                                onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                            />
                        </div>

                        {/* password */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium uppercase tracking-wider"
                                style={{ color: "var(--muted)" }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                                style={{
                                    background: "var(--surface-2)",
                                    border: "1px solid var(--border)",
                                    color: "var(--foreground)",
                                }}
                                onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                            />
                        </div>

                        {/* error */}
                        {error && (
                            <div className="px-4 py-3 rounded-xl text-sm"
                                style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                {error}
                            </div>
                        )}

                        {/* submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl text-sm font-semibold mt-2 transition-all cursor-pointer disabled:opacity-60"
                            style={{
                                background: "var(--accent)",
                                color: "white",
                                boxShadow: "0 0 20px rgba(59,130,246,0.3)",
                            }}
                            onMouseEnter={(e) => (e.target as HTMLButtonElement).style.boxShadow = "0 0 30px rgba(59,130,246,0.5)"}
                            onMouseLeave={(e) => (e.target as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(59,130,246,0.3)"}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : "Sign in"}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs mt-6" style={{ color: "var(--muted)" }}>
                    Real-time infrastructure monitoring
                </p>
            </div>
        </main>
    );
}
