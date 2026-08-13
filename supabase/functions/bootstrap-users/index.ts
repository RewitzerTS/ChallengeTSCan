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

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { setupCode, initialPassword } = await req.json();
    if (typeof setupCode !== "string" || setupCode.length < 20) return json({ error: "Ungültiger Setup-Code." }, 400);
    if (typeof initialPassword !== "string" || initialPassword.length < 10) return json({ error: "Das Startpasswort muss mindestens 10 Zeichen lang sein." }, 400);

    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const secretKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!secretKey || !supabaseUrl) return json({ error: "Server-Konfiguration unvollständig." }, 500);

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: config, error: configError } = await admin
      .from("bootstrap_config")
      .select("setup_code_hash, consumed_at")
      .eq("id", true)
      .single();

    if (configError || !config) return json({ error: "Setup-Konfiguration konnte nicht gelesen werden." }, 500);
    if (config.consumed_at) return json({ error: "Die Ersteinrichtung wurde bereits abgeschlossen." }, 409);

    const submittedHash = await sha256(setupCode);
    if (submittedHash !== config.setup_code_hash) return json({ error: "Setup-Code ist nicht korrekt." }, 403);

    const defaults = [
      { username: "theke", name: "Theke", role: "employee" },
      { username: "clubleiter", name: "Clubleitung", role: "clubManager" },
      { username: "admin", name: "Administrator", role: "admin" },
    ];

    const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return json({ error: listError.message }, 500);

    const created = [];
    for (const entry of defaults) {
      const email = `${entry.username}@challenge.topsports.fitness`;
      const existing = existingUsers.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
      if (existing) {
        created.push({ id: existing.id, username: entry.username, role: entry.role, existing: true });
        continue;
      }

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: initialPassword,
        email_confirm: true,
        user_metadata: { username: entry.username, name: entry.name },
        app_metadata: { role: entry.role },
      });
      if (error || !data.user) return json({ error: error?.message || `Benutzer ${entry.username} konnte nicht angelegt werden.` }, 500);
      created.push({ id: data.user.id, username: entry.username, role: entry.role, existing: false });
    }

    const { error: consumeError } = await admin
      .from("bootstrap_config")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", true);
    if (consumeError) return json({ error: consumeError.message }, 500);

    return json({ ok: true, users: created });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unbekannter Fehler" }, 500);
  }
});
