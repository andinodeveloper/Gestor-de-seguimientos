"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthContext } from "@/components/auth-provider";
import { UserAdminPanel } from "@/components/user-admin-panel";
import { isAdminRole } from "@/lib/domain";
import { listProfiles } from "@/lib/follow-ups";
import type { Profile } from "@/lib/types";

export default function UsersAdminPage() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      return;
    }

    if (!isAdminRole(profile.role)) {
      router.replace("/seguimientos");
      return;
    }

    let ignore = false;
    setIsLoading(true);
    setError(null);

    void listProfiles()
      .then((nextProfiles) => {
        if (!ignore) {
          setProfiles(nextProfiles);
          setIsLoading(false);
        }
      })
      .catch((loadError) => {
        if (!ignore) {
          setProfiles([]);
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la lista de usuarios.");
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [profile, router]);

  if (!profile || !isAdminRole(profile.role)) {
    return (
      <div className="rounded-[2rem] border border-[var(--line)] bg-white px-8 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Validando acceso</p>
        <p className="mt-4 text-sm text-[var(--muted)]">Comprobando privilegios administrativos.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-900">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-[var(--line)] bg-white px-8 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Cargando</p>
        <p className="mt-4 text-sm text-[var(--muted)]">Consultando perfiles registrados.</p>
      </div>
    );
  }

  return <UserAdminPanel initialProfiles={profiles} />;
}
