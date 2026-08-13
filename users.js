const userUiStyle = document.createElement("style");
userUiStyle.textContent = `
  .topbar { display: none !important; }
  .brand { min-height: 82px; }
  .brand img { content: url("assets/top-sports-logo.svg"); width:140px; max-width:140px; height:auto; max-height:78px; object-fit:contain; }
  #passwordPanel { position:fixed; inset:0; z-index:34; display:flex; align-items:center; justify-content:center; padding:24px; background:rgba(0,0,0,.72); }
  #passwordPanel[hidden] { display:none; }
  #passwordPanel > .card { width:min(100%,520px); max-height:calc(100vh - 48px); overflow:auto; border-radius:18px; }
`;
document.head.append(userUiStyle);
const userBrandLogo = document.querySelector(".brand img");
if (userBrandLogo) userBrandLogo.src = "assets/top-sports-logo.svg";

const desktopNav = document.querySelector(".sidebar .nav-list");
if (desktopNav && !desktopNav.querySelector('[href="archiv.html"]')) desktopNav.insertAdjacentHTML("beforeend", '<a class="nav-item" href="archiv.html"><span>▣</span><span>Archiv</span></a>');
const mobileNav = document.querySelector(".bottom-nav");
if (mobileNav && !mobileNav.querySelector('[href="archiv.html"]')) {
  mobileNav.style.setProperty("--nav-item-count", "6");
  mobileNav.insertAdjacentHTML("beforeend", '<a class="nav-item" href="archiv.html">▣<span>Archiv</span></a>');
}

const roleNames = { employee: "Theke", clubManager: "Clubleiter", admin: "Admin" };
const panel = document.querySelector("#userPanel");
const form = document.querySelector("#userForm");
const error = document.querySelector("#userError");

document.body.insertAdjacentHTML("beforeend", `
  <section id="passwordPanel" hidden role="dialog" aria-modal="true" aria-labelledby="passwordFormTitle">
    <article class="card">
      <div class="card-header"><div><h2 id="passwordFormTitle">Passwort vergeben</h2><p id="passwordFormDescription"></p></div></div>
      <form id="passwordForm" class="partner-form">
        <input id="passwordUserId" type="hidden" />
        <div class="form-grid">
          <label class="wide"><span>Neues Passwort</span><input id="assignedPassword" type="password" minlength="10" autocomplete="new-password" required /></label>
          <label class="wide"><span>Passwort wiederholen</span><input id="assignedPasswordRepeat" type="password" minlength="10" autocomplete="new-password" required /></label>
        </div>
        <p class="form-error" id="passwordError" role="alert" hidden></p>
        <div class="form-actions"><button class="btn btn-ghost" id="cancelPassword" type="button">Abbrechen</button><button class="btn btn-primary" type="submit">Passwort speichern</button></div>
      </form>
    </article>
  </section>`);

const passwordPanel = document.querySelector("#passwordPanel");
const passwordForm = document.querySelector("#passwordForm");
const passwordError = document.querySelector("#passwordError");

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value ?? "";
  return element.innerHTML;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 3000);
}

function closePanel() {
  panel.hidden = true;
  form.reset();
  error.hidden = true;
  document.body.classList.remove("modal-open");
}

function openPanel() {
  panel.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => document.querySelector("#userName").focus(), 0);
}

function closePasswordPanel() {
  passwordPanel.hidden = true;
  passwordForm.reset();
  passwordError.hidden = true;
  document.body.classList.remove("modal-open");
}

function openPasswordPanel(user) {
  document.querySelector("#passwordUserId").value = user.id;
  document.querySelector("#passwordFormDescription").textContent = `Neues Passwort für ${user.name} (${roleNames[user.role] || user.role}) festlegen.`;
  passwordPanel.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => document.querySelector("#assignedPassword").focus(), 0);
}

