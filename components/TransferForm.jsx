"use client";

import { useEffect, useMemo, useState } from "react";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";
import CustomSelect from "@/components/CustomSelect";
import CustomDatePicker from "@/components/CustomDatePicker";

const SEASONS = Array.from({ length: 8 }, (_, i) => `Season ${i + 1}`);
const WINDOWS = ["Summer Transfer (Pre-Season)", "Winter Transfer"];
const SEASON_OPTIONS = SEASONS.map((s) => ({ value: s, label: s }));
const WINDOW_OPTIONS = WINDOWS.map((w) => ({ value: w, label: w }));

const emptyForm = {
  team: "",
  player: "",
  fee: "",
  season: "Season 2",
  window: WINDOWS[0],
  date: "",
};

export default function TransferForm({ teams, editingLog, onSubmit, onCancelEdit, canEdit }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingLog) {
      setForm({
        team: editingLog.team || "",
        player: editingLog.player || "",
        fee: editingLog.fee || "",
        season: editingLog.season || "Season 2",
        window: editingLog.transfer_window || WINDOWS[0],
        date: editingLog.purchase_date || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [editingLog]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const teamOptions = useMemo(
    () => [
      { value: "", label: "Select a team...", disabled: true },
      ...teams.map((t) => ({ value: t.name, label: t.name })),
    ],
    [teams]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.team || !form.player.trim() || !form.date) {
      setError("Please select a team, enter a player name, and choose a date.");
      setTimeout(() => setError(""), 3000);
      return;
    }
    setError("");
    await onSubmit(form);
    setForm(emptyForm);
  }

  if (!canEdit) {
    return (
      <div className="lg:col-span-1 bg-neutral-800 rounded-2xl shadow-lg border border-neutral-700 p-6 h-fit text-sm text-neutral-400">
        Sign in to log transfers.
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Buying Team</label>
          <CustomSelect
            value={form.team}
            onChange={(v) => set("team", v)}
            options={teamOptions}
            buttonClassName="px-4 py-2.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Player Name</label>
          <PlayerAutocomplete
            value={form.player}
            onChange={(v) => set("player", v)}
            className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Transfer Fee (€)</label>
          <input
            type="number"
            step="0.01"
            placeholder="e.g. 55000000"
            value={form.fee}
            onChange={(e) => set("fee", e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
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

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Date of Transaction</label>
          <CustomDatePicker value={form.date} onChange={(v) => set("date", v)} />
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
    </div>
  );
}
