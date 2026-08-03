const AUTH_SESSION_KEY = "tsf-auth-session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

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
  const next = new URLSearchParams(window.location.search).get("next") || "index.html";
  return /^(index|firmenfitness|vereinsfitness|verwaltung)\.html$/.test(next) ? next : "index.html";
}

const loginForm = document.querySelector("#loginForm");

if (loginForm) {
  if (readSession()) window.location.replace(requestedPage());
  const error = document.querySelector("#loginError");
  const submitButton = loginForm.querySelector('button[type="submit"]');

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    error.hidden = true;
    submitButton.disabled = true;
    const username = document.querySelector("#username").value.trim();
    const password = document.querySelector("#password").value;

    if (username === "mitarbeiter" && password === "TopSports2026!") {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ username, expiresAt: Date.now() + SESSION_DURATION_MS }));
      window.location.replace(requestedPage());
      return;
    }

    error.hidden = false;
    submitButton.disabled = false;
    document.querySelector("#password").select();
  });
} else if (!readSession()) {
  const page = window.location.pathname.split("/").pop() || "index.html";
  window.location.replace(`login.html?next=${encodeURIComponent(page)}`);
}

window.tsfLogout = function tsfLogout() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  window.location.replace("login.html");
};
