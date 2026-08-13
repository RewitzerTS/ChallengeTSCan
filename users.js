const userUiStyle = document.createElement("style");
userUiStyle.textContent = `
  .topbar { display: none !important; }
  .brand { min-height: 82px; }
  .brand img {
    content: url("assets/top-sports-logo.svg");
    width: 140px;
    max-width: 140px;
    height: auto;
    max-height: 78px;
    object-fit: contain;
  }
`;
document.head.append(userUiStyle);
const userBrandLogo = document.querySelector(".brand img");
if (userBrandLogo) userBrandLogo.src = "assets/top-sports-logo.svg";

const roleNames = { employee: "Theke", clubManager: "Clubleiter", admin: "Admin" };
const panel = document.querySelector("#userPanel");
const form = document.querySelector("#userForm");
const error = document.querySelector("#userError");

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
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 3000);
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

async function initUsers() {
  const session = await window.tsfAuth.ready;
  if (!session) return;

  const supabase = await window.tsfAuth.getClient();
  document.querySelector("#currentUser").textContent = `${session.name || session.username} · Admin`;
  document.querySelector("#logoutButton").addEventListener("click", window.tsfLogout);

  async function renderUsers() {
    const { data: users, error: loadError } = await supabase
      .from("profiles")
      .select("id,name,username,role")
      .order("name", { ascending: true });

    if (loadError) {
      showToast(`Benutzer konnten nicht geladen werden: ${loadError.message}`);
      return;
    }

    document.querySelector("#userCount").textContent = `${users.length} Benutzerkonten`;
    document.querySelector("#userTableBody").innerHTML = users
      .map(
        (user) => `<tr>
          <td><strong>${escapeHtml(user.name)}</strong></td>
          <td>${escapeHtml(user.username)}</td>
          <td><span class="badge badge-neutral">${roleNames[user.role] || escapeHtml(user.role)}</span></td>
          <td><div class="row-actions"><button class="icon-btn btn-danger" data-remove-user="${user.id}" type="button" aria-label="${escapeHtml(user.name)} entfernen" ${user.id === session.userId ? 'disabled title="Das eigene Konto kann nicht entfernt werden"' : ""}>×</button></div></td>
        </tr>`
      )
      .join("");

    document.querySelector("#userMobileList").innerHTML = users
      .map(
        (user) => `<article class="mobile-card">
          <div class="mobile-card-top">
            <div class="partner-name"><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.username)}</span></div>
            <span class="badge badge-neutral">${roleNames[user.role] || escapeHtml(user.role)}</span>
          </div>
          ${user.id !== session.userId ? `<button class="btn btn-danger" data-remove-user="${user.id}" type="button">Benutzer entfernen</button>` : ""}
        </article>`
      )
      .join("");

    document.querySelectorAll("[data-remove-user]").forEach((button) =>
      button.addEventListener("click", () => removeUser(button.dataset.removeUser, users))
    );
  }

  async function removeUser(id, users) {
    const user = users.find((entry) => entry.id === id);
    if (!user || id === session.userId || !confirm(`${user.name} wirklich entfernen?`)) return;

    const { data, error: functionError } = await supabase.functions.invoke("manage-users", {
      body: { action: "delete", userId: id },
    });

    if (functionError || data?.error) {
      showToast(`Löschen fehlgeschlagen: ${data?.error || functionError?.message || "Unbekannter Fehler"}`);
      return;
    }

    await renderUsers();
    showToast(`${user.name} wurde entfernt.`);
  }

  document.querySelector("#addUser").addEventListener("click", openPanel);
  document.querySelector("#cancelUser").addEventListener("click", closePanel);
  panel.addEventListener("click", (event) => {
    if (event.target === panel) closePanel();
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

    if (password.length < 10) {
      error.textContent = "Das Passwort muss mindestens 10 Zeichen lang sein.";
      error.hidden = false;
      submitButton.disabled = false;
      return;
    }

    const { data, error: functionError } = await supabase.functions.invoke("manage-users", {
      body: { action: "create", name, username, password, role },
    });

    submitButton.disabled = false;

    if (functionError || data?.error) {
      error.textContent = data?.error || functionError?.message || "Benutzer konnte nicht angelegt werden.";
      error.hidden = false;
      return;
    }

    closePanel();
    await renderUsers();
    showToast(`${name} wurde angelegt.`);
  });

  await renderUsers();
}

initUsers().catch((loadError) => {
  console.error(loadError);
  showToast("Benutzerverwaltung konnte nicht geladen werden.");
});
