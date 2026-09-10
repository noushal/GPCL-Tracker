"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";
import CustomSelect from "@/components/CustomSelect";
import ScreenshotScanModal from "@/components/ScreenshotScanModal";
import TradeScanModal from "@/components/TradeScanModal";

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

const emptyTradeForm = {
  teamA: "",
  playerA: "",
  playerIdA: null,
  teamB: "",
  playerB: "",
  playerIdB: null,
  season: "Season 2",
  window: WINDOWS[0],
  cashPayer: "none", // "none" | "teamA" | "teamB"
  cashAmount: "",
};

// Fields cleared after each successful purchase submission
const RESET_PURCHASE_FIELDS = { player: "", playerId: null, fee: "" };

export default function TransferForm({
  teams,
  editingLog,
  onSubmit,
  onCancelEdit,
  canEdit,
  session,
  onBatchSuccess,
}) {
  const [mode, setMode] = useState("purchase"); // "purchase" | "trade"
  const [form, setForm] = useState(emptyForm);
  const [tradeForm, setTradeForm] = useState(emptyTradeForm);
  const [error, setError] = useState("");
  const [feeError, setFeeError] = useState("");
  const [showScanModal, setShowScanModal] = useState(false);
  const [pastedFiles, setPastedFiles] = useState([]);
  const [showTradeScanModal, setShowTradeScanModal] = useState(false);
  const [pastedTradeFiles, setPastedTradeFiles] = useState([]);

  // Global paste handler on the page for logged in users (disabled when modal is open)
  useEffect(() => {
    if (!canEdit || editingLog || showScanModal || showTradeScanModal) return;
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
        if (mode === "trade") {
          setPastedTradeFiles(files);
          setShowTradeScanModal(true);
        } else {
          setPastedFiles(files);
          setShowScanModal(true);
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [canEdit, editingLog, showScanModal, showTradeScanModal, mode]);

  useEffect(() => {
    if (editingLog) {
      setMode("purchase");
      setForm({
        team: editingLog.team || "",
        player: editingLog.player || "",
        playerId: editingLog.player_id ?? null,
        fee: editingLog.fee || "",
        season: editingLog.season || "Season 2",
        window: editingLog.transfer_window || WINDOWS[0],
      });
    } else {
      setForm((f) => ({ ...emptyForm, team: f.team, season: f.season, window: f.window }));
    }
  }, [editingLog]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setTrade(field, value) {
    setTradeForm((f) => ({ ...f, [field]: value }));
  }

  const teamOptions = useMemo(
    () => [
      { value: "", label: "Select a team...", disabled: true },
      ...teams.map((t) => ({ value: t.name, label: t.name, logo: t.logo_url || null })),
    ],
    [teams]
  );

  const MIN_FEE = 1_000_000;

  async function handlePurchaseSubmit(e) {
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
      setTimeout(() => setError(""), 3500);
      return;
    }
    setError("");
    await onSubmit({ ...form, mode: "purchase" });
    setForm((f) => ({ ...f, ...RESET_PURCHASE_FIELDS }));
  }

  async function handleTradeSubmit(e) {
    e.preventDefault();

    if (!tradeForm.teamA || !tradeForm.teamB) {
      setError("Please select both Club A and Club B.");
      setTimeout(() => setError(""), 3500);
      return;
    }

    if (tradeForm.teamA === tradeForm.teamB) {
      setError("Club A and Club B cannot be the same club.");
      setTimeout(() => setError(""), 3500);
      return;
    }

    if (!tradeForm.playerA.trim() || !tradeForm.playerB.trim()) {
      setError("Please enter player names for both clubs.");
      setTimeout(() => setError(""), 3500);
      return;
    }

    if (tradeForm.cashPayer !== "none") {
      const amt = Number(tradeForm.cashAmount);
      if (isNaN(amt) || amt <= 0) {
        setError("Please enter a valid cash amount or select Straight Swap.");
        setTimeout(() => setError(""), 3500);
        return;
      }
    }

    setError("");
    await onSubmit({
      mode: "trade",
      ...tradeForm,
      cashAmount: tradeForm.cashPayer === "none" ? 0 : Number(tradeForm.cashAmount || 0),
    });

    // Reset players and cash amount, preserve selected clubs, season, and window
    setTradeForm((f) => ({
      ...f,
      playerA: "",
      playerIdA: null,
      playerB: "",
      playerIdB: null,
      cashPayer: "none",
      cashAmount: "",
    }));
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
    <div className="lg:col-span-1 bg-neutral-800 rounded-2xl shadow-lg border border-neutral-700 p-5 sm:p-6 h-fit">
      {/* Title */}
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        {mode === "trade" && !editingLog ? (
          <>
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Log Player Trade
          </>
        ) : (
          <>
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            {editingLog ? "Edit Transfer" : "Log New Purchase"}
          </>
        )}
      </h2>

      {/* Mode Switcher */}
      {!editingLog && (
        <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-900 border border-neutral-700/80 rounded-xl mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("purchase");
              setError("");
              setFeeError("");
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === "purchase"
                ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Purchase
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("trade");
              setError("");
              setFeeError("");
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === "trade"
                ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Player Trade
          </button>
        </div>
      )}

      {/* ── MODE 1: STANDARD PURCHASE FORM ── */}
      {mode === "purchase" ? (
        <>
          {!editingLog && (
            <button
              type="button"
              onClick={() => {
                setPastedFiles([]);
                setShowScanModal(true);
              }}
              className="w-full mb-4 py-2.5 px-3 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group"
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

          <form onSubmit={handlePurchaseSubmit} noValidate className="space-y-4">
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
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    player: typeof v === "string" ? v.replace(/[0-9]/g, "") : v,
                    playerId: null,
                  }))
                }
                onSelectPlayer={(p) => setForm((f) => ({ ...f, player: p.name, playerId: p.id }))}
                placeholder="e.g. Luka Modric"
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
                  if (feeError) setFeeError("");
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const raw = e.clipboardData.getData("text");
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    />
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
        </>
      ) : (
        /* ── MODE 2: PLAYER TRADE FORM ── */
        <>
          {!editingLog && (
            <button
              type="button"
              onClick={() => {
                setPastedTradeFiles([]);
                setShowTradeScanModal(true);
              }}
              className="w-full mb-4 py-2.5 px-3 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group"
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
              <span>Scan Trade from Screenshot</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                Ctrl+V
              </span>
            </button>
          )}

          <form onSubmit={handleTradeSubmit} noValidate className="space-y-4">
          {/* Shared Season & Window */}
          <div className="grid grid-cols-2 gap-3 bg-neutral-900/50 p-3 rounded-xl border border-neutral-700/60">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Season</label>
              <CustomSelect
                value={tradeForm.season}
                onChange={(v) => setTrade("season", v)}
                options={SEASON_OPTIONS}
                buttonClassName="px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Window</label>
              <CustomSelect
                value={tradeForm.window}
                onChange={(v) => setTrade("window", v)}
                options={WINDOW_OPTIONS}
                buttonClassName="px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Club A */}
          <div className="bg-neutral-900/50 p-3.5 rounded-xl border border-neutral-700/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Club A
              </span>
              <span className="text-[10px] text-neutral-400">Gives Player A</span>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">Select Club A</label>
              <CustomSelect
                value={tradeForm.teamA}
                onChange={(v) => setTrade("teamA", v)}
                options={teamOptions}
                buttonClassName="px-3 py-2 text-xs"
                searchable
                searchPlaceholder="Select Club A..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">Player A (leaving Club A)</label>
              <PlayerAutocomplete
                value={tradeForm.playerA}
                onChange={(v) =>
                  setTradeForm((f) => ({
                    ...f,
                    playerA: typeof v === "string" ? v.replace(/[0-9]/g, "") : v,
                    playerIdA: null,
                  }))
                }
                onSelectPlayer={(p) => setTradeForm((f) => ({ ...f, playerA: p.name, playerIdA: p.id }))}
                placeholder="e.g. Amadou Onana"
                className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Swap divider */}
          <div className="flex items-center justify-center gap-2 py-0.5">
            <div className="h-px bg-neutral-700/80 flex-1"></div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-bold tracking-wider">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              SWAP WITH
            </div>
            <div className="h-px bg-neutral-700/80 flex-1"></div>
          </div>

          {/* Club B */}
          <div className="bg-neutral-900/50 p-3.5 rounded-xl border border-neutral-700/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                Club B
              </span>
              <span className="text-[10px] text-neutral-400">Gives Player B</span>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">Select Club B</label>
              <CustomSelect
                value={tradeForm.teamB}
                onChange={(v) => setTrade("teamB", v)}
                options={teamOptions}
                buttonClassName="px-3 py-2 text-xs"
                searchable
                searchPlaceholder="Select Club B..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">Player B (leaving Club B)</label>
              <PlayerAutocomplete
                value={tradeForm.playerB}
                onChange={(v) =>
                  setTradeForm((f) => ({
                    ...f,
                    playerB: typeof v === "string" ? v.replace(/[0-9]/g, "") : v,
                    playerIdB: null,
                  }))
                }
                onSelectPlayer={(p) => setTradeForm((f) => ({ ...f, playerB: p.name, playerIdB: p.id }))}
                placeholder="e.g. Malcom"
                className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Cash Adjustment (Optional) */}
          <div className="p-3.5 bg-neutral-900/50 rounded-xl border border-neutral-700/60 space-y-2.5">
            <label className="block text-xs font-medium text-neutral-400">Cash Compensation (Optional)</label>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setTrade("cashPayer", "none")}
                className={`py-2 px-1.5 rounded-lg border text-center transition-all ${
                  tradeForm.cashPayer === "none"
                    ? "bg-blue-600/20 border-blue-500/60 text-blue-300 font-semibold"
                    : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white"
                }`}
              >
                Straight Swap (£0)
              </button>
              <button
                type="button"
                onClick={() => setTrade("cashPayer", "teamA")}
                className={`py-2 px-1.5 rounded-lg border text-center transition-all truncate ${
                  tradeForm.cashPayer === "teamA"
                    ? "bg-blue-600/20 border-blue-500/60 text-blue-300 font-semibold"
                    : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white"
                }`}
                title={tradeForm.teamA ? `${tradeForm.teamA} pays cash` : "Club A pays cash"}
              >
                {tradeForm.teamA ? `${tradeForm.teamA.slice(0, 8)} pays` : "Club A pays"}
              </button>
              <button
                type="button"
                onClick={() => setTrade("cashPayer", "teamB")}
                className={`py-2 px-1.5 rounded-lg border text-center transition-all truncate ${
                  tradeForm.cashPayer === "teamB"
                    ? "bg-blue-600/20 border-blue-500/60 text-blue-300 font-semibold"
                    : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white"
                }`}
                title={tradeForm.teamB ? `${tradeForm.teamB} pays cash` : "Club B pays cash"}
              >
                {tradeForm.teamB ? `${tradeForm.teamB.slice(0, 8)} pays` : "Club B pays"}
              </button>
            </div>

            {tradeForm.cashPayer !== "none" && (
              <div className="pt-1">
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  {tradeForm.cashPayer === "teamA"
                    ? tradeForm.teamA || "Club A"
                    : tradeForm.teamB || "Club B"}{" "}
                  Pays Additional (£)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-neutral-500">£</span>
                  <input
                    type="text"
                    placeholder="e.g. 9500000"
                    value={tradeForm.cashAmount}
                    onChange={(e) => setTrade("cashAmount", e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full bg-neutral-900 border border-neutral-600 rounded-lg pl-7 pr-3 py-1.5 text-xs text-emerald-400 font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Log Player Trade
          </button>
        </form>
        </>
      )}

      {/* Screenshot Scan Modal (for purchases) */}
      <ScreenshotScanModal
        isOpen={showScanModal}
        onClose={() => {
          setShowScanModal(false);
          setPastedFiles([]);
        }}
        onClearInitialFiles={() => {
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

      {/* Screenshot Scan Modal (for trades) */}
      <TradeScanModal
        isOpen={showTradeScanModal}
        onClose={() => {
          setShowTradeScanModal(false);
          setPastedTradeFiles([]);
        }}
        onClearInitialFiles={() => {
          setPastedTradeFiles([]);
        }}
        teams={teams}
        defaultSeason={tradeForm.season}
        defaultWindow={tradeForm.window}
        initialFiles={pastedTradeFiles}
        onApplyTrade={(scanned) => {
          setTradeForm((prev) => ({
            ...prev,
            season: scanned.season || prev.season,
            window: scanned.window || prev.window,
            teamA: scanned.teamA || prev.teamA,
            playerA: scanned.playerA || prev.playerA,
            playerIdA: scanned.playerIdA ?? null,
            teamB: scanned.teamB || prev.teamB,
            playerB: scanned.playerB || prev.playerB,
            playerIdB: scanned.playerIdB ?? null,
            cashPayer: scanned.cashPayer || "none",
            cashAmount: scanned.cashAmount !== undefined ? String(scanned.cashAmount) : "",
          }));
        }}
        onSubmitDirect={async (scannedTrade) => {
          await onSubmit(scannedTrade);
        }}
      />
    </div>
  );
}
