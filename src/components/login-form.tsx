"use client";

import { startTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsPending(false);
      return;
    }

    startTransition(() => {
      router.replace("/dashboard");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="page-stack">
      <div className="page-stack" style={{ gap: "0.5rem" }}>
        <label className="label">Correo</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="field"
          placeholder="nombre@empresa.com"
        />
      </div>
      <div className="page-stack" style={{ gap: "0.5rem" }}>
        <label className="label">Contrasena</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="field"
          placeholder="********"
        />
      </div>
      {error ? <div className="alert-box alert-box-error">{error}</div> : null}
      <div className="compact-grid">
        <div className="meta-tile">
          <strong>Acceso seguro</strong>
          <span>La sesion se valida contra tu perfil activo.</span>
        </div>
        <div className="meta-tile">
          <strong>Permisos por rol</strong>
          <span>La experiencia cambia segun capacidades del usuario.</span>
        </div>
      </div>
      <button type="submit" disabled={isPending} className="action-button w-full disabled:opacity-60">
        {isPending ? "Ingresando..." : "Entrar al sistema"}
      </button>
    </form>
  );
}
