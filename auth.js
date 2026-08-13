const AUTH_SESSION_KEY = "tsf-auth-session";
const PARTNER_STORAGE_KEY = "tsf-partnerverwaltung-v3";
const SUPABASE_URL = "https://aemfixrieqbkzzsmrxoi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_JSfiF8X8z2Ivb2EusydsrQ_kxfLqPUM";
const INTERNAL_LOGIN_DOMAIN = "challenge.topsports.fitness";

const supabasePromise = import("https://esm.sh/@supabase/supabase-js@2.102.0").then(({ createClient }) =>
  createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
);

function clearLegacyPartnerStorage() {
  try { localStorage.setItem(PARTNER_STORAGE_KEY, "[]"); } catch {}
}

function readSession() {
  try { return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)); } catch { return null; }
}

function storeSession(user) {
  if (!user) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
  const username = user.user_metadata?.username || user.email?.split("@")[0] || "user";
  const session = { userId:user.id, username, name:user.user_metadata?.name || username, role:user.app_metadata?.role || "employee", email:user.email || "" };
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  return session;
}

function requestedPage() {
  const next = new URLSearchParams(window.location.search).get("next") || "firmenfitness.html";
  return /^(index|firmenfitness|vereinsfitness|verwaltung|benutzer|archiv)\.html$/.test(next) ? next : "firmenfitness.html";
}

function homeForRole() { return "index.html"; }

function canAccessPage(role, page) {
  if (role === "employee") return /^(index|firmenfitness|vereinsfitness)\.html$/.test(page);
  if (page === "benutzer.html" || page === "archiv.html") return role === "admin";
  return /^(index|firmenfitness|vereinsfitness|verwaltung)\.html$/.test(page);
}

function emailForLogin(value) {
  const login = String(value || "").trim().toLowerCase();
  return login.includes("@") ? login : `${login}@${INTERNAL_LOGIN_DOMAIN}`;
}

async function currentSupabaseSession() {
  const supabase = await supabasePromise;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function validateProtectedPage() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const session = await currentSupabaseSession();
  if (!session?.user) {
    storeSession(null);
    window.location.replace(`login.html?next=${encodeURIComponent(page)}`);
    return null;
  }
  const mapped = storeSession(session.user);
  if (!canAccessPage(mapped.role, page)) {
    window.location.replace(homeForRole(mapped.role));
    return null;
  }
  return mapped;
}

async function signIn(username, password) {
  const supabase = await supabasePromise;
  const { data, error } = await supabase.auth.signInWithPassword({ email:emailForLogin(username), password });
  if (error) throw error;
  return storeSession(data.user);
}

