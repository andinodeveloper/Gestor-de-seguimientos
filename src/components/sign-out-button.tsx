"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
    setIsPending(false);
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white whitespace-nowrap transition hover:bg-white/[0.12]"
    >
      {isPending ? "Saliendo..." : "Cerrar sesion"}
    </button>
  );
}
