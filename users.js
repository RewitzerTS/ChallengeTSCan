const session = window.tsfAuth.readSession();
const roleNames = { employee: "Mitarbeiter", clubManager: "Clubleiter", admin: "Admin" };
const panel = document.querySelector("#userPanel");
const form = document.querySelector("#userForm");
const error = document.querySelector("#userError");

document.querySelector("#currentUser").textContent = `${session.name || session.username} · Admin`;
document.querySelector("#logoutButton").addEventListener("click", window.tsfLogout);

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function renderUsers() {
  const users = window.tsfAuth.readUsers();
  document.querySelector("#userCount").textContent = `${users.length} Benutzerkonten`;
  document.querySelector("#userTableBody").innerHTML = users.map((user) => `<tr><td><strong>${escapeHtml(user.name)}</strong></td><td>${escapeHtml(user.username)}</td><td><span class="badge badge-neutral">${roleNames[user.role]}</span></td><td><div class="row-actions"><button class="icon-btn btn-danger" data-remove-user="${user.id}" type="button" aria-label="${escapeHtml(user.name)} entfernen" ${user.id === session.userId ? "disabled title=\"Das eigene Konto kann nicht entfernt werden\"" : ""}>×</button></div></td></tr>`).join("");
  document.querySelector("#userMobileList").innerHTML = users.map((user) => `<article class="mobile-card"><div class="mobile-card-top"><div class="partner-name"><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.username)}</span></div><span class="badge badge-neutral">${roleNames[user.role]}</span></div>${user.id !== session.userId ? `<button class="btn btn-danger" data-remove-user="${user.id}" type="button">Benutzer entfernen</button>` : ""}</article>`).join("");
  document.querySelectorAll("[data-remove-user]").forEach((button) => button.addEventListener("click", () => removeUser(button.dataset.removeUser)));
}

function removeUser(id) {
  const users = window.tsfAuth.readUsers();
  const user = users.find((entry) => entry.id === id);
  if (!user || id === session.userId || !confirm(`${user.name} wirklich entfernen?`)) return;
  window.tsfAuth.saveUsers(users.filter((entry) => entry.id !== id));
  renderUsers();
  showToast(`${user.name} wurde entfernt.`);
}

function closePanel() { panel.hidden = true; form.reset(); error.hidden = true; document.body.classList.remove("modal-open"); }
function openPanel() { panel.hidden = false; document.body.classList.add("modal-open"); setTimeout(() => document.querySelector("#userName").focus(), 0); }
function showToast(message) { const toast = document.querySelector("#toast"); toast.textContent = message; toast.hidden = false; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.hidden = true; }, 3000); }

document.querySelector("#addUser").addEventListener("click", openPanel);
document.querySelector("#cancelUser").addEventListener("click", closePanel);
panel.addEventListener("click", (event) => { if (event.target === panel) closePanel(); });
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const users = window.tsfAuth.readUsers();
  const username = document.querySelector("#newUsername").value.trim();
  if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) { error.textContent = "Dieser Benutzername ist bereits vergeben."; error.hidden = false; return; }
  const user = { id: `u-${Date.now()}`, name: document.querySelector("#userName").value.trim(), username, password: document.querySelector("#newPassword").value, role: document.querySelector("#userRole").value };
  window.tsfAuth.saveUsers([...users, user]);
  closePanel(); renderUsers(); showToast(`${user.name} wurde angelegt.`);
});

renderUsers();
