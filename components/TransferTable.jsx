"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import CustomSelect from "@/components/CustomSelect";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "az", label: "Player (A-Z)" },
  { value: "za", label: "Player (Z-A)" },
];

export default function TransferTable({ logs, teams, onEdit, onDelete, canEdit }) {
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("All");
  const [sortMode, setSortMode] = useState("newest");

  const processedLogs = useMemo(() => {
    const term = search.toLowerCase();
    const filtered = logs.filter((log) => {
      const matchesSearch = log.player.toLowerCase().includes(term);
      const matchesTeam = teamFilter === "All" || log.team === teamFilter;
      return matchesSearch && matchesTeam;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sortMode === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sortMode === "az") return a.player.localeCompare(b.player);
      if (sortMode === "za") return b.player.localeCompare(a.player);
      return 0;
    });

    return sorted;
  }, [logs, search, teamFilter, sortMode]);

  const teamOptions = useMemo(
    () => [{ value: "All", label: "All Teams" }, ...teams.map((t) => ({ value: t.name, label: t.name }))],
    [teams]
  );

  return (
    <div className="lg:col-span-3 bg-neutral-800 rounded-2xl shadow-lg border border-neutral-700 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-neutral-700 flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          Active Transfer Lock
        </h2>
        <span className="bg-neutral-900 text-neutral-400 text-xs px-3 py-1 rounded-full border border-neutral-700">
          {processedLogs.length} {processedLogs.length === 1 ? "Record" : "Records"}
        </span>
      </div>

      <div className="bg-neutral-900/40 p-4 border-b border-neutral-700 flex flex-col sm:flex-row gap-4 items-center justify-between text-sm">
        <div className="w-full sm:w-1/3 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
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
          />
          <CustomSelect value={sortMode} onChange={setSortMode} options={SORT_OPTIONS} className="flex-1 sm:w-44" />
        </div>
      </div>

      <div className="overflow-x-auto flex-1 custom-scrollbar">
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
            {processedLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 whitespace-normal">
                  <div className="flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 mb-3 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1"
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <p>No matching transfers found.</p>
                  </div>
                </td>
              </tr>
            )}
            {processedLogs.map((log) => (
              <tr key={log.id} className="hover:bg-neutral-700/30 transition-colors">
                <td className="px-6 py-4 font-medium text-white">
                  <span className="block">{log.player}</span>
                  <span className="text-xs text-neutral-500">{log.purchase_date || ""}</span>
                </td>
                <td className="px-6 py-4 text-neutral-300">
                  {log.team || <span className="text-neutral-500 italic">Unknown</span>}
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
                <td className="px-6 py-4 text-right space-x-2">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => onEdit(log)}
                        className="text-neutral-400 hover:text-blue-400 transition-colors p-1"
                        title="Edit Log"
                      >
                        <svg className="w-5 h-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                        title="Delete Log"
                      >
                        <svg className="w-5 h-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
