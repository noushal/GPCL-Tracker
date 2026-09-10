"use client";

import { useEffect, useRef, useState } from "react";

export default function AutoUpdateListener() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeferred, setIsDeferred] = useState(false);
  const currentVersionRef = useRef(process.env.NEXT_PUBLIC_APP_VERSION || null);
  const isTriggeredRef = useRef(false);

  useEffect(() => {
    async function checkVersion() {
      if (isTriggeredRef.current) return;

      try {
        const res = await fetch(`/api/version?_t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!res.ok) return;
        const data = await res.json();
        const remoteVersion = data?.version;

        if (!remoteVersion) return;

        // On first run, lock in baseline if not already established
        if (!currentVersionRef.current) {
          currentVersionRef.current = remoteVersion;
          return;
        }

        // If the deployed version differs from our loaded version, trigger auto-refresh
        if (currentVersionRef.current !== remoteVersion) {
          isTriggeredRef.current = true;
          setIsUpdating(true);

          // If user has the tab in the background, reload immediately
          if (document.hidden) {
            window.location.reload();
            return;
          }

          // Check if user is actively entering data, has a modal open, or has draft inputs
          const isUserTyping =
            document.activeElement &&
            ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);
          const isModalOpen = Boolean(document.querySelector(".fixed.inset-0"));

          let hasUnsavedInputs = false;
          try {
            const purchaseDraft = localStorage.getItem("gpcl_draft_purchase");
            if (purchaseDraft) {
              const p = JSON.parse(purchaseDraft);
              if (p?.player?.trim() || p?.fee) hasUnsavedInputs = true;
            }
            const tradeDraft = localStorage.getItem("gpcl_draft_trade");
            if (tradeDraft) {
              const t = JSON.parse(tradeDraft);
              if (t?.playerA?.trim() || t?.playerB?.trim() || t?.cashAmount) hasUnsavedInputs = true;
            }
          } catch {}

          // If the user is actively working or has typed fields, do NOT abruptly force a reload
          // Show the banner with Refresh Now and protect their work
          if (isUserTyping || isModalOpen || hasUnsavedInputs) {
            setIsDeferred(true);
            return;
          }

          // If user has the tab in the background, reload immediately
          if (document.hidden) {
            window.location.reload();
            return;
          }

          // If user is idle, brief grace period so they see the banner before refresh
          setTimeout(() => {
            window.location.reload();
          }, 1600);
        }
      } catch {
        // Silently ignore temporary network offline glitches
      }
    }

    // Baseline check on mount
    checkVersion();

    // Check periodically every 15 seconds
    const interval = setInterval(checkVersion, 15000);

    // Check immediately when user switches back to the tab
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkVersion);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkVersion);
    };
  }, []);

  if (!isUpdating) return null;

  return (
    <aside
      aria-label="Application update"
      className="fixed top-4 right-4 z-[99999] flex items-center gap-3 bg-neutral-900 border border-blue-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl shadow-blue-950/50 animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
        <svg className={`w-4 h-4 ${!isDeferred ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>

      <div className="pr-2">
        <p className="text-xs font-semibold text-white flex items-center gap-1.5">
          <span>Git Update Available</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </p>
        <p className="text-[11px] text-neutral-400">
          {isDeferred
            ? "New version ready. Your draft inputs are protected."
            : "Refreshing with latest changes..."}
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors ml-1 cursor-pointer"
      >
        Refresh Now
      </button>
    </aside>
  );
}
