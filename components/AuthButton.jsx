"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";

export default function AuthButton() {
  const { session, loading, isAuthed } = useSession();

  if (loading) return null;

  if (!isAuthed) {
    return (
      <Link
        href="/login"
        className="text-sm bg-neutral-900 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 px-4 py-2 rounded-lg transition-colors"
      >
        Sign in to edit
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-neutral-400 truncate max-w-[100px] sm:max-w-[160px]">{session.user.email}</span>
      <button
        onClick={() => createClient()?.auth.signOut()}
        className="text-sm bg-neutral-900 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 px-4 py-2 rounded-lg transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
