"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Falsches Passwort");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-lg font-semibold text-gray-900 mb-0.5">
          AI Supply Hub
        </h1>
        <p className="text-xs text-gray-400 mb-6">Sportstech PMO — Intern</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="••••••••"
              autoFocus
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || password.length === 0}
            className="w-full bg-[#111] text-white text-sm py-2 rounded hover:bg-[#222] transition-colors disabled:opacity-40"
          >
            {loading ? "Anmelden…" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
