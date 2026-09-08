"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import AuthButton from "@/components/AuthButton";
import TeamManager from "@/components/TeamManager";

export default function TeamsPage() {
  const { isAuthed } = useSession();
  const [teams, setTeams] = useState([]);
  const [editingTeam, setEditingTeam] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    refreshTeams();

    let debounce;
    function scheduleRefresh() {
      clearTimeout(debounce);
      debounce = setTimeout(refreshTeams, 150);
    }

    const channel = supabase
      .channel("gpcl-teams-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, scheduleRefresh)
      .subscribe();

    return () => {
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, []);

  async function refreshTeams() {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase.from("teams").select("*").order("name");
    setTeams(data || []);
  }

  function showError(message) {
    setError(message);
    setTimeout(() => setError(""), 4000);
  }

  async function handleSubmitTeam({ name, logoFile, autoLogoUrl }) {
    const supabase = createClient();
    if (!supabase) return;

    // Determine logo_url:
    //   1. Manual file upload → upload to Storage, get public URL
    //   2. Auto-fetched remote URL (TheSportsDB) → store directly, no upload needed
    //   3. Neither → keep existing logo (edit mode) or null (new)
    let logo_url = editingTeam?.logo_url ?? null;

    if (logoFile) {
      const ext = logoFile.name.split(".").pop().toLowerCase();
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const path = `${slug}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
      if (uploadError) { showError(uploadError.message); return; }
      const { data: { publicUrl } } = supabase.storage.from("team-logos").getPublicUrl(path);
      logo_url = publicUrl;
    } else if (autoLogoUrl) {
      // Remote URL from TheSportsDB — store directly without re-uploading
      logo_url = autoLogoUrl;
    }

    if (editingTeam) {
      const oldName = editingTeam.name;
      const { error } = await supabase.from("teams").update({ name, logo_url }).eq("id", editingTeam.id);
      if (error) { showError(error.message); return; }
      if (oldName !== name) {
        await supabase.from("transfer_logs").update({ team: name }).eq("team", oldName);
      }
      setEditingTeam(null);
    } else {
      const { error } = await supabase.from("teams").insert({ name, logo_url });
      if (error) { showError(error.message); return; }
    }
    refreshTeams();
  }

  async function handleDeleteTeam(team) {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from("teams").delete().eq("id", team.id);
    if (error) {
      showError(error.message);
      return;
    }
    refreshTeams();
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
              <h1 className="text-3xl font-bold text-purple-500">Teams</h1>
              <p className="text-sm text-neutral-500 mt-0.5">
                {teams.length} active {teams.length === 1 ? "team" : "teams"}
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

        {error && (
          <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>
        )}

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