async function runBootstrap(setupCode, initialPassword) {
  const supabase = await supabasePromise;
  const { data, error } = await supabase.functions.invoke("bootstrap-users", { body:{ setupCode, initialPassword } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

window.tsfAuth = { readSession, storeSession, getClient:() => supabasePromise, homeForRole, canAccessPage, emailForLogin, signIn, runBootstrap };

const loginForm = document.querySelector("#loginForm");

if (loginForm) {
  window.tsfAuth.ready = (async () => {
    const active = await currentSupabaseSession();
    if (active?.user) {
      const mapped = storeSession(active.user);
      const next = requestedPage();
      window.location.replace(canAccessPage(mapped.role, next) ? next : homeForRole(mapped.role));
      return mapped;
    }
    storeSession(null);
    return null;
  })();

  const error = document.querySelector("#loginError");
  const submitButton = loginForm.querySelector('button[type="submit"]');
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault(); error.hidden = true; submitButton.disabled = true;
    try {
      const username = document.querySelector("#username").value.trim();
      const password = document.querySelector("#password").value;
      const session = await signIn(username, password);
      const next = requestedPage();
      window.location.replace(canAccessPage(session.role, next) ? next : homeForRole(session.role));
    } catch {
      error.textContent = "Zugangsdaten nicht erkannt. Bitte prüfe deine Eingabe.";
      error.hidden = false; submitButton.disabled = false; document.querySelector("#password").select();
    }
  });

  if (new URLSearchParams(window.location.search).get("setup") === "1") {
    const card = loginForm.closest(".login-card");
    const setupBox = document.createElement("div");
    setupBox.className = "login-form";
    setupBox.innerHTML = `<hr style="border:0;border-top:1px solid rgba(255,255,255,.1);margin:20px 0" /><p class="eyebrow">Ersteinrichtung</p><p>Einmalige Verbindung der Standardkonten mit dem zentralen Backend.</p><label><span>Setup-Code</span><input id="setupCode" type="password" autocomplete="off" /></label><label><span>Startpasswort</span><input id="initialPassword" type="password" minlength="10" autocomplete="new-password" /></label><label><span>Startpasswort wiederholen</span><input id="initialPasswordConfirm" type="password" minlength="10" autocomplete="new-password" /></label><p class="login-error" id="setupError" role="alert" hidden></p><button class="btn btn-secondary" id="setupButton" type="button">Ersteinrichtung durchführen</button>`;
    card.append(setupBox);
    setupBox.querySelector("#setupButton").addEventListener("click", async () => {
      const button = setupBox.querySelector("#setupButton");
      const setupError = setupBox.querySelector("#setupError");
      const setupCode = setupBox.querySelector("#setupCode").value.trim();
      const initialPassword = setupBox.querySelector("#initialPassword").value;
      const initialPasswordConfirm = setupBox.querySelector("#initialPasswordConfirm").value;
      setupError.hidden = true;
      if (initialPassword.length < 10) { setupError.textContent = "Das Startpasswort muss mindestens 10 Zeichen lang sein."; setupError.hidden = false; return; }
      if (initialPassword !== initialPasswordConfirm) { setupError.textContent = "Die beiden Startpasswörter stimmen nicht überein."; setupError.hidden = false; return; }
      button.disabled = true;
      try {
        await runBootstrap(setupCode, initialPassword);
        const session = await signIn("admin", initialPassword);
        const next = requestedPage();
        window.location.replace(canAccessPage(session.role, next) ? next : homeForRole(session.role));
      } catch (setupFailure) {
        setupError.textContent = setupFailure?.message || "Ersteinrichtung fehlgeschlagen.";
        setupError.hidden = false; button.disabled = false;
      }
    });
  }
} else {
  clearLegacyPartnerStorage();
  window.tsfAuth.ready = validateProtectedPage();
  window.addEventListener("DOMContentLoaded", () => {
    installMobileLogout();
    const page = window.location.pathname.split("/").pop() || "index.html";
    if (!["benutzer.html", "archiv.html"].includes(page)) {
      const adapter = document.createElement("script");
      adapter.src = "backend-adapter.js";
      adapter.defer = true;
      document.body.append(adapter);
    }
  });
}

window.tsfLogout = async function tsfLogout() {
  try { const supabase = await supabasePromise; await supabase.auth.signOut(); }
  finally { clearLegacyPartnerStorage(); storeSession(null); window.location.replace("login.html"); }
};

function installMobileLogout() {
  if (document.querySelector(".mobile-logout-button")) return;

  if (!document.querySelector("#mobile-auth-controls")) {
    const style = document.createElement("style");
    style.id = "mobile-auth-controls";
    style.textContent = `
      .mobile-logout-button { display: none; }
      @media (max-width: 1023px) {
        .mobile-logout-button {
          position: fixed;
          right: 12px;
          bottom: calc(78px + env(safe-area-inset-bottom, 0px) + 10px);
          z-index: 29;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 14px;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 999px;
          background: rgba(16,16,16,.96);
          color: #f5f5f2;
          box-shadow: 0 10px 28px rgba(0,0,0,.38);
          font: 800 12px/1 Inter, system-ui, sans-serif;
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
        }
        .bottom-nav { padding-bottom: env(safe-area-inset-bottom, 0px); }
        .app-shell { padding-bottom: calc(78px + env(safe-area-inset-bottom, 0px)); }
      }
    `;
    document.head.append(style);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "mobile-logout-button";
  button.textContent = "Abmelden";
  button.setAttribute("aria-label", "Abmelden");
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Abmelden…";
    await window.tsfLogout();
  });
  document.body.append(button);
}