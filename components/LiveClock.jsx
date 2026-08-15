"use client";

import { useEffect, useState } from "react";

export default function LiveClock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const hh = pad(now.getHours() % 12 || 12);
  const mm = pad(now.getMinutes());
  const meridiem = now.getHours() >= 12 ? "PM" : "AM";
  const tzLabel = now
    .toLocaleTimeString(undefined, { timeZoneName: "short" })
    .split(" ")
    .pop();

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 md:pl-4 md:border-l md:border-neutral-700/80"
      title={timeZone}
    >
      <span className="font-mono text-2xl leading-none text-neutral-100 tabular-nums">
        {hh}
        <span className="clock-colon">:</span>
        {mm}
      </span>
      <span className="text-xs text-neutral-500 uppercase tracking-widest">
        {meridiem} {tzLabel} · {date}
      </span>
    </div>
  );
}

function pad(n) {
  return String(n).padStart(2, "0");
}
