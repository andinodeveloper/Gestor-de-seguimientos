"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
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
      className="ghost-button ghost-button-inverse whitespace-nowrap"
      aria-label="Cerrar sesion"
      title="Cerrar sesion"
    >
      {isPending ? "Saliendo..." : compact ? "Salir" : "Cerrar sesion"}
    </button>
  );
}
