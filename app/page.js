"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { calculateSaleEligibility } from "@/lib/utils";
import AuthButton from "@/components/AuthButton";
import LiveClock from "@/components/LiveClock";
import TransferForm from "@/components/TransferForm";
import TransferTable from "@/components/TransferTable";

export default function Home() {
  const { isAuthed, session } = useSession();
  const [teams, setTeams] = useState([]);
  const [logs, setLogs] = useState([]);
  const [editingLog, setEditingLog] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    refreshAll();

    // Push-based refresh: without this, only the tab that made a change
    // sees it — everyone else would need to manually reload. Any insert/
    // update/delete on these tables (from any client) re-fetches here.
    let debounce;
    function scheduleRefresh() {
      clearTimeout(debounce);
      debounce = setTimeout(refreshAll, 150);
    }

    const channel = supabase
      .channel("gpcl-live-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "transfer_logs" }, scheduleRefresh)
      .subscribe();

    return () => {
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, []);

  async function refreshAll() {
    const supabase = createClient();
    if (!supabase) return;
    const [{ data: teamsData }, { data: logsData }] = await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase.from("transfer_logs").select("*, players(position, nationality), profiles(username)"),
    ]);
    setTeams(teamsData || []);
    setLogs(logsData || []);
  }

  function showError(message) {
    setError(message);
    setTimeout(() => setError(""), 4000);
  }

  async function handleSubmitLog(form) {
    const supabase = createClient();
    if (!supabase) return;
    const payload = {
      team: form.team,
      player: form.player.trim(),
      player_id: form.playerId ?? null,
      fee: form.fee || 0,
      season: form.season,
      transfer_window: form.window,
      purchase_date: form.date,
      sale_eligibility: calculateSaleEligibility(form.season, form.window),
    };

    const { error } = editingLog
      ? await supabase.from("transfer_logs").update(payload).eq("id", editingLog.id)
      : await supabase
          .from("transfer_logs")
          .insert({ ...payload, created_by: session?.user?.id ?? null });

    if (error) {
      showError(error.message);
      return;
    }
    setEditingLog(null);
    refreshAll();
  }

  async function handleDeleteLog(log) {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from("transfer_logs").delete().eq("id", log.id);
    if (error) {
      showError(error.message);
      return;
    }
    refreshAll();
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-[95%] mx-auto space-y-6">
        <header className="flex flex-col md:flex-row items-center justify-between bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-green-500">GPCL Transfer Logs</h1>
            <LiveClock />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/teams"
              className="flex items-center gap-2 text-sm bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-700/50 hover:border-purple-500/50 text-neutral-300 px-4 py-2.5 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {teams.length} {teams.length === 1 ? "Team" : "Teams"}
            </Link>
            {isAuthed && (
              <Link
                href="/activity"
                className="flex items-center gap-2 text-sm bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-700/50 hover:border-amber-500/50 text-neutral-300 px-4 py-2.5 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Activity
              </Link>
            )}
            <AuthButton />
          </div>
        </header>

        <div className="flex items-start gap-3 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-3 text-sm text-neutral-300">
          <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p>
            <span className="text-amber-400 font-semibold">Rule reminder:</span> purchases lock the player from being{" "}
            <strong>sold</strong> until the <em>following</em> season or after the following Transfer Window.
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="text-amber-400 text-sm bg-amber-400/10 p-3 rounded-lg border border-amber-400/20">
            Supabase isn&apos;t configured yet. Copy <code>.env.local.example</code> to <code>.env.local</code>, fill
            in your project URL and anon key, and restart the dev server.
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <TransferForm
            teams={teams}
            editingLog={editingLog}
            onSubmit={handleSubmitLog}
            onCancelEdit={() => setEditingLog(null)}
            canEdit={isAuthed}
          />
          <TransferTable
            logs={logs}
            teams={teams}
            onEdit={(log) => {
              setEditingLog(log);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDelete={handleDeleteLog}
            canEdit={isAuthed}
          />
        </div>
      </div>
    </div>
  );
}
