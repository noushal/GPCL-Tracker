"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomSelect({
  value,
  onChange,
  options,
  className = "",
  buttonClassName = "px-3 py-2 text-sm",
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);

  const selected = options.find((o) => o.value === value) ?? options[0];
  const isPlaceholder = selected?.value === "";

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) setHighlight(options.findIndex((o) => o.value === value));
  }, [open, options, value]);

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (open) {
        if (!options[highlight]?.disabled) {
          onChange(options[highlight].value);
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
          for (let next = h + 1; next < options.length; next++) {
            if (!options[next].disabled) return next;
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
            if (!options[next].disabled) return next;
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
        <div className="absolute z-20 mt-1 w-full min-w-max bg-neutral-900 border border-neutral-600 rounded-lg shadow-xl shadow-black/40 py-1 max-h-64 overflow-y-auto custom-scrollbar">
          {options.map((option, i) => {
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
      )}
    </div>
  );
}
