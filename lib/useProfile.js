"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";

export function useProfile() {
  const { session, loading: sessionLoading } = useSession();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    if (!supabase || !session?.user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("profiles").select("username").eq("id", session.user.id).maybeSingle();
    setProfile(data);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    if (sessionLoading) return;
    refresh();
  }, [sessionLoading, refresh]);

  return { profile, loading: sessionLoading || loading, refresh };
}
