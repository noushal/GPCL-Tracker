"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagUrl } from "@/lib/countryFlags";

const RESULT_LIMIT = 8;

// pesdb.net lists the same real player multiple times across team/card
// snapshots (same name, same nationality, different id) — keep only the
// highest-rated entry per name+nationality. Two different real players can
// share a name (e.g. two "David Silva"s, one Colombian one Brazilian), so
// nationality has to be part of the key or one of them gets dropped.
function dedupeByNameAndNationality(rows) {
  const seen = new Map();
  for (const row of rows) {
    const key = `${row.name.toLowerCase()}|${row.nationality || ""}`;
    if (!seen.has(key)) seen.set(key, row);
  }
  return [...seen.values()];
}

export default function PlayerAutocomplete({
  value,
  onChange,
  onSelectPlayer,
  className,
  placeholder = "e.g. Luka Modric",
}) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const raw = (value || "").replace(/[,.]/g, "").trim();
    if (raw.length < 2) {
      setResults([]);
      return;
    }

    let active = true;

    const timeout = setTimeout(async () => {
      let combined = [];

      // 1. Try local Supabase database first if configured
      const supabase = createClient();
      if (supabase) {
        try {
          let { data, error } = await supabase
            .from("players")
            .select("id,name,team,position,rating,nationality,age")
            .ilike("name", `%${raw}%`)
            .order("rating", { ascending: false })
            .limit(RESULT_LIMIT * 5);

          if (error) {
            const fallback = await supabase
              .from("players")
              .select("id,name,team,position,rating,nationality")
              .ilike("name", `%${raw}%`)
              .order("rating", { ascending: false })
              .limit(RESULT_LIMIT * 5);
            data = fallback.data;
          }

          if (data && data.length > 0) {
            combined = dedupeByNameAndNationality(data);
          }
        } catch (err) {
          console.warn("Supabase player search error:", err);
        }
      }

      // 2. If no local match in Supabase, search online via /api/player-search
      if (combined.length === 0) {
        try {
          const res = await fetch(`/api/player-search?name=${encodeURIComponent(raw)}`);
          if (res.ok) {
            const online = await res.json();
            if (active && Array.isArray(online) && online.length > 0) {
              combined = dedupeByNameAndNationality(online);
            }
          }
        } catch (err) {
          console.warn("Online player search error:", err);
        }
      }

      if (active) {
        setResults(combined.slice(0, RESULT_LIMIT));
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
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
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key >= "0" && e.key <= "9") {
            e.preventDefault();
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          const raw = e.clipboardData.getData("text");
          const clean = raw.replace(/[0-9]/g, "");
          if (!clean) return;

          const target = e.target;
          const start = target.selectionStart ?? (value || "").length;
          const end = target.selectionEnd ?? (value || "").length;
          const current = value || "";
          const updated = current.slice(0, start) + clean + current.slice(end);

          onChange(updated);
          setOpen(true);

          setTimeout(() => {
            if (target) {
              target.selectionStart = target.selectionEnd = start + clean.length;
            }
          }, 0);
        }}
        onChange={(e) => {
          const sanitized = e.target.value.replace(/[0-9]/g, "");
          onChange(sanitized);
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
                  onSelectPlayer?.(p);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-neutral-700 transition-colors flex justify-between items-center gap-3"
              >
                <div className="min-w-0">
                  <div className="text-white text-sm truncate">{p.name}</div>
                  <div className="text-xs text-neutral-500 truncate">
                    {p.position}{p.age ? ` · ${p.age}y` : ""} · {p.team} · {p.rating}
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
