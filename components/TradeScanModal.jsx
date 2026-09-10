"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CustomSelect from "@/components/CustomSelect";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";
import { formatCurrency } from "@/lib/utils";

const SEASONS = Array.from({ length: 8 }, (_, i) => `Season ${i + 1}`);
const WINDOWS = ["Summer Transfer (Pre-Season)", "Winter Transfer"];
const SEASON_OPTIONS = SEASONS.map((s) => ({ value: s, label: s }));
const WINDOW_OPTIONS = WINDOWS.map((w) => ({ value: w, label: w }));

export function matchTeamToClub(rawName, teams = []) {
  if (!rawName || !teams || teams.length === 0) return "";
  const clean = rawName.trim().toLowerCase();

  // 1. Exact match with team.name
  const exact = teams.find((t) => t.name.toLowerCase() === clean);
  if (exact) return exact.name;

  // 2. Exact match with username inside parentheses e.g. "Santos (JohnnyRainbow)" -> "JohnnyRainbow"
  const inParen = teams.find((t) => {
    const m = t.name.match(/\(([^)]+)\)/);
    return m && m[1].toLowerCase().trim() === clean;
  });
  if (inParen) return inParen.name;

  // 3. Substring match
  const sub = teams.find(
    (t) =>
      t.name.toLowerCase().includes(clean) ||
      clean.includes(t.name.toLowerCase())
  );
  if (sub) return sub.name;

  // 4. Word-level match
  const cleanWords = clean.split(/[^a-z0-9]+/i).filter((w) => w.length >= 3);
  if (cleanWords.length > 0) {
    const wordMatch = teams.find((t) => {
      const tLower = t.name.toLowerCase();
      return cleanWords.some((w) => tLower.includes(w));
    });
    if (wordMatch) return wordMatch.name;
  }

  return "";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function TradeScanModal({
  isOpen,
  onClose,
  teams = [],
  defaultSeason = "Season 2",
  defaultWindow = WINDOWS[0],
  initialFiles = [],
  onClearInitialFiles = null,
  onApplyTrade,
  onSubmitDirect = null,
}) {
  const [image, setImage] = useState(null); // { id, dataUrl, mimeType, name }
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [detectedRaw, setDetectedRaw] = useState(null);

  const [tradeData, setTradeData] = useState({
    season: defaultSeason,
    window: defaultWindow,
    teamA: "",
    playerA: "",
    playerIdA: null,
    teamB: "",
    playerB: "",
    playerIdB: null,
    cashPayer: "none", // "none" | "teamA" | "teamB"
    cashAmount: "",
  });

  const fileInputRef = useRef(null);
  const processedInitialRef = useRef(false);

  useEffect(() => {
    if (defaultSeason) setTradeData((prev) => ({ ...prev, season: defaultSeason }));
    if (defaultWindow) setTradeData((prev) => ({ ...prev, window: defaultWindow }));
  }, [defaultSeason, defaultWindow]);

  const teamOptions = useMemo(
    () => [
      { value: "", label: "Select a club...", disabled: true },
      ...teams.map((t) => ({ value: t.name, label: t.name, logo: t.logo_url || null })),
    ],
    [teams]
  );

  // Handle incoming initial files (e.g. from Ctrl+V paste on main page)
  useEffect(() => {
    if (!isOpen) {
      processedInitialRef.current = false;
      return;
    }
    if (processedInitialRef.current) return;

    if (Array.isArray(initialFiles) && initialFiles.length > 0) {
      processedInitialRef.current = true;
      handleFileSelected(initialFiles[0]);
      if (onClearInitialFiles) onClearInitialFiles();
    }
  }, [initialFiles, isOpen, onClearInitialFiles]);

  // Handle Ctrl+V paste while modal is open
  useEffect(() => {
    if (!isOpen) return;

    function handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleFileSelected(file);
            break;
          }
        }
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  async function handleFileSelected(file) {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPEG, WebP).");
      return;
    }

    setError("");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const imgObj = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        dataUrl,
        mimeType: file.type || "image/png",
        name: file.name || "Trade Screenshot",
      };
      setImage(imgObj);
      await scanTradeScreenshot(imgObj);
    } catch (err) {
      setError("Failed to load image: " + err.message);
    }
  }

  async function scanTradeScreenshot(imgObj) {
    if (!imgObj?.dataUrl) return;

    setIsScanning(true);
    setError("");

    try {
      const res = await fetch("/api/scan-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imgObj.dataUrl,
          mimeType: imgObj.mimeType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Failed to analyze trade screenshot");
      }

      const trade = data.trade;
      setDetectedRaw(trade);

      // Auto match clubs from parsed usernames / team names
      const matchedA = matchTeamToClub(trade.userA, teams);
      const matchedB = matchTeamToClub(trade.userB, teams);

      setTradeData((prev) => ({
        ...prev,
        teamA: matchedA || prev.teamA,
        playerA: trade.playerA || prev.playerA,
        teamB: matchedB || prev.teamB,
        playerB: trade.playerB || prev.playerB,
        cashPayer: trade.cashPayer || "none",
        cashAmount: trade.cashAmount ? String(trade.cashAmount) : "",
      }));
    } catch (err) {
      setError(err.message || "Failed to analyze trade screenshot");
    } finally {
      setIsScanning(false);
    }
  }

  function handleSwapSides() {
    setTradeData((prev) => ({
      ...prev,
      teamA: prev.teamB,
      playerA: prev.playerB,
      playerIdA: prev.playerIdB,
      teamB: prev.teamA,
      playerB: prev.playerA,
      playerIdB: prev.playerIdA,
      cashPayer: prev.cashPayer === "teamA" ? "teamB" : prev.cashPayer === "teamB" ? "teamA" : "none",
    }));
  }

  function handleClose() {
    if (isScanning || isSubmitting) return;
    setImage(null);
    setDetectedRaw(null);
    setError("");
    onClose();
  }

  function handleApply() {
    if (!tradeData.teamA && !tradeData.playerA && !tradeData.teamB && !tradeData.playerB) {
      setError("Please load and scan a trade screenshot first.");
      return;
    }
    if (onApplyTrade) {
      onApplyTrade(tradeData);
    }
    handleClose();
  }

  async function handleDirectLog() {
    if (!tradeData.teamA || !tradeData.teamB) {
      setError("Please select both Club A and Club B before logging.");
      return;
    }
    if (tradeData.teamA === tradeData.teamB) {
      setError("Club A and Club B cannot be the same club.");
      return;
    }
    if (!tradeData.playerA.trim() || !tradeData.playerB.trim()) {
      setError("Please ensure both Player A and Player B have valid names.");
      return;
    }
    if (tradeData.cashPayer !== "none") {
      const amt = Number(tradeData.cashAmount);
      if (isNaN(amt) || amt <= 0) {
        setError("Please enter a valid cash compensation amount or select Straight Swap.");
        return;
      }
    }

    if (!onSubmitDirect) {
      handleApply();
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSubmitDirect({
        mode: "trade",
        ...tradeData,
        cashAmount: tradeData.cashPayer === "none" ? 0 : Number(tradeData.cashAmount || 0),
      });
      handleClose();
    } catch (err) {
      setError(err.message || "Failed to log trade.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const clubAName = tradeData.teamA ? tradeData.teamA.split("(")[0].trim() : "Club A";
  const clubBName = tradeData.teamB ? tradeData.teamB.split("(")[0].trim() : "Club B";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* ── Header ── */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between gap-3 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Scan Player Trade from Screenshot
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Gemini AI
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Upload or paste a screenshot of the in-game Trade Details window to auto-populate the trade
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isScanning || isSubmitting}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          {/* Season & Window selectors */}
          <div className="grid grid-cols-2 gap-3 bg-neutral-950/50 p-3 rounded-xl border border-neutral-800 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Season</label>
              <CustomSelect
                value={tradeData.season}
                onChange={(v) => setTradeData((prev) => ({ ...prev, season: v }))}
                options={SEASON_OPTIONS}
                buttonClassName="px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Window</label>
              <CustomSelect
                value={tradeData.window}
                onChange={(v) => setTradeData((prev) => ({ ...prev, window: v }))}
                options={WINDOW_OPTIONS}
                buttonClassName="px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelected(e.target.files[0]);
                e.target.value = "";
              }
            }}
          />

          {/* Upload / Drag & Drop Zone if NO image */}
          {!image ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
                  handleFileSelected(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-700 hover:border-blue-500/60 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-colors bg-neutral-950/20 hover:bg-neutral-950/40 flex flex-col items-center justify-center gap-3 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-blue-400 shadow-md group-hover:scale-105 transition-transform">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Click to upload trade screenshot or drag & drop
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Or press <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">Ctrl+V</kbd> anywhere to paste
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Loaded Screenshot strip */}
              <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-16 h-12 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.dataUrl} alt="Trade Screenshot" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{image.name}</p>
                    <p className="text-[11px] text-neutral-400">
                      {isScanning ? (
                        <span className="text-blue-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                          Analyzing with Gemini Vision...
                        </span>
                      ) : (
                        <span className="text-emerald-400">Trade parsed successfully</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => scanTradeScreenshot(image)}
                    disabled={isScanning || isSubmitting}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 transition-colors flex items-center gap-1.5"
                  >
                    <svg
                      className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Re-scan
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning || isSubmitting}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                  >
                    Change Image
                  </button>
                </div>
              </div>

              {/* Scanning status banner */}
              {isScanning && (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-center bg-neutral-950/30 rounded-xl border border-neutral-800">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs sm:text-sm font-medium text-blue-400 animate-pulse">
                    Reading trade participants, swapped players, and cash compensation...
                  </p>
                </div>
              )}

              {/* Review & Edit Trade Details */}
              {!isScanning && (
                <div className="space-y-3">
                  {/* Side A: Club A & Player A */}
                  <div className="bg-neutral-950/40 p-3.5 rounded-xl border border-blue-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        Club A (Left Side)
                      </span>
                      {detectedRaw?.userA && (
                        <span className="text-[10px] text-neutral-400 font-mono bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700">
                          Detected User: {detectedRaw.userA}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1">Select Club A</label>
                      <CustomSelect
                        value={tradeData.teamA}
                        onChange={(v) => setTradeData((prev) => ({ ...prev, teamA: v }))}
                        options={teamOptions}
                        buttonClassName="px-3 py-2 text-xs"
                        searchable
                        searchPlaceholder="Select Club A..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                        Player A (leaving Club A)
                      </label>
                      <PlayerAutocomplete
                        value={tradeData.playerA}
                        onChange={(v) =>
                          setTradeData((prev) => ({
                            ...prev,
                            playerA: typeof v === "string" ? v.replace(/[0-9]/g, "") : v,
                            playerIdA: null,
                          }))
                        }
                        onSelectPlayer={(p) =>
                          setTradeData((prev) => ({ ...prev, playerA: p.name, playerIdA: p.id }))
                        }
                        placeholder="e.g. Amadou Onana"
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Swap sides divider button */}
                  <div className="flex items-center justify-center relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-neutral-800"></div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSwapSides}
                      className="relative bg-neutral-800 hover:bg-neutral-700 text-blue-400 hover:text-blue-300 text-xs px-3 py-1 rounded-full border border-neutral-700 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      title="Swap Club A and Club B"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span>SWAP SIDES</span>
                    </button>
                  </div>

                  {/* Side B: Club B & Player B */}
                  <div className="bg-neutral-950/40 p-3.5 rounded-xl border border-purple-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        Club B (Right Side)
                      </span>
                      {detectedRaw?.userB && (
                        <span className="text-[10px] text-neutral-400 font-mono bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700">
                          Detected User: {detectedRaw.userB}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1">Select Club B</label>
                      <CustomSelect
                        value={tradeData.teamB}
                        onChange={(v) => setTradeData((prev) => ({ ...prev, teamB: v }))}
                        options={teamOptions}
                        buttonClassName="px-3 py-2 text-xs"
                        searchable
                        searchPlaceholder="Select Club B..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                        Player B (leaving Club B)
                      </label>
                      <PlayerAutocomplete
                        value={tradeData.playerB}
                        onChange={(v) =>
                          setTradeData((prev) => ({
                            ...prev,
                            playerB: typeof v === "string" ? v.replace(/[0-9]/g, "") : v,
                            playerIdB: null,
                          }))
                        }
                        onSelectPlayer={(p) =>
                          setTradeData((prev) => ({ ...prev, playerB: p.name, playerIdB: p.id }))
                        }
                        placeholder="e.g. Malcom"
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Cash Compensation */}
                  <div className="bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-neutral-300">Cash Compensation</label>
                      {tradeData.cashPayer !== "none" && tradeData.cashAmount && (
                        <span className="text-xs text-emerald-400 font-semibold font-mono">
                          +{formatCurrency(tradeData.cashAmount)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setTradeData((prev) => ({ ...prev, cashPayer: "none", cashAmount: "" }))
                        }
                        className={`py-2 px-2.5 rounded-lg text-xs font-medium transition-all text-center ${
                          tradeData.cashPayer === "none"
                            ? "bg-blue-600/30 border border-blue-500 text-white font-semibold"
                            : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        Straight Swap (£0)
                      </button>

                      <button
                        type="button"
                        onClick={() => setTradeData((prev) => ({ ...prev, cashPayer: "teamA" }))}
                        className={`py-2 px-2.5 rounded-lg text-xs font-medium transition-all truncate text-center ${
                          tradeData.cashPayer === "teamA"
                            ? "bg-blue-600/30 border border-blue-500 text-white font-semibold"
                            : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {clubAName} pays
                      </button>

                      <button
                        type="button"
                        onClick={() => setTradeData((prev) => ({ ...prev, cashPayer: "teamB" }))}
                        className={`py-2 px-2.5 rounded-lg text-xs font-medium transition-all truncate text-center ${
                          tradeData.cashPayer === "teamB"
                            ? "bg-blue-600/30 border border-blue-500 text-white font-semibold"
                            : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {clubBName} pays
                      </button>
                    </div>

                    {tradeData.cashPayer !== "none" && (
                      <div className="relative mt-2 animate-fade-in">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-mono">
                          £
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="500000"
                          value={tradeData.cashAmount}
                          onChange={(e) =>
                            setTradeData((prev) => ({ ...prev, cashAmount: e.target.value }))
                          }
                          placeholder="e.g. 9500000"
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 flex items-center justify-between gap-3 bg-neutral-900/90 flex-wrap">
          <button
            type="button"
            onClick={handleClose}
            disabled={isScanning || isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            {onSubmitDirect && (
              <button
                type="button"
                onClick={handleDirectLog}
                disabled={isScanning || isSubmitting || !image}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Logging...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Log Trade Directly</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleApply}
              disabled={isScanning || isSubmitting || !image}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Apply to Trade Form</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
