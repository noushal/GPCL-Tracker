"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { useProfile } from "@/lib/useProfile";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

// Compulsory, non-dismissible: no close button, no backdrop click handler,
// no Escape handling. The only way out is a valid, unique username.
export default function UsernameGate() {
  const { isAuthed, session } = useSession();
  const { profile, loading, refresh } = useProfile();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading || !isAuthed || profile?.username) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!USERNAME_RE.test(trimmed)) {
      setError("3-20 characters — letters, numbers, underscore only.");
      return;
    }

    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert({ id: session.user.id, username: trimmed });
    setSaving(false);

    if (error) {
      setError(error.code === "23505" ? "That username is already taken." : error.message);
      return;
    }
    refresh();
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-neutral-800 rounded-2xl shadow-lg border border-neutral-700 p-8">
        <h2 className="text-xl font-semibold text-green-500 mb-2">Choose a username</h2>
        <p className="text-sm text-neutral-400 mb-6">
          Shown next to transfers you log instead of your email address. Pick one to continue.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. noushal"
            className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
