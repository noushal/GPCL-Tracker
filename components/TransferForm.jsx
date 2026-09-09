"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";
import CustomSelect from "@/components/CustomSelect";
import ScreenshotScanModal from "@/components/ScreenshotScanModal";

const SEASONS = Array.from({ length: 8 }, (_, i) => `Season ${i + 1}`);
const WINDOWS = ["Summer Transfer (Pre-Season)", "Winter Transfer"];
const SEASON_OPTIONS = SEASONS.map((s) => ({ value: s, label: s }));
const WINDOW_OPTIONS = WINDOWS.map((w) => ({ value: w, label: w }));

const emptyForm = {
  team: "",
  player: "",
  playerId: null,
  fee: "",
  season: "Season 2",
  window: WINDOWS[0],
};

// Fields cleared after each successful submission (team is intentionally excluded)
const RESET_FIELDS = { player: "", playerId: null, fee: "" };

export default function TransferForm({
  teams,
  editingLog,
  onSubmit,
  onCancelEdit,
  canEdit,
  session,
  onBatchSuccess,
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [feeError, setFeeError] = useState("");
  const [showScanModal, setShowScanModal] = useState(false);
  const [pastedFiles, setPastedFiles] = useState([]);

  // Global paste handler on the page for logged in users
  useEffect(() => {
    if (!canEdit || editingLog) return;
    function handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        setPastedFiles(files);
        setShowScanModal(true);
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [canEdit, editingLog]);

  useEffect(() => {
    if (editingLog) {
      setForm({
        team: editingLog.team || "",
        player: editingLog.player || "",
        playerId: editingLog.player_id ?? null,
        fee: editingLog.fee || "",
        season: editingLog.season || "Season 2",
        window: editingLog.transfer_window || WINDOWS[0],
      });
    } else {
      // When leaving edit mode, only reset the player-detail fields so the
      // previously selected team is preserved for the next new-purchase log.
      setForm((f) => ({ ...emptyForm, team: f.team, season: f.season, window: f.window }));
    }
  }, [editingLog]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const teamOptions = useMemo(
    () => [
      { value: "", label: "Select a team...", disabled: true },
      ...teams.map((t) => ({ value: t.name, label: t.name, logo: t.logo_url || null })),
    ],
    [teams]
  );

  const MIN_FEE = 1_000_000;

  async function handleSubmit(e) {
    e.preventDefault();

    // Fee validation — checked first so the inline error is always visible
    const feeValue = form.fee === "" ? 0 : Number(form.fee);
    if (feeValue < MIN_FEE) {
      setFeeError("Transfer fee must be at least £1,000,000.");
      return;
    }
    setFeeError("");

    if (!form.team || !form.player.trim()) {
      setError("Please select a team and enter a player name.");
      setTimeout(() => setError(""), 3000);
      return;
    }
    setError("");
    await onSubmit(form);
    // Selective reset: keep team, season, and window so the editor doesn't
    // have to re-select them when logging multiple transfers for the same club.
    setForm((f) => ({ ...f, ...RESET_FIELDS }));
  }

  if (!canEdit) {
    return (
      <div className="lg:col-span-1 bg-neutral-800 rounded-2xl shadow-lg border border-neutral-700 p-6 md:p-8 h-fit flex flex-col items-center text-center gap-3">
        <div className="w-11 h-11 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center">
          <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-300">Sign in to log transfers</p>
          <p className="text-xs text-neutral-500 mt-1">Viewing is open to everyone — editing needs an account.</p>
        </div>
        <Link
          href="/login"
          className="text-sm bg-neutral-900 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 px-4 py-2 rounded-lg transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="lg:col-span-1 bg-neutral-800 rounded-2xl shadow-lg border border-neutral-700 p-6 h-fit">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
        {editingLog ? "Edit Transfer" : "Log New Purchase"}
      </h2>

      {!editingLog && (
        <button
          type="button"
          onClick={() => {
            setPastedFiles([]);
            setShowScanModal(true);
          }}
          className="w-full mb-5 py-2.5 px-3 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Scan Purchases from Screenshots</span>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">
            Ctrl+V
          </span>
        </button>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Buying Team</label>
          <CustomSelect
            value={form.team}
            onChange={(v) => set("team", v)}
            options={teamOptions}
            buttonClassName="px-4 py-2.5"
            searchable
            searchPlaceholder="Search teams..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Player Name</label>
          <PlayerAutocomplete
            value={form.player}
            onChange={(v) => setForm((f) => ({ ...f, player: typeof v === "string" ? v.replace(/[0-9]/g, "") : v, playerId: null }))}
            onSelectPlayer={(p) => setForm((f) => ({ ...f, player: p.name, playerId: p.id }))}
            className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Transfer Fee (£)</label>
          <input
            type="number"
            step="0.01"
            min="1000000"
            placeholder="e.g. 55000000"
            value={form.fee}
            onKeyDown={(e) => {
              if (["e", "E", "+", "-"].includes(e.key)) {
                e.preventDefault();
              }
            }}
            onChange={(e) => {
              const sanitized = e.target.value.replace(/[^0-9]/g, "");
              set("fee", sanitized);
              // Clear inline error as soon as the user starts correcting
              if (feeError) setFeeError("");
            }}
            onPaste={(e) => {
              e.preventDefault();
              const raw = e.clipboardData.getData("text");
              // Disallow words, letters, and non-digits — strip everything except 0-9
              const sanitized = raw.replace(/[^0-9]/g, "");
              if (!sanitized) return;
              set("fee", sanitized);
              if (feeError) setFeeError("");
            }}
            className={`w-full bg-neutral-900 border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 transition-colors ${
              feeError
                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                : "border-neutral-600 focus:border-green-500 focus:ring-green-500"
            }`}
          />
          {feeError && (
            <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {feeError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Season</label>
            <CustomSelect
              value={form.season}
              onChange={(v) => set("season", v)}
              options={SEASON_OPTIONS}
              buttonClassName="px-4 py-2.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Window</label>
            <CustomSelect
              value={form.window}
              onChange={(v) => set("window", v)}
              options={WINDOW_OPTIONS}
              buttonClassName="px-4 py-2.5"
            />
          </div>
        </div>


        {error && (
          <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full mt-2 bg-green-600 hover:bg-green-500 text-white font-medium py-3 px-4 rounded-lg transition-colors flex justify-center items-center shadow-lg shadow-green-900/20"
        >
          {editingLog ? "Update Transfer" : "Log Transfer"}
        </button>
        {editingLog && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="w-full mt-2 bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Cancel Editing
          </button>
        )}
      </form>

      <ScreenshotScanModal
        isOpen={showScanModal}
        onClose={() => {
          setShowScanModal(false);
          setPastedFiles([]);
        }}
        teams={teams}
        defaultTeam={form.team}
        defaultSeason={form.season}
        defaultWindow={form.window}
        session={session}
        initialFiles={pastedFiles}
        onSuccess={() => {
          if (onBatchSuccess) onBatchSuccess();
        }}
      />
    </div>
  );
}
