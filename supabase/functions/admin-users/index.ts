import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type RequestBody = {
  email?: string;
  fullName?: string;
  role?: "admin" | "editor" | "viewer";
  password?: string;
  redirectTo?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Metodo no permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Faltan secretos de Supabase en la funcion." }, 500);
  }

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    return json({ error: "No autenticado." }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return json({ error: "No autenticado." }, 401);
  }

  const { data: actorProfile, error: actorProfileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (actorProfileError || !actorProfile?.is_active || actorProfile.role !== "admin") {
    return json({ error: "No tienes permisos para administrar usuarios." }, 403);
  }

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const email = normalizeString(body?.email);
  const fullName = normalizeString(body?.fullName);
  const role = normalizeRole(body?.role);
  const password = normalizeString(body?.password);
  const redirectTo = normalizeString(body?.redirectTo);

  if (!email || !fullName) {
    return json({ error: "Faltan campos obligatorios." }, 400);
  }

  const createResponse = password
    ? await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      })
    : await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
        },
        ...(redirectTo ? { redirectTo } : {}),
      });

  if (createResponse.error || !createResponse.data.user) {
    return json({ error: createResponse.error?.message ?? "No se pudo crear el usuario." }, 400);
  }

  const createdUser = createResponse.data.user;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: createdUser.id,
      email,
      full_name: fullName,
      role,
      is_active: true,
    })
    .select("*")
    .single();

  if (profileError) {
    return json({ error: profileError.message }, 400);
  }

  await supabase.from("audit_events").insert({
    actor_id: user.id,
    entity_type: "profile",
    entity_id: profile.id,
    action: "user_created",
    payload_json: {
      role: profile.role,
      email: profile.email,
    },
  });

  return json({ profile }, 201);
});

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRole(value: unknown): "admin" | "editor" | "viewer" {
  return value === "admin" || value === "editor" ? value : "viewer";
}
