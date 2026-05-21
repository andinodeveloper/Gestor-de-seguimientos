import type { SetupState } from "@/lib/types";

const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function getSupabaseSetupState(): SetupState {
  const missing: string[] = [];

  if (!publicUrl) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!publicKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return {
    isConfigured: missing.length === 0,
    missing,
  };
}

export function hasSupabasePublicEnv() {
  return Boolean(publicUrl && publicKey);
}

export function requireSupabasePublicEnv() {
  if (!publicUrl || !publicKey) {
    throw new Error("Supabase public environment variables are missing.");
  }

  return {
    url: publicUrl,
    key: publicKey,
  };
}
