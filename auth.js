const AUTH_SESSION_KEY = "tsf-auth-session";
const AUTH_USERS_KEY = "tsf-users-v1";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

const defaultUsers = [
  { id: "u-employee", username: "mitarbeiter", password: "TopSports2026!", name: "Thekenmitarbeiter", role: "employee" },
  { id: "u-manager", username: "clubleiter", password: "TopSports2026!", name: "Clubleitung", role: "clubManager" },
  { id: "u-admin", username: "admin", password: "TopSports2026!", name: "Administrator", role: "admin" },
];

function readUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY));
    return Array.isArray(users) ? users : defaultUsers;
  } catch {
    return defaultUsers;
  }
}

function saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY));
    if (!session || session.expiresAt <= Date.now()) {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

function requestedPage() {
  const next = new URLSearchParams(window.location.search).get("next") || "firmenfitness.html";
  return /^(index|firmenfitness|vereinsfitness|verwaltung|benutzer)\.html$/.test(next) ? next : "firmenfitness.html";
}

function homeForRole(role) {
  return role === "employee" ? "firmenfitness.html" : "index.html";
}

function canAccessPage(role, page) {
  if (role === "employee") return /^(firmenfitness|vereinsfitness)\.html$/.test(page);
  if (page === "benutzer.html") return role === "admin";
  return /^(index|firmenfitness|vereinsfitness|verwaltung)\.html$/.test(page);
}

window.tsfAuth = { readSession, readUsers, saveUsers, homeForRole, canAccessPage };

const loginForm = document.querySelector("#loginForm");

if (loginForm) {
  const activeSession = readSession();
  if (activeSession) window.location.replace(canAccessPage(activeSession.role, requestedPage()) ? requestedPage() : homeForRole(activeSession.role));
  const error = document.querySelector("#loginError");
  const submitButton = loginForm.querySelector('button[type="submit"]');

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    error.hidden = true;
    submitButton.disabled = true;
    const username = document.querySelector("#username").value.trim().toLowerCase();
    const password = document.querySelector("#password").value;
    const user = readUsers().find((entry) => entry.username.toLowerCase() === username && entry.password === password);

    if (user) {
      const session = { userId: user.id, username: user.username, name: user.name, role: user.role, expiresAt: Date.now() + SESSION_DURATION_MS };
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      const next = requestedPage();
      window.location.replace(canAccessPage(user.role, next) ? next : homeForRole(user.role));
      return;
    }

    error.hidden = false;
    submitButton.disabled = false;
    document.querySelector("#password").select();
  });
} else {
  const session = readSession();
  const page = window.location.pathname.split("/").pop() || "index.html";
  if (!session) window.location.replace(`login.html?next=${encodeURIComponent(page)}`);
  else if (!canAccessPage(session.role, page)) window.location.replace(homeForRole(session.role));
}

window.tsfLogout = function tsfLogout() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  window.location.replace("login.html");
};
