"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseSetupState } from "@/lib/supabase/env";
import type { Profile, SetupState } from "@/lib/types";

type AuthContextValue = {
  blocked: boolean;
  isConfigured: boolean;
  loading: boolean;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  session: Session | null;
  setup: SetupState;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setup = useMemo(() => getSupabaseSetupState(), []);
  const [loading, setLoading] = useState(setup.isConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!setup.isConfigured) {
      setLoading(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      void syncAuthState(data.session, true, setSession, setProfile, setBlocked, setLoading);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
      void syncAuthState(nextSession, true, setSession, setProfile, setBlocked, setLoading);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setup.isConfigured]);

  async function refreshProfile() {
    if (!setup.isConfigured) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    await syncAuthState(currentSession, true, setSession, setProfile, setBlocked, setLoading);
  }

  return (
    <AuthContext.Provider
      value={{
        blocked,
        isConfigured: setup.isConfigured,
        loading,
        profile,
        refreshProfile,
        session,
        setup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider.");
  }

  return context;
}

async function syncAuthState(
  nextSession: Session | null,
  isConfigured: boolean,
  setSession: React.Dispatch<React.SetStateAction<Session | null>>,
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>,
  setBlocked: React.Dispatch<React.SetStateAction<boolean>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
) {
  setSession(nextSession);

  if (!isConfigured || !nextSession) {
    setProfile(null);
    setBlocked(false);
    setLoading(false);
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", nextSession.user.id)
    .maybeSingle();

  if (error) {
    setProfile(null);
    setBlocked(true);
    setLoading(false);
    return;
  }

  const nextProfile = (data ?? null) as Profile | null;
  if (!nextProfile || !nextProfile.is_active) {
    setProfile(null);
    setBlocked(true);
    setLoading(false);
    return;
  }

  setProfile(nextProfile);
  setBlocked(false);
  setLoading(false);
}
