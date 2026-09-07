"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import AuthButton from "@/components/AuthButton";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 11;

const ACTION_STYLES = {
  insert: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  update: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  delete: "bg-red-500/10 text-red-400 border-red-500/20",
};

const ACTION_FILTERS = [
  { value: "", label: "All Actions" },
  { value: "insert", label: "Insert" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Pagination bar ───────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pageNums = useMemo(() => {
    const delta = 2;
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  const btn =
    "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-neutral-400 hover:text-white hover:bg-neutral-700/60";

  return (
    <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-neutral-700 flex-wrap">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className={btn}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>

      {pageNums[0] > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="w-8 h-8 rounded-lg text-sm text-neutral-400 hover:bg-neutral-700/60 hover:text-white transition-colors">1</button>
          {pageNums[0] > 2 && <span className="text-neutral-600 px-1">…</span>}
        </>
      )}

      {pageNums.map((n) => (
        <button
          key={n}
          onClick={() => onPageChange(n)}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
            n === currentPage
              ? "bg-amber-600 text-white shadow-md shadow-amber-900/40"
              : "text-neutral-400 hover:bg-neutral-700/60 hover:text-white"
          }`}
        >
          {n}
        </button>
      ))}

      {pageNums[pageNums.length - 1] < totalPages && (
        <>
          {pageNums[pageNums.length - 1] < totalPages - 1 && <span className="text-neutral-600 px-1">…</span>}
          <button onClick={() => onPageChange(totalPages)} className="w-8 h-8 rounded-lg text-sm text-neutral-400 hover:bg-neutral-700/60 hover:text-white transition-colors">{totalPages}</button>
        </>
      )}

      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className={btn}>
        Next
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ActivityPage() {
  const { isAuthed, loading: sessionLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read current URL params
  const currentPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const actionFilter = searchParams.get("action") || "";
  const rawSearch = searchParams.get("q") || "";

  // Local state for the search input — debounced before hitting URL/DB
  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebounce(searchInput, 350);

  // Data state
  const [entries, setEntries] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── URL helper ────────────────────────────────────────────────────────────
  const pushParams = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v === "" || v === null || v === undefined) params.delete(k);
        else params.set(k, String(v));
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Sync debounced search → URL (resets to page 1)
  const isFirstSearchRender = useRef(true);
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    pushParams({ q: debouncedSearch, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // ── Fetch data whenever URL params change ─────────────────────────────────
  useEffect(() => {
    if (sessionLoading || !isAuthed) {
      setLoading(false);
      return;
    }
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, isAuthed, currentPage, actionFilter, rawSearch]);

  async function fetchPage() {
    const supabase = createClient();
    if (!supabase) return;
    setLoading(true);

    const offset = (currentPage - 1) * PAGE_SIZE;

    // Build query
    let query = supabase
      .from("activity_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (actionFilter) {
      query = query.eq("action", actionFilter);
    }

    if (rawSearch.trim()) {
      // Search across the summary text and the actor username
      query = query.or(
        `entity_summary.ilike.%${rawSearch.trim()}%,actor_username.ilike.%${rawSearch.trim()}%`
      );
    }

    const { data, count } = await query;
    setEntries(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function handlePageChange(page) {
    pushParams({ page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleActionChange(value) {
    pushParams({ action: value, page: 1 });
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-[95%] mx-auto space-y-6">
        {/* ── Header ── */}
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
              <h1 className="text-3xl font-bold text-amber-500">Activity Log</h1>
              <p className="text-sm text-neutral-500 mt-0.5">
                Every add/edit/delete, recorded automatically — visible here, never editable from the app.
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

        {/* ── Filter / Search bar ── */}
        {!sessionLoading && isAuthed && (
          <div className="bg-neutral-800/60 border border-neutral-700 rounded-2xl px-4 py-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search input */}
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search player, team, editor…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Action filter — segmented button group */}
              <div className="flex rounded-lg border border-neutral-700 overflow-hidden text-xs font-semibold">
                {ACTION_FILTERS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleActionChange(value)}
                    className={`px-3 py-2 transition-colors whitespace-nowrap ${
                      actionFilter === value
                        ? value === ""
                          ? "bg-neutral-600 text-white"
                          : value === "insert"
                          ? "bg-emerald-600 text-white"
                          : value === "update"
                          ? "bg-blue-600 text-white"
                          : "bg-red-600 text-white"
                        : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-700/60"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Result count badge */}
              <span className="bg-neutral-900 text-neutral-400 text-xs px-3 py-1.5 rounded-full border border-neutral-700 shrink-0">
                {loading ? "…" : `${totalCount} ${totalCount === 1 ? "entry" : "entries"}`}
              </span>
            </div>
          </div>
        )}

        {/* ── Log panel ── */}
        <div className="bg-neutral-800 rounded-2xl shadow-lg border border-neutral-700 overflow-hidden">
          {!sessionLoading && !isAuthed ? (
            <div className="p-8 text-center text-sm text-neutral-400">Sign in to view the activity log.</div>
          ) : loading ? (
            <div className="p-8 text-center text-sm text-neutral-500">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500">
              {rawSearch || actionFilter ? "No entries match your filters." : "No activity yet."}
            </div>
          ) : (
            <>
              <div className="divide-y divide-neutral-700/50">
                {entries.map((entry) => (
                  <div key={entry.id} className="p-4 flex items-start gap-3 hover:bg-neutral-700/20 transition-colors">
                    <span
                      className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md border ${
                        ACTION_STYLES[entry.action] || "bg-neutral-700 text-neutral-300 border-neutral-600"
                      }`}
                    >
                      {entry.action}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-neutral-200">{entry.entity_summary || entry.entity_type}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {entry.actor_username || "unknown"} ·{" "}
                        {new Date(entry.created_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />

              {/* Footer: showing X–Y of Z */}
              <div className="px-4 py-2 border-t border-neutral-700/50 text-xs text-center text-neutral-600">
                {`Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, totalCount)} of ${totalCount} entries`}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
