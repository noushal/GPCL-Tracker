"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { calculateSaleEligibility } from "@/lib/utils";
import AuthButton from "@/components/AuthButton";
import LiveClock from "@/components/LiveClock";
import TransferForm from "@/components/TransferForm";
import TransferTable from "@/components/TransferTable";
import TeamManager from "@/components/TeamManager";

export default function Home() {
  const { isAuthed } = useSession();
  const [teams, setTeams] = useState([]);
  const [logs, setLogs] = useState([]);
  const [editingLog, setEditingLog] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    refreshAll();
  }, []);

  async function refreshAll() {
    const supabase = createClient();
    if (!supabase) return;
    const [{ data: teamsData }, { data: logsData }] = await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase.from("transfer_logs").select("*"),
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
      fee: form.fee || 0,
      season: form.season,
      transfer_window: form.window,
      purchase_date: form.date,
      sale_eligibility: calculateSaleEligibility(form.season, form.window),
    };

    const { error } = editingLog
      ? await supabase.from("transfer_logs").update(payload).eq("id", editingLog.id)
      : await supabase.from("transfer_logs").insert(payload);

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

  async function handleSubmitTeam(name) {
    const supabase = createClient();
    if (!supabase) return;

    if (editingTeam) {
      const oldName = editingTeam.name;
      const { error } = await supabase.from("teams").update({ name }).eq("id", editingTeam.id);
      if (error) {
        showError(error.message);
        return;
      }
      if (oldName !== name) {
        await supabase.from("transfer_logs").update({ team: name }).eq("team", oldName);
      }
      setEditingTeam(null);
    } else {
      const { error } = await supabase.from("teams").insert({ name });
      if (error) {
        showError(error.message);
        return;
      }
    }
    refreshAll();
  }

  async function handleDeleteTeam(team) {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from("teams").delete().eq("id", team.id);
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
            <h1 className="text-3xl font-bold text-green-500">GPCL Transfer Logs</h1>
            <LiveClock />
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-700/50 max-w-md w-full md:w-auto">
              <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                RULE REMINDER
              </h3>
              <ul className="text-xs text-neutral-400 space-y-1 list-disc pl-4">
                <li>
                  Purchases lock the player from being <strong>sold</strong> until the <em>following</em> season or
                  after following Transfer Window.
                </li>
              </ul>
            </div>
            <AuthButton />
          </div>
        </header>

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

        <TeamManager
          teams={teams}
          editingTeam={editingTeam}
          onSubmit={handleSubmitTeam}
          onCancelEdit={() => setEditingTeam(null)}
          onEdit={setEditingTeam}
          onDelete={handleDeleteTeam}
          canEdit={isAuthed}
        />
      </div>
    </div>
  );
}
