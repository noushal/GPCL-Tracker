"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { getFlagUrl } from "@/lib/countryFlags";
import CustomSelect from "@/components/CustomSelect";

const PAGE_SIZE = 7;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "az", label: "Player (A-Z)" },
  { value: "za", label: "Player (Z-A)" },
  { value: "fee-desc", label: "Fee (High to Low)" },
  { value: "fee-asc", label: "Fee (Low to High)" },
  { value: "duplicates", label: "Duplicate Values" },
];

function EmptyState({ isDuplicateMode = false }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center text-neutral-500">
      {isDuplicateMode ? (
        <>
          <div className="w-12 h-12 mb-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-neutral-200 font-medium">No duplicate transfers found</p>
          <p className="text-xs text-neutral-500 mt-1">All player transfer records are unique.</p>
        </>
      ) : (
        <>
          <svg className="w-12 h-12 mb-3 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p>No matching transfers found.</p>
        </>
      )}
    </div>
  );
}

function PlayerName({ log, extraInfo, duplicateInfo }) {
  const position = log.players?.position || extraInfo?.position;
  const nationality = log.players?.nationality || extraInfo?.nationality;
  const age = log.players?.age || extraInfo?.age;
  const flagUrl = getFlagUrl(nationality);

  return (
    <div className="flex items-center gap-2 min-w-0 flex-wrap">
      <span className="truncate">{log.player}</span>
      {position && (
        <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-700/60 px-1.5 py-0.5 rounded shrink-0">
          {position}
        </span>
      )}
      {age && (
        <span
          className="text-[10px] font-semibold text-neutral-400 bg-neutral-700/60 px-1.5 py-0.5 rounded shrink-0"
          title={`Age: ${age} years old`}
        >
          {age}y
        </span>
      )}
      {flagUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={flagUrl}
          alt={nationality}
          title={nationality}
          className="w-5 h-3.5 object-cover rounded-sm shrink-0 border border-neutral-700"
        />
      )}
      {duplicateInfo && duplicateInfo.count > 1 && (
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 border flex items-center gap-1 ${
            duplicateInfo.isExact
              ? "bg-red-500/20 text-red-300 border-red-500/40"
              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
          }`}
          title={duplicateInfo.tooltip}
        >
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {duplicateInfo.isExact ? "Exact Duplicate" : `Duplicate (${duplicateInfo.count}x)`}
        </span>
      )}
    </div>
  );
}

function AddedBy({ username }) {
  if (!username) return null;
  return (
    <span className="text-neutral-600" title={`Logged by ${username}`}>
      {" "}
      · by {username}
    </span>
  );
}

function RowActions({ log, onEdit, onDelete }) {
  return (
    <>
      <button
        onClick={() => onEdit(log)}
        className="text-neutral-400 hover:text-blue-400 transition-colors p-1.5 hover:bg-neutral-700/50 rounded-lg"
        title="Edit Log"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>
      <button
        onClick={() => onDelete(log)}
        className="text-neutral-500 hover:text-red-400 transition-colors p-1.5 hover:bg-neutral-700/50 rounded-lg"
        title="Delete Log"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </>
  );
}

// ─── Pagination bar ──────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  // Show at most 5 page numbers, centred around the current page
  const pageNums = useMemo(() => {
    const delta = 2;
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-neutral-700 flex-wrap">
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-neutral-400 hover:text-white hover:bg-neutral-700/60"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>

      {/* Leading ellipsis */}
      {pageNums[0] > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="w-8 h-8 rounded-lg text-sm text-neutral-400 hover:bg-neutral-700/60 hover:text-white transition-colors">
            1
          </button>
          {pageNums[0] > 2 && <span className="text-neutral-600 px-1">…</span>}
        </>
      )}

      {pageNums.map((n) => (
        <button
          key={n}
          onClick={() => onPageChange(n)}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
            n === currentPage
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
              : "text-neutral-400 hover:bg-neutral-700/60 hover:text-white"
          }`}
        >
          {n}
        </button>
      ))}

      {/* Trailing ellipsis */}
      {pageNums[pageNums.length - 1] < totalPages && (
        <>
          {pageNums[pageNums.length - 1] < totalPages - 1 && <span className="text-neutral-600 px-1">…</span>}
          <button onClick={() => onPageChange(totalPages)} className="w-8 h-8 rounded-lg text-sm text-neutral-400 hover:bg-neutral-700/60 hover:text-white transition-colors">
            {totalPages}
          </button>
        </>
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-neutral-400 hover:text-white hover:bg-neutral-700/60"
      >
        Next
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TransferTable({ logs, teams, onEdit, onDelete, canEdit }) {
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("All");
  const [sortMode, setSortMode] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullTeamView, setIsFullTeamView] = useState(false);

  const isTeamSelected = teamFilter !== "All";

  // Group logs by normalized player name across all transfers
  const playerStats = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      const key = (log.player || "").trim().toLowerCase();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { logs: [], teams: new Set() });
      }
      const entry = map.get(key);
      entry.logs.push(log);
      if (log.team) entry.teams.add(log.team);
    });
    return map;
  }, [logs]);

  // Exact duplicate signature check (same player + same team + same season + same window)
  const exactDuplicateMap = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      const key = [
        (log.player || "").trim().toLowerCase(),
        (log.team || "").trim().toLowerCase(),
        (log.season || "").trim().toLowerCase(),
        (log.transfer_window || "").trim().toLowerCase(),
      ].join("||");
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [logs]);

  const getDuplicateInfo = (log) => {
    const key = (log.player || "").trim().toLowerCase();
    const stats = playerStats.get(key);
    const count = stats?.logs?.length || 0;
    if (count <= 1) return null;

    const exactKey = [
      (log.player || "").trim().toLowerCase(),
      (log.team || "").trim().toLowerCase(),
      (log.season || "").trim().toLowerCase(),
      (log.transfer_window || "").trim().toLowerCase(),
    ].join("||");
    const exactCount = exactDuplicateMap.get(exactKey) || 0;
    const isExact = exactCount > 1;

    const teamList = Array.from(stats?.teams || []);
    const otherTeams = teamList.filter((t) => t !== log.team);

    let tooltip = "";
    if (isExact) {
      tooltip = `Exact duplicate: ${exactCount} identical transfer logs found for ${log.player} in ${log.team}`;
    } else if (otherTeams.length > 0) {
      tooltip = `Duplicate player: logged ${count} times across ${teamList.join(", ")}`;
    } else {
      tooltip = `Duplicate player: logged ${count} times for ${log.team}`;
    }

    return {
      count,
      isExact,
      exactCount,
      isMultipleTeams: otherTeams.length > 0,
      otherTeams,
      tooltip,
    };
  };

  // Reset page to 1 whenever filters, sort, or view-mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, teamFilter, sortMode, isFullTeamView]);

  // Also turn off Full Team View if the user switches back to "All Teams"
  useEffect(() => {
    if (!isTeamSelected) setIsFullTeamView(false);
  }, [isTeamSelected]);

  const processedLogs = useMemo(() => {
    const term = search.toLowerCase();
    let filtered = logs.filter((log) => {
      const matchesSearch = log.player.toLowerCase().includes(term);
      const matchesTeam = teamFilter === "All" || log.team === teamFilter;
      return matchesSearch && matchesTeam;
    });

    if (sortMode === "duplicates") {
      filtered = filtered.filter((log) => {
        const key = (log.player || "").trim().toLowerCase();
        const stats = playerStats.get(key);
        return (stats?.logs?.length || 0) > 1;
      });
    }

    return [...filtered].sort((a, b) => {
      if (sortMode === "duplicates") {
        // Group identical players together alphabetically
        const nameComp = (a.player || "").localeCompare(b.player || "");
        if (nameComp !== 0) return nameComp;
        // Within the same player, sort newest transfer first
        const dateA = new Date(a.created_at || a.purchase_date || 0).getTime();
        const dateB = new Date(b.created_at || b.purchase_date || 0).getTime();
        return dateB - dateA;
      }
      if (sortMode === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sortMode === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sortMode === "az") return a.player.localeCompare(b.player);
      if (sortMode === "za") return b.player.localeCompare(a.player);
      if (sortMode === "fee-desc") {
        const diff = (Number(b.fee) || 0) - (Number(a.fee) || 0);
        return diff !== 0 ? diff : new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortMode === "fee-asc") {
        const diff = (Number(a.fee) || 0) - (Number(b.fee) || 0);
        return diff !== 0 ? diff : new Date(b.created_at) - new Date(a.created_at);
      }
      return 0;
    });
  }, [logs, search, teamFilter, sortMode, playerStats]);

  const uniqueDuplicatePlayersCount = useMemo(() => {
    if (sortMode !== "duplicates") return 0;
    const set = new Set(processedLogs.map((l) => (l.player || "").trim().toLowerCase()).filter(Boolean));
    return set.size;
  }, [sortMode, processedLogs]);

  // Pagination slicing — bypassed entirely in Full Team View
  const totalPages = isFullTeamView ? 1 : Math.ceil(processedLogs.length / PAGE_SIZE);
  const visibleLogs = isFullTeamView
    ? processedLogs
    : processedLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Dynamic cache for player ages and details (e.g. for logs where age is not yet in Supabase)
  const [playerDetails, setPlayerDetails] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      const cached = localStorage.getItem("gpcl_player_details");
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    // Collect any visible log where age is missing in DB and not yet cached
    const missing = visibleLogs
      .filter((log) => !log.players?.age && log.player && !playerDetails[log.player.toLowerCase()]?.age)
      .map((log) => log.player);

    if (missing.length === 0) return;

    const uniqueMissing = [...new Set(missing)];
    let cancelled = false;

    async function fetchMissingDetails() {
      for (const playerName of uniqueMissing) {
        if (cancelled) break;
        try {
          const res = await fetch(`/api/player-search?name=${encodeURIComponent(playerName)}`);
          if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list) && list.length > 0) {
              const matched =
                list.find((p) => p.name.toLowerCase() === playerName.toLowerCase()) || list[0];
              if (matched) {
                setPlayerDetails((prev) => {
                  const next = {
                    ...prev,
                    [playerName.toLowerCase()]: {
                      age: matched.age,
                      position: matched.position,
                      nationality: matched.nationality,
                    },
                  };
                  try {
                    localStorage.setItem("gpcl_player_details", JSON.stringify(next));
                  } catch {}
                  return next;
                });
              }
            }
          }
        } catch (err) {
          console.warn("Could not fetch player details for", playerName, err);
        }
      }
    }

    fetchMissingDetails();
    return () => {
      cancelled = true;
    };
  }, [visibleLogs, playerDetails]);

  const teamOptions = useMemo(
    () => [{ value: "All", label: "All Teams" }, ...teams.map((t) => ({ value: t.name, label: t.name, logo: t.logo_url || null }))],
    [teams]
  );

  // logo lookup: team name → logo URL
  const teamLogoMap = useMemo(() => {
    const map = new Map();
    teams.forEach((t) => { if (t.logo_url) map.set(t.name, t.logo_url); });
    return map;
  }, [teams]);

  return (
    <div className="lg:col-span-3 min-w-0 bg-neutral-800 rounded-2xl shadow-lg border border-neutral-700 overflow-hidden flex flex-col">
      {/* ── Header ── */}
      <div className="p-4 sm:p-6 border-b border-neutral-700 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          Active Transfer Lock
        </h2>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Full Team View toggle — only shown when a specific team is filtered */}
          {isTeamSelected && (
            <button
              onClick={() => setIsFullTeamView((v) => !v)}
              title={isFullTeamView ? "Switch back to paginated view" : `Show all records for ${teamFilter}`}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                isFullTeamView
                  ? "bg-purple-600/20 border-purple-500/50 text-purple-300 hover:bg-purple-600/30"
                  : "bg-neutral-900/60 border-neutral-600 text-neutral-400 hover:border-purple-500/50 hover:text-purple-300"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              {isFullTeamView ? "Paginated View" : "Full Team View"}
            </button>
          )}

          {sortMode === "duplicates" ? (
            <span className="bg-amber-500/10 text-amber-300 text-xs px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              {processedLogs.length === 0
                ? "0 Duplicates Found"
                : `${processedLogs.length} Duplicate ${processedLogs.length === 1 ? "Record" : "Records"} (${uniqueDuplicatePlayersCount} ${uniqueDuplicatePlayersCount === 1 ? "player" : "players"})`}
              {isFullTeamView && " — Full View"}
            </span>
          ) : (
            <span className="bg-neutral-900 text-neutral-400 text-xs px-3 py-1 rounded-full border border-neutral-700">
              {isFullTeamView
                ? `${processedLogs.length} ${processedLogs.length === 1 ? "Record" : "Records"} — Full View`
                : `${processedLogs.length} ${processedLogs.length === 1 ? "Record" : "Records"}`}
            </span>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-neutral-900/40 p-4 border-b border-neutral-700 flex flex-col sm:flex-row gap-4 items-center justify-between text-sm">
        <div className="w-full sm:w-1/3 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search player name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <CustomSelect
            value={teamFilter}
            onChange={setTeamFilter}
            options={teamOptions}
            className="flex-1 sm:w-44"
            searchable
            searchPlaceholder="Search teams..."
          />
          <CustomSelect value={sortMode} onChange={setSortMode} options={SORT_OPTIONS} className="flex-1 sm:w-52" />
        </div>
      </div>

      {/* ── Mobile: stacked cards ── */}
      <div className="md:hidden flex-1">
        {visibleLogs.length === 0 ? (
          <EmptyState isDuplicateMode={sortMode === "duplicates"} />
        ) : (
          <div className="divide-y divide-neutral-700/50">
            {visibleLogs.map((log) => {
              const dupInfo = getDuplicateInfo(log);
              return (
                <div
                  key={log.id}
                  className={`p-4 space-y-3 transition-colors ${
                    sortMode === "duplicates"
                      ? dupInfo?.isExact
                        ? "bg-red-950/20 border-l-2 border-l-red-500"
                        : "bg-amber-950/15 border-l-2 border-l-amber-500"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-white">
                        <PlayerName
                          log={log}
                          extraInfo={playerDetails[log.player?.toLowerCase()]}
                          duplicateInfo={dupInfo}
                        />
                      </div>
                      <span className="text-xs text-neutral-500">
                        {log.purchase_date || ""}
                        <AddedBy username={log.profiles?.username} />
                      </span>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 shrink-0 -mr-1.5">
                        <RowActions log={log} onEdit={onEdit} onDelete={onDelete} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="min-w-0">
                      <span className="block text-[11px] text-neutral-500 uppercase tracking-wide">Team</span>
                      <span className="flex items-center gap-1.5 text-neutral-300 truncate">
                        {teamLogoMap.get(log.team) && (
                          <img src={teamLogoMap.get(log.team)} alt="" className="w-5 h-5 object-contain rounded shrink-0" />
                        )}
                        <span className="truncate">
                          {log.team || <span className="text-neutral-500 italic">Unknown</span>}
                          {dupInfo?.isMultipleTeams && teamFilter !== "All" && dupInfo.otherTeams.length > 0 && (
                            <span className="block text-[10px] text-amber-400 font-normal">
                              Also in {dupInfo.otherTeams.join(", ")}
                            </span>
                          )}
                        </span>
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-neutral-500 uppercase tracking-wide">Fee</span>
                      <span className="text-emerald-400 font-semibold">{formatCurrency(log.fee)}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-neutral-500 uppercase tracking-wide">Purchased In</span>
                      <span className="block text-white">{log.season}</span>
                      <span className="text-xs text-neutral-400">{log.transfer_window}</span>
                    </div>
                  </div>

                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-md text-xs font-semibold block w-fit">
                    Locked till {log.sale_eligibility}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tablet/desktop: full table ── */}
      <div className="hidden md:block overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-neutral-900/50 text-neutral-400 border-b border-neutral-700 uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Player</th>
              <th className="px-6 py-4 font-medium">Team</th>
              <th className="px-6 py-4 font-medium">Fee</th>
              <th className="px-6 py-4 font-medium">Purchased In</th>
              <th className="px-6 py-4 font-medium">Earliest Sale</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-700/50">
            {visibleLogs.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState isDuplicateMode={sortMode === "duplicates"} />
                </td>
              </tr>
            )}
            {visibleLogs.map((log) => {
              const dupInfo = getDuplicateInfo(log);
              return (
                <tr
                  key={log.id}
                  className={`transition-colors ${
                    sortMode === "duplicates"
                      ? dupInfo?.isExact
                        ? "bg-red-950/20 hover:bg-red-950/35 border-l-2 border-l-red-500"
                        : "bg-amber-950/15 hover:bg-amber-950/30 border-l-2 border-l-amber-500"
                      : "hover:bg-neutral-700/30"
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-white">
                    <PlayerName
                      log={log}
                      extraInfo={playerDetails[log.player?.toLowerCase()]}
                      duplicateInfo={dupInfo}
                    />
                    <span className="text-xs text-neutral-500">
                      {log.purchase_date || ""}
                      <AddedBy username={log.profiles?.username} />
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-300">
                    <span className="flex items-center gap-2">
                      {teamLogoMap.get(log.team) && (
                        <img src={teamLogoMap.get(log.team)} alt="" className="w-6 h-6 object-contain rounded shrink-0" />
                      )}
                      <span>
                        {log.team || <span className="text-neutral-500 italic">Unknown</span>}
                        {dupInfo?.isMultipleTeams && teamFilter !== "All" && dupInfo.otherTeams.length > 0 && (
                          <span className="block text-[11px] text-amber-400 font-normal">
                            Also in {dupInfo.otherTeams.join(", ")}
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-emerald-400 font-semibold">{formatCurrency(log.fee)}</td>
                  <td className="px-6 py-4">
                    <span className="block text-white">{log.season}</span>
                    <span className="text-xs text-neutral-400">{log.transfer_window}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-md text-xs font-semibold block w-fit">
                      Locked till {log.sale_eligibility}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    {canEdit && <RowActions log={log} onEdit={onEdit} onDelete={onDelete} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination (hidden in Full Team View) ── */}
      {!isFullTeamView && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* ── Full Team View footer note ── */}
      {isFullTeamView && processedLogs.length > 0 && (
        <div className="px-4 py-3 border-t border-neutral-700 text-xs text-center text-neutral-500">
          Showing all{" "}
          <span className={sortMode === "duplicates" ? "text-amber-400 font-semibold" : "text-purple-400 font-semibold"}>
            {processedLogs.length}
          </span>{" "}
          {sortMode === "duplicates" ? "duplicate records" : "records"} for{" "}
          <span className={sortMode === "duplicates" ? "text-amber-400 font-semibold" : "text-purple-400 font-semibold"}>
            {teamFilter}
          </span>
        </div>
      )}
    </div>
  );
}
