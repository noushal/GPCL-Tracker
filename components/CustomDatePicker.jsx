"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function toIso(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseIso(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m - 1, day: d };
}

function formatDisplay(value) {
  const parsed = parseIso(value);
  if (!parsed) return "";
  const date = new Date(parsed.year, parsed.month, parsed.day);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function CustomDatePicker({ value, onChange, className }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const parsed = parseIso(value);
  const today = new Date();

  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  useEffect(() => {
    if (open && parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function changeMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  const cells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInView = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

    const list = [];
    for (let i = 0; i < firstWeekday; i++) {
      const day = daysInPrev - firstWeekday + 1 + i;
      const month = viewMonth === 0 ? 11 : viewMonth - 1;
      const year = viewMonth === 0 ? viewYear - 1 : viewYear;
      list.push({ day, month, year, inMonth: false });
    }
    for (let day = 1; day <= daysInView; day++) {
      list.push({ day, month: viewMonth, year: viewYear, inMonth: true });
    }
    while (list.length % 7 !== 0 || list.length < 42) {
      const last = list[list.length - 1];
      const nextDate = new Date(last.year, last.month, last.day + 1);
      list.push({ day: nextDate.getDate(), month: nextDate.getMonth(), year: nextDate.getFullYear(), inMonth: false });
    }
    return list;
  }, [viewYear, viewMonth]);

  function selectDay(cell) {
    onChange(toIso(cell.year, cell.month, cell.day));
    setOpen(false);
  }

  const isEmpty = !value;

  return (
    <div ref={boxRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-left hover:border-neutral-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
      >
        <span className={isEmpty ? "text-neutral-500" : "text-white"}>
          {isEmpty ? "Select date..." : formatDisplay(value)}
        </span>
        <svg className="w-4 h-4 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-72 bg-neutral-900 border border-neutral-600 rounded-lg shadow-xl shadow-black/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[11px] font-medium text-neutral-500 py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              const iso = toIso(cell.year, cell.month, cell.day);
              const isSelected = iso === value;
              const isToday =
                cell.day === today.getDate() && cell.month === today.getMonth() && cell.year === today.getFullYear();
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => selectDay(cell)}
                  className={`text-sm rounded-md py-1.5 transition-colors ${
                    !cell.inMonth ? "text-neutral-600" : "text-neutral-200"
                  } ${isSelected ? "bg-green-600 text-white font-semibold" : "hover:bg-neutral-700"} ${
                    isToday && !isSelected ? "ring-1 ring-green-500/60" : ""
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between mt-2 pt-2 border-t border-neutral-700">
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                onChange(toIso(t.getFullYear(), t.getMonth(), t.getDate()));
                setOpen(false);
              }}
              className="text-xs text-green-500 hover:text-green-400 transition-colors"
            >
              Today
            </button>
            {!isEmpty && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
