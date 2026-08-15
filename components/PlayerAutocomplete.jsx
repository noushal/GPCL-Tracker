"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagUrl } from "@/lib/countryFlags";

const RESULT_LIMIT = 8;

// pesdb.net lists the same real player multiple times across team/card
// snapshots (same name, different id) — keep only the highest-rated entry
// per name so search doesn't show duplicates.
function dedupeByName(rows) {
  const seen = new Map();
  for (const row of rows) {
    const key = row.name.toLowerCase();
    if (!seen.has(key)) seen.set(key, row);
  }
  return [...seen.values()];
}

export default function PlayerAutocomplete({ value, onChange, className }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const term = value.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    const supabase = createClient();
    if (!supabase) return;
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("players")
        .select("id,name,team,position,rating,nationality")
        .ilike("name", `%${term}%`)
        .order("rating", { ascending: false })
        .limit(RESULT_LIMIT * 5);
      setResults(dedupeByName(data || []).slice(0, RESULT_LIMIT));
    }, 250);

    return () => clearTimeout(timeout);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={value}
        placeholder="e.g. Lionel Messi"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={className}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-neutral-900 border border-neutral-600 rounded-lg shadow-lg max-h-56 overflow-y-auto custom-scrollbar">
          {results.map((p) => {
            const flagUrl = getFlagUrl(p.nationality);
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => {
                  onChange(p.name);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-neutral-700 transition-colors flex justify-between items-center gap-3"
              >
                <div className="min-w-0">
                  <div className="text-white text-sm truncate">{p.name}</div>
                  <div className="text-xs text-neutral-500 truncate">
                    {p.position} · {p.team} · {p.rating}
                  </div>
                </div>
                {flagUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={flagUrl}
                    alt={p.nationality}
                    title={p.nationality}
                    className="w-6 h-4 object-cover rounded-sm shrink-0 border border-neutral-700"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
