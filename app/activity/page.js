"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import AuthButton from "@/components/AuthButton";

const ACTION_STYLES = {
  insert: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  update: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  delete: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function ActivityPage() {
  const { isAuthed, loading: sessionLoading } = useSession();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading || !isAuthed) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) return;

    refresh();

    let debounce;
    function scheduleRefresh() {
      clearTimeout(debounce);
      debounce = setTimeout(refresh, 150);
    }

    const channel = supabase
      .channel("gpcl-activity-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_log" }, scheduleRefresh)
      .subscribe();

    return () => {
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [sessionLoading, isAuthed]);

  async function refresh() {
    const supabase = createClient();
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setEntries(data || []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-[95%] mx-auto space-y-6">
        <header className="flex flex-col md:flex-row items-center justify-between bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-neutral-400 hover:text-white transition-colors p-2 -ml-2 rounded-lg hover:bg-neutral-700/50"
              title="Back to dashboard"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-amber-500">Activity Log</h1>
              <p className="text-sm text-neutral-500 mt-0.5">
                Every add/edit/delete, recorded automatically — visible here, never editable from the app.
              </p>
            </div>
          </div>
          <AuthButton />
        </header>

        {!isSupabaseConfigured && (
          <div className="text-amber-400 text-sm bg-amber-400/10 p-3 rounded-lg border border-amber-400/20">
            Supabase isn&apos;t configured yet. Copy <code>.env.local.example</code> to <code>.env.local</code>, fill
            in your project URL and anon key, and restart the dev server.
          </div>
        )}

        <div className="bg-neutral-800 rounded-2xl shadow-lg border border-neutral-700 overflow-hidden">
          {!sessionLoading && !isAuthed ? (
            <div className="p-8 text-center text-sm text-neutral-400">Sign in to view the activity log.</div>
          ) : loading ? (
            <div className="p-8 text-center text-sm text-neutral-500">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500">No activity yet.</div>
          ) : (
            <div className="divide-y divide-neutral-700/50">
              {entries.map((entry) => (
                <div key={entry.id} className="p-4 flex items-start gap-3">
                  <span
                    className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md border ${
                      ACTION_STYLES[entry.action] || "bg-neutral-700 text-neutral-300 border-neutral-600"
                    }`}
                  >
                    {entry.action}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-200">{entry.entity_summary || entry.entity_type}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {entry.actor_username || "unknown"} ·{" "}
                      {new Date(entry.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
