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

async function sha1Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function leakedPasswordCount(password: string) {
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: {
      "Add-Padding": "true",
      "User-Agent": "ChallengeTSCan/1.0",
      Accept: "text/plain",
    },
  });

  if (!response.ok) throw new Error(`HIBP returned ${response.status}`);

  const body = await response.text();
  for (const line of body.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const candidate = line.slice(0, separator).trim().toUpperCase();
    if (candidate !== suffix) continue;
    const count = Number(line.slice(separator + 1).trim());
    return Number.isFinite(count) ? count : 0;
  }

  return 0;
}

async function validatePassword(password: string) {
  if (password.length < 10) return "Das Passwort muss mindestens 10 Zeichen lang sein.";

  let pwnedCount = 0;
  try {
    pwnedCount = await leakedPasswordCount(password);
  } catch (error) {
    console.error("Pwned Passwords check failed", error);
    return "Die Passwort-Sicherheitsprüfung ist momentan nicht erreichbar. Bitte versuche es erneut.";
  }

  if (pwnedCount > 0) return "Dieses Passwort ist aus bekannten Datenleaks bekannt. Bitte wähle ein anderes Passwort.";
  return "";
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
      const passwordError = await validatePassword(password);
      if (passwordError) return json({ error: passwordError }, passwordError.includes("nicht erreichbar") ? 503 : 400);

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

    if (action === "setPassword") {
      const userId = String(body.userId || "");
      const password = String(body.password || "");
      if (!userId) return json({ error: "Benutzer-ID fehlt." }, 400);
      if (userId === caller.id) return json({ error: "Das eigene Admin-Passwort kann hier nicht geändert werden." }, 400);

      const passwordError = await validatePassword(password);
      if (passwordError) return json({ error: passwordError }, passwordError.includes("nicht erreichbar") ? 503 : 400);

      const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId);
      if (targetError || !targetData.user) return json({ error: "Benutzer wurde nicht gefunden." }, 404);

      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
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
