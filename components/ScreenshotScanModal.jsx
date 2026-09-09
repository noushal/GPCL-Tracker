"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateSaleEligibility, formatCurrency } from "@/lib/utils";
import CustomSelect from "@/components/CustomSelect";

const SEASONS = Array.from({ length: 8 }, (_, i) => `Season ${i + 1}`);
const WINDOWS = ["Summer Transfer (Pre-Season)", "Winter Transfer"];
const SEASON_OPTIONS = SEASONS.map((s) => ({ value: s, label: s }));
const WINDOW_OPTIONS = WINDOWS.map((w) => ({ value: w, label: w }));

export default function ScreenshotScanModal({
  isOpen,
  onClose,
  teams = [],
  defaultTeam = "",
  defaultSeason = "Season 2",
  defaultWindow = WINDOWS[0],
  session,
  onSuccess,
  initialFiles = [],
  initialFile = null,
}) {
  const [selectedTeam, setSelectedTeam] = useState(defaultTeam);
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason);
  const [selectedWindow, setSelectedWindow] = useState(defaultWindow);

  // Array of loaded images: [{ id, dataUrl, mimeType, name }]
  const [images, setImages] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [purchases, setPurchases] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (defaultTeam) setSelectedTeam(defaultTeam);
    if (defaultSeason) setSelectedSeason(defaultSeason);
    if (defaultWindow) setSelectedWindow(defaultWindow);
  }, [defaultTeam, defaultSeason, defaultWindow]);

  // Handle incoming initial files from paste on parent component
  useEffect(() => {
    if (!isOpen) return;
    const filesToProcess = [];
    if (Array.isArray(initialFiles) && initialFiles.length > 0) {
      filesToProcess.push(...initialFiles);
    } else if (initialFile) {
      filesToProcess.push(initialFile);
    }
    if (filesToProcess.length > 0) {
      processImageFiles(filesToProcess);
    }
  }, [initialFiles, initialFile, isOpen]);

  // Handle global paste (Ctrl+V) when modal is open
  useEffect(() => {
    if (!isOpen) return;

    function handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        processImageFiles(pastedFiles);
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, images]);

  // Reset when closing
  function handleClose() {
    if (isScanning || isImporting) return;
    setImages([]);
    setPurchases([]);
    setSelectedIndices(new Set());
    setError("");
    setSuccessMsg("");
    onClose();
  }

  // Convert File object to base64
  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function processImageFiles(fileList) {
    const validFiles = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) {
      setError("Please select valid image files (PNG, JPEG, WebP).");
      return;
    }

    setError("");
    setSuccessMsg("");

    try {
      const newImages = await Promise.all(
        validFiles.map(async (file, idx) => {
          const dataUrl = await readFileAsDataUrl(file);
          return {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${idx}`,
            dataUrl,
            mimeType: file.type || "image/png",
            name: file.name || `Screenshot ${images.length + idx + 1}`,
          };
        })
      );

      // If we already have images, append them and scan only the new ones
      const hasExistingImages = images.length > 0;
      setImages((prev) => [...prev, ...newImages]);

      await scanScreenshots(newImages, !hasExistingImages);
    } catch (err) {
      setError("Failed to read image file(s): " + err.message);
    }
  }

  async function scanScreenshots(imagesToScan, replaceMode = false) {
    if (!imagesToScan || imagesToScan.length === 0) return;

    setIsScanning(true);
    setError("");

    try {
      const res = await fetch("/api/scan-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: imagesToScan.map((img) => ({
            imageBase64: img.dataUrl,
            mimeType: img.mimeType,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Failed to scan screenshot(s)");
      }

      const detected = data.purchases || [];

      if (replaceMode) {
        if (detected.length === 0) {
          setError("No purchases with debit ≥ £1,000,000 found in the screenshot(s).");
          setPurchases([]);
          setSelectedIndices(new Set());
        } else {
          setPurchases(detected);
          setSelectedIndices(new Set(detected.map((_, i) => i)));
        }
      } else {
        // Append mode
        if (detected.length === 0) {
          setError("No additional purchases with debit ≥ £1,000,000 found in newly added screenshot(s).");
        } else {
          setPurchases((prev) => {
            const startIdx = prev.length;
            const updated = [...prev, ...detected];
            // Auto-select the newly added items
            setSelectedIndices((oldSet) => {
              const next = new Set(oldSet);
              detected.forEach((_, i) => next.add(startIdx + i));
              return next;
            });
            return updated;
          });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  }

  function handleRescanAll() {
    if (images.length === 0) return;
    scanScreenshots(images, true);
  }

  function removeImage(id) {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      if (updated.length === 0) {
        setPurchases([]);
        setSelectedIndices(new Set());
      }
      return updated;
    });
  }

  function clearAllImages() {
    setImages([]);
    setPurchases([]);
    setSelectedIndices(new Set());
    setError("");
  }

  const teamOptions = useMemo(
    () => [
      { value: "", label: "Select a team...", disabled: true },
      ...teams.map((t) => ({ value: t.name, label: t.name, logo: t.logo_url || null })),
    ],
    [teams]
  );

  function toggleSelectAll() {
    if (selectedIndices.size === purchases.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(purchases.map((_, i) => i)));
    }
  }

  function toggleIndex(idx) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function updatePurchase(idx, field, value) {
    setPurchases((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function removePurchase(idx) {
    setPurchases((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIndices((prev) => {
      const next = new Set();
      purchases.forEach((_, i) => {
        if (i < idx && prev.has(i)) next.add(i);
        else if (i > idx && prev.has(i)) next.add(i - 1);
      });
      return next;
    });
  }

  async function handleImport() {
    if (!selectedTeam) {
      setError("Please select a team before importing.");
      return;
    }

    const itemsToImport = purchases.filter((_, i) => selectedIndices.has(i));
    if (itemsToImport.length === 0) {
      setError("Please select at least one purchase to import.");
      return;
    }

    const MIN_FEE = 1_000_000;
    const invalidFee = itemsToImport.find((item) => Number(item.fee) < MIN_FEE);
    if (invalidFee) {
      setError(`Player "${invalidFee.player}" has fee under £1,000,000.`);
      return;
    }

    setIsImporting(true);
    setError("");

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Could not connect to Supabase");

      const saleEligibility = calculateSaleEligibility(selectedSeason, selectedWindow);

      const rows = itemsToImport.map((item) => ({
        team: selectedTeam,
        player: item.player.trim(),
        player_id: null,
        fee: Number(item.fee),
        season: selectedSeason,
        transfer_window: selectedWindow,
        purchase_date: item.date || new Date().toISOString().split("T")[0],
        sale_eligibility: saleEligibility,
        created_by: session?.user?.id ?? null,
      }));

      let { error: insertError } = await supabase.from("transfer_logs").insert(rows);

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccessMsg(`Successfully added ${rows.length} transfers to ${selectedTeam}!`);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        handleClose();
      }, 1400);
    } catch (err) {
      setError(err.message || "Failed to import purchases");
    } finally {
      setIsImporting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-neutral-200">
        {/* ── Modal Header ── */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between gap-3 bg-neutral-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                Scan Purchases from Screenshots
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Debit ≥ £1M Only
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Paste screenshots with <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">Ctrl+V</kbd> or upload multiple images
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isScanning || isImporting}
            className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          {/* Top transfer config: Team, Season, Window */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-950/50 p-3.5 rounded-xl border border-neutral-800 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Purchasing Club</label>
              <CustomSelect
                value={selectedTeam}
                onChange={setSelectedTeam}
                options={teamOptions}
                searchable
                searchPlaceholder="Select team..."
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Season</label>
              <CustomSelect value={selectedSeason} onChange={setSelectedSeason} options={SEASON_OPTIONS} />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Transfer Window</label>
              <CustomSelect value={selectedWindow} onChange={setSelectedWindow} options={WINDOW_OPTIONS} />
            </div>
          </div>

          {/* Hidden multi-file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processImageFiles(e.target.files);
                e.target.value = ""; // allow re-selecting same files
              }
            }}
          />

          {/* Upload / Drag & Drop Zone when NO images are loaded */}
          {images.length === 0 ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                  processImageFiles(e.dataTransfer.files);
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
                  Click to choose screenshot(s) or drag & drop
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  You can select multiple screenshots at once, or press <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">Ctrl+V</kbd> to paste
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Loaded Images Gallery Header & Thumbnails Strip */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                    processImageFiles(e.dataTransfer.files);
                  }
                }}
                className="p-3.5 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-3"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <p className="text-xs font-semibold text-white">
                      {images.length} {images.length === 1 ? "Screenshot" : "Screenshots"} Loaded
                    </p>
                    <span className="text-neutral-500 text-xs">·</span>
                    <p className="text-xs text-neutral-400">
                      {isScanning
                        ? "Analyzing with Gemini Vision..."
                        : `${purchases.length} ${purchases.length === 1 ? "purchase" : "purchases"} detected`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isScanning || isImporting}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center gap-1.5 border border-neutral-700"
                    >
                      <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Add More
                    </button>
                    <button
                      type="button"
                      onClick={handleRescanAll}
                      disabled={isScanning || isImporting}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 transition-colors flex items-center gap-1.5"
                      title="Re-scan all loaded screenshots"
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
                      Re-scan All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllImages}
                      disabled={isScanning || isImporting}
                      className="text-xs px-2 py-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                      title="Clear all screenshots"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Thumbnails Row */}
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 custom-scrollbar">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      className="relative group rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900 w-24 h-16 shrink-0 shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.dataUrl}
                        alt={`Screenshot ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1">
                        <p className="text-[10px] text-neutral-300 truncate font-mono">
                          #{idx + 1}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(img.id);
                        }}
                        disabled={isScanning || isImporting}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-neutral-900/90 hover:bg-red-600 text-neutral-300 hover:text-white flex items-center justify-center text-[10px] transition-colors shadow"
                        title="Remove screenshot"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Quick "+ Add" card */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning || isImporting}
                    className="w-20 h-16 rounded-lg border border-dashed border-neutral-700 hover:border-blue-500 bg-neutral-900/50 hover:bg-neutral-900 text-neutral-400 hover:text-blue-400 flex flex-col items-center justify-center gap-1 shrink-0 transition-colors text-[10px] cursor-pointer"
                    title="Add more screenshots"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Scanning status indicator */}
              {isScanning && (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-center bg-neutral-950/30 rounded-xl border border-neutral-800">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs sm:text-sm font-medium text-blue-400 animate-pulse">
                    Analyzing {images.length} {images.length === 1 ? "screenshot" : "screenshots"} with Gemini Vision...
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Extracting all purchases where debit ≥ £1,000,000 in parallel
                  </p>
                </div>
              )}

              {/* Purchases table */}
              {!isScanning && purchases.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-blue-400 hover:underline font-medium"
                      >
                        {selectedIndices.size === purchases.length ? "Deselect All" : "Select All"}
                      </button>
                      <span className="text-neutral-500">·</span>
                      <span className="text-neutral-400">
                        {selectedIndices.size} of {purchases.length} selected
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPurchases((prev) => [
                          ...prev,
                          {
                            player: "",
                            fee: 1000000,
                            date: new Date().toISOString().split("T")[0],
                          },
                        ])
                      }
                      className="text-neutral-400 hover:text-white flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Row
                    </button>
                  </div>

                  <div className="border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-800 bg-neutral-950/40">
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider bg-neutral-950/80">
                      <div className="col-span-1 flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIndices.size === purchases.length && purchases.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-0 cursor-pointer"
                        />
                      </div>
                      <div className="col-span-3">Date</div>
                      <div className="col-span-4">Player</div>
                      <div className="col-span-3">Transfer Fee</div>
                      <div className="col-span-1 text-right">Action</div>
                    </div>

                    <div className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-neutral-800/60 custom-scrollbar">
                      {purchases.map((item, idx) => {
                        const isSelected = selectedIndices.has(idx);
                        return (
                          <div
                            key={idx}
                            className={`grid grid-cols-12 gap-2 px-3 py-2.5 items-center transition-colors ${
                              isSelected ? "bg-neutral-900/40" : "opacity-50"
                            }`}
                          >
                            <div className="col-span-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleIndex(idx)}
                                className="rounded border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-0 cursor-pointer"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="date"
                                value={item.date || ""}
                                onChange={(e) => updatePurchase(idx, "date", e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={item.player || ""}
                                placeholder="Player Name"
                                onChange={(e) => updatePurchase(idx, "player", e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="col-span-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1 text-xs text-neutral-500">£</span>
                                <input
                                  type="number"
                                  step="100000"
                                  min="1000000"
                                  value={item.fee ?? ""}
                                  onChange={(e) => updatePurchase(idx, "fee", e.target.value)}
                                  className="w-full bg-neutral-900 border border-neutral-700 rounded pl-5 pr-2 py-1 text-xs text-emerald-400 font-semibold focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                            <div className="col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => removePurchase(idx)}
                                className="text-neutral-500 hover:text-red-400 p-1 rounded transition-colors"
                                title="Remove row"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback messages */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 flex items-center justify-between gap-3 bg-neutral-900/90">
          <button
            onClick={handleClose}
            disabled={isScanning || isImporting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleImport}
            disabled={isScanning || isImporting || selectedIndices.size === 0 || !selectedTeam}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Importing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Import {selectedIndices.size} Purchases to {selectedTeam || "Club"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
