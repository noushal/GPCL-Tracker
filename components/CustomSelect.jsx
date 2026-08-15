"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function CustomSelect({
  value,
  onChange,
  options,
  className = "",
  buttonClassName = "px-3 py-2 text-sm",
  searchable = false,
  searchPlaceholder = "Search...",
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);
  const searchRef = useRef(null);

  const selected = options.find((o) => o.value === value) ?? options[0];
  const isPlaceholder = selected?.value === "";

  const visibleOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const term = query.trim().toLowerCase();
    return options.filter((o) => !o.disabled && o.label.toLowerCase().includes(term));
  }, [options, searchable, query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(options.findIndex((o) => o.value === value));
      if (searchable) setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) setHighlight(0);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (open) {
        if (visibleOptions[highlight] && !visibleOptions[highlight].disabled) {
          onChange(visibleOptions[highlight].value);
          setOpen(false);
        }
      } else {
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setHighlight((h) => {
          for (let next = h + 1; next < visibleOptions.length; next++) {
            if (!visibleOptions[next].disabled) return next;
          }
          return h;
        });
      }
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open) {
        setHighlight((h) => {
          for (let next = h - 1; next >= 0; next--) {
            if (!visibleOptions[next].disabled) return next;
          }
          return h;
        });
      }
    }
  }

  return (
    <div ref={boxRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 bg-neutral-900 border border-neutral-600 rounded-lg text-white text-left hover:border-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors ${buttonClassName}`}
      >
        <span className={`truncate ${isPlaceholder ? "text-neutral-500" : ""}`}>{selected?.label}</span>
        <svg
          className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-neutral-900 border border-neutral-600 rounded-lg shadow-xl shadow-black/40 max-h-72 flex flex-col">
          {searchable && (
            <div className="p-2 border-b border-neutral-700 shrink-0">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-neutral-800 border border-neutral-600 rounded-md px-2.5 py-1.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div className="overflow-y-auto custom-scrollbar py-1">
            {visibleOptions.length === 0 && (
              <div className="px-3 py-2 text-sm text-neutral-500 italic">No matches.</div>
            )}
            {visibleOptions.map((option, i) => {
              const isSelected = option.value === value;
              if (option.disabled) {
                return (
                  <div
                    key={option.value}
                    className="w-full px-3 py-2 text-sm text-neutral-600 italic cursor-default select-none"
                  >
                    {option.label}
                  </div>
                );
              }
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm transition-colors ${
                    i === highlight ? "bg-neutral-700/60" : ""
                  } ${isSelected ? "text-blue-400" : "text-neutral-200"}`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