async function initUsers() {
  const session = await window.tsfAuth.ready;
  if (!session) return;

  const supabase = await window.tsfAuth.getClient();
  document.querySelector("#currentUser").textContent = `${session.name || session.username} · Admin`;
  document.querySelector("#logoutButton").addEventListener("click", window.tsfLogout);
  let currentUsers = [];

  async function renderUsers() {
    const { data: users, error: loadError } = await supabase.from("profiles").select("id,name,username,role").order("name", { ascending:true });
    if (loadError) { showToast(`Benutzer konnten nicht geladen werden: ${loadError.message}`); return; }
    currentUsers = users || [];
    document.querySelector("#userCount").textContent = `${currentUsers.length} Benutzerkonten`;
    document.querySelector("#userTableBody").innerHTML = currentUsers.map((user) => `<tr>
      <td><strong>${escapeHtml(user.name)}</strong></td><td>${escapeHtml(user.username)}</td><td><span class="badge badge-neutral">${roleNames[user.role] || escapeHtml(user.role)}</span></td>
      <td><div class="row-actions">${user.id !== session.userId ? `<button class="btn btn-secondary" data-password-user="${user.id}" type="button">Passwort</button><button class="icon-btn btn-danger" data-remove-user="${user.id}" type="button" aria-label="${escapeHtml(user.name)} entfernen">×</button>` : '<span class="table-muted">Eigenes Konto</span>'}</div></td>
    </tr>`).join("");
    document.querySelector("#userMobileList").innerHTML = currentUsers.map((user) => `<article class="mobile-card"><div class="mobile-card-top"><div class="partner-name"><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.username)}</span></div><span class="badge badge-neutral">${roleNames[user.role] || escapeHtml(user.role)}</span></div>${user.id !== session.userId ? `<div class="mobile-actions"><button class="btn btn-secondary" data-password-user="${user.id}" type="button">Passwort vergeben</button><button class="btn btn-danger" data-remove-user="${user.id}" type="button">Benutzer entfernen</button></div>` : ""}</article>`).join("");
    document.querySelectorAll("[data-remove-user]").forEach((button) => button.addEventListener("click", () => removeUser(button.dataset.removeUser)));
    document.querySelectorAll("[data-password-user]").forEach((button) => button.addEventListener("click", () => { const user = currentUsers.find((entry) => entry.id === button.dataset.passwordUser); if (user) openPasswordPanel(user); }));
  }

  async function removeUser(id) {
    const user = currentUsers.find((entry) => entry.id === id);
    if (!user || id === session.userId || !confirm(`${user.name} wirklich entfernen?`)) return;
    const { data, error: functionError } = await supabase.functions.invoke("manage-users", { body:{ action:"delete", userId:id } });
    if (functionError || data?.error) return showToast(`Löschen fehlgeschlagen: ${data?.error || functionError?.message || "Unbekannter Fehler"}`);
    await renderUsers();
    showToast(`${user.name} wurde entfernt.`);
  }

  document.querySelector("#addUser").addEventListener("click", openPanel);
  document.querySelector("#cancelUser").addEventListener("click", closePanel);
  panel.addEventListener("click", (event) => { if (event.target === panel) closePanel(); });
  document.querySelector("#cancelPassword").addEventListener("click", closePasswordPanel);
  passwordPanel.addEventListener("click", (event) => { if (event.target === passwordPanel) closePasswordPanel(); });

  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    passwordError.hidden = true;
    const userId = document.querySelector("#passwordUserId").value;
    const password = document.querySelector("#assignedPassword").value;
    const repeat = document.querySelector("#assignedPasswordRepeat").value;
    if (password.length < 10) { passwordError.textContent = "Das Passwort muss mindestens 10 Zeichen lang sein."; passwordError.hidden = false; return; }
    if (password !== repeat) { passwordError.textContent = "Die beiden Passwörter stimmen nicht überein."; passwordError.hidden = false; return; }
    const submit = passwordForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    const { data, error: functionError } = await supabase.functions.invoke("manage-users", { body:{ action:"setPassword", userId, password } });
    submit.disabled = false;
    if (functionError || data?.error) { passwordError.textContent = data?.error || functionError?.message || "Passwort konnte nicht gespeichert werden."; passwordError.hidden = false; return; }
    const user = currentUsers.find((entry) => entry.id === userId);
    closePasswordPanel();
    showToast(`Passwort für ${user?.name || "den Benutzer"} wurde geändert.`);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.hidden = true;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    const name = document.querySelector("#userName").value.trim();
    const username = document.querySelector("#newUsername").value.trim().toLowerCase();
    const password = document.querySelector("#newPassword").value;
    const role = document.querySelector("#userRole").value;
    if (password.length < 10) { error.textContent = "Das Passwort muss mindestens 10 Zeichen lang sein."; error.hidden = false; submitButton.disabled = false; return; }
    const { data, error: functionError } = await supabase.functions.invoke("manage-users", { body:{ action:"create", name, username, password, role } });
    submitButton.disabled = false;
    if (functionError || data?.error) { error.textContent = data?.error || functionError?.message || "Benutzer konnte nicht angelegt werden."; error.hidden = false; return; }
    closePanel();
    await renderUsers();
    showToast(`${name} wurde angelegt.`);
  });

  await renderUsers();
}

initUsers().catch((loadError) => { console.error(loadError); showToast("Benutzerverwaltung konnte nicht geladen werden."); });