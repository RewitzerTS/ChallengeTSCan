import { createClient } from "npm:@supabase/supabase-js@2.102.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validRole(role: string) {
  return ["employee", "clubManager", "admin"].includes(role);
}

function validUsername(username: string) {
  return /^[a-z0-9._-]{3,40}$/.test(username);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Nicht angemeldet." }, 401);

    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const secretKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!secretKey || !supabaseUrl) return json({ error: "Server-Konfiguration unvollständig." }, 500);

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerData, error: callerError } = await admin.auth.getUser(token);
    const caller = callerData.user;
    if (callerError || !caller) return json({ error: "Sitzung ist ungültig." }, 401);
    if (caller.app_metadata?.role !== "admin") return json({ error: "Nur Admins dürfen Benutzer verwalten." }, 403);

    const body = await req.json();
    const action = body?.action;

    if (action === "create") {
      const username = String(body.username || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      const password = String(body.password || "");
      const role = String(body.role || "");

      if (!validUsername(username)) return json({ error: "Benutzername: 3–40 Zeichen, nur Buchstaben, Zahlen, Punkt, Minus oder Unterstrich." }, 400);
      if (!name) return json({ error: "Name fehlt." }, 400);
      if (!validRole(role)) return json({ error: "Ungültige Rolle." }, 400);
      if (password.length < 10) return json({ error: "Das Passwort muss mindestens 10 Zeichen lang sein." }, 400);

      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .maybeSingle();
      if (existingProfile) return json({ error: "Dieser Benutzername ist bereits vergeben." }, 409);

      const email = `${username}@challenge.topsports.fitness`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, name },
        app_metadata: { role },
      });
      if (error || !data.user) return json({ error: error?.message || "Benutzer konnte nicht angelegt werden." }, 400);

      return json({ ok: true, user: { id: data.user.id, username, name, role } });
    }

    if (action === "delete") {
      const userId = String(body.userId || "");
      if (!userId) return json({ error: "Benutzer-ID fehlt." }, 400);
      if (userId === caller.id) return json({ error: "Das eigene Konto kann nicht gelöscht werden." }, 400);

      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unbekannte Aktion." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unbekannter Fehler" }, 500);
  }
});
