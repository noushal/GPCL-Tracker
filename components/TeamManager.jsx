"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── tiny debounce hook ────────────────────────────────────────────────────────
function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function TeamManager({ teams, editingTeam, onSubmit, onCancelEdit, onDelete, onEdit, canEdit }) {
  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState(null);       // manually chosen file
  const [logoPreview, setLogoPreview] = useState(null); // data-URL or remote URL shown in <img>
  const [autoLogoUrl, setAutoLogoUrl] = useState(null); // URL returned by TheSportsDB
  const [logoStatus, setLogoStatus] = useState("idle"); // "idle" | "searching" | "found" | "not_found"
  const [uploading, setUploading] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const fileInputRef = useRef(null);

  const debouncedName = useDebounce(name, 550);

  // ── Sync form when entering/leaving edit mode ────────────────────────────
  useEffect(() => {
    if (editingTeam) {
      setName(editingTeam.name);
      setLogoFile(null);
      setAutoLogoUrl(null);
      setLogoPreview(editingTeam.logo_url || null);
      setLogoStatus(editingTeam.logo_url ? "found" : "idle");
    } else {
      setName("");
      setLogoFile(null);
      setAutoLogoUrl(null);
      setLogoPreview(null);
      setLogoStatus("idle");
    }
  }, [editingTeam]);

  // ── Auto-fetch logo from TheSportsDB whenever the name changes ───────────
  useEffect(() => {
    // Don't auto-search if user already picked a file manually
    if (logoFile) return;
    // Don't search in edit mode when logo already exists (unless user cleared it)
    if (editingTeam && editingTeam.logo_url && logoPreview === editingTeam.logo_url) return;

    const trimmed = debouncedName.trim();
    if (trimmed.length < 3) {
      setAutoLogoUrl(null);
      if (!logoFile) setLogoPreview(null);
      setLogoStatus("idle");
      return;
    }

    let cancelled = false;
    setLogoStatus("searching");

    fetch(`/api/team-logo?name=${encodeURIComponent(trimmed)}`)
      .then((r) => r.json())
      .then(({ logo }) => {
        if (cancelled) return;
        if (logo) {
          setAutoLogoUrl(logo);
          setLogoPreview(logo);
          setLogoStatus("found");
        } else {
          setAutoLogoUrl(null);
          setLogoPreview(null);
          setLogoStatus("not_found");
        }
      })
      .catch(() => {
        if (!cancelled) setLogoStatus("not_found");
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName, logoFile]);

  // ── Manual file selection ────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setAutoLogoUrl(null); // manual upload takes precedence
    setLogoStatus("found");
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    setLogoFile(null);
    setAutoLogoUrl(null);
    setLogoPreview(null);
    setLogoStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setUploading(true);
    // Pass both logoFile (manual upload) and autoLogoUrl (remote URL) so the
    // parent can decide which to use — file takes precedence.
    await onSubmit({ name: trimmed, logoFile, autoLogoUrl });
    setUploading(false);
    setName("");
    setLogoFile(null);
    setAutoLogoUrl(null);
    setLogoPreview(null);
    setLogoStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Status indicator ─────────────────────────────────────────────────────
  function LogoStatusBadge() {
    if (logoFile) return (
      <span className="text-xs text-emerald-400 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        Manual upload selected
      </span>
    );
    if (logoStatus === "searching") return (
      <span className="text-xs text-neutral-500 flex items-center gap-1">
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        Searching for logo…
      </span>
    );
    if (logoStatus === "found" && autoLogoUrl) return (
      <span className="text-xs text-emerald-400 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        Logo found automatically
      </span>
    );
    if (logoStatus === "not_found") return (
      <span className="text-xs text-neutral-500 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        No logo found — upload one manually
      </span>
    );
    return null;
  }

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(teamSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ── Add / Edit form ── */}
      <div className="bg-neutral-800 rounded-2xl shadow-lg border border-neutral-700 p-6">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Team Management
        </h2>
        <p className="text-sm text-neutral-400 mb-4">Add or edit the teams participating in the league.</p>

        {canEdit ? (
          <form onSubmit={handleSubmit} className="space-y-3 max-w-xl">
            {/* Team name */}
            <input
              type="text"
              placeholder="Team Name (e.g. Manchester City)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />

            {/* Logo row */}
            <div className="flex items-start gap-3">
              {/* Preview thumbnail */}
              <div className="shrink-0 w-14 h-14 rounded-xl border border-neutral-600 bg-neutral-900 flex items-center justify-center overflow-hidden relative">
                {logoStatus === "searching" && !logoPreview && (
                  <svg className="w-5 h-5 text-neutral-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {logoPreview ? (
                  <img src={logoPreview} alt="logo preview" className="w-full h-full object-contain p-1" />
                ) : logoStatus !== "searching" && (
                  <svg className="w-7 h-7 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-neutral-600 bg-neutral-900 text-neutral-300 hover:border-purple-500 hover:text-purple-300 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload manually
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {logoPreview && (
                    <button type="button" onClick={clearLogo}
                      className="text-xs text-neutral-500 hover:text-red-400 transition-colors underline underline-offset-2">
                      Clear
                    </button>
                  )}
                </div>
                <LogoStatusBadge />
                <p className="text-[11px] text-neutral-600">Logo is fetched automatically from TheSportsDB as you type.</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={uploading}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-medium py-2.5 px-5 rounded-lg transition-colors whitespace-nowrap"
              >
                {uploading ? "Saving…" : editingTeam ? "Update Team" : "Add Team"}
              </button>
              {editingTeam && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="text-sm text-neutral-400 hover:text-white transition-colors underline decoration-neutral-600 underline-offset-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <p className="text-sm text-neutral-500 italic">Sign in to manage teams.</p>
        )}
      </div>

      {/* ── Team grid ── */}
      <div className="bg-neutral-800 rounded-2xl shadow-lg border border-neutral-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Active Teams</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-3.5 w-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search teams..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="bg-neutral-900 border border-neutral-600 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 w-44"
              />
            </div>
            <span className="bg-neutral-900 text-neutral-400 text-xs px-3 py-1 rounded-full border border-neutral-700 shrink-0">
              {teamSearch
                ? `${filtered.length} / ${teams.length}`
                : `${teams.length} ${teams.length === 1 ? "Team" : "Teams"}`}
            </span>
          </div>
        </div>

        {teams.length === 0 ? (
          <p className="text-neutral-500 text-sm italic">No teams added yet.</p>
        ) : filtered.length === 0 ? (
          <p className="text-neutral-500 text-sm italic">No teams match &ldquo;{teamSearch}&rdquo;.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((team) => (
              <div
                key={team.id}
                className="flex justify-between items-center gap-2 bg-neutral-900 border border-neutral-700 p-3 rounded-lg"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 w-8 h-8 rounded-md bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden">
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain p-0.5" />
                    ) : (
                      <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-white truncate">{team.name}</span>
                </div>
                {canEdit && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => onEdit(team)}
                      className="text-neutral-400 hover:text-purple-400 transition-colors text-xs border border-neutral-700 hover:border-purple-400 px-2 py-1 rounded">
                      EDIT
                    </button>
                    <button onClick={() => onDelete(team)}
                      className="text-neutral-500 hover:text-red-400 transition-colors text-xs border border-neutral-700 hover:border-red-400 px-2 py-1 rounded">
                      REMOVE
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
