(() => {
  const PREFIX = "[[TSF_ARCHIVE:";
  window.tsfArchive = window.tsfArchive || {};

  const esc = (value) => {
    const el = document.createElement("span");
    el.textContent = value ?? "";
    return el.innerHTML;
  };
  const typeLabel = (type) => type === "firma" ? "Firmenfitness" : "Vereinsfitness";
  const formatDateTime = (value) => value ? new Intl.DateTimeFormat("de-DE", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }).format(new Date(value)) : "–";

  function parseArchive(value) {
    const text = String(value || "");
    if (!text.startsWith(PREFIX)) return null;
    const end = text.indexOf("]]\n");
    if (end < 0) return null;
    try {
      return { ...JSON.parse(text.slice(PREFIX.length, end)), conditions: text.slice(end + 3) };
    } catch { return null; }
  }

  window.tsfArchive.initialize = async function (session) {
    const supabase = await window.tsfAuth.getClient();
    let archived = [];
    let query = "";

    const toast = (message, isError = false) => {
      const el = document.querySelector("#toast");
      el.textContent = message;
      el.style.borderLeftColor = isError ? "var(--error)" : "var(--success)";
      el.hidden = false;
      clearTimeout(toast.timer);
      toast.timer = setTimeout(() => (el.hidden = true), 3500);
    };

    function render() {
      const filtered = archived.filter((row) => !query || `${row.name} ${row.studio} ${typeLabel(row.type)}`.toLowerCase().includes(query));
      document.querySelector("#archiveCount").textContent = filtered.length === 1 ? "1 Eintrag" : `${filtered.length} Einträge`;
      document.querySelector("#archiveEmpty").hidden = filtered.length > 0;
      document.querySelector("#archiveTableBody").innerHTML = filtered.map((row) => `<tr><td><strong>${esc(row.name)}</strong></td><td>${typeLabel(row.type)}</td><td>${esc(row.studio)}</td><td>${formatDateTime(row.archive.at)}</td><td><div class="archive-actions"><button class="btn btn-secondary" data-restore="${row.id}" type="button">Reaktivieren</button></div></td></tr>`).join("");
      document.querySelector("#archiveMobileList").innerHTML = filtered.map((row) => `<article class="mobile-card"><div class="mobile-card-top"><div class="partner-name"><strong>${esc(row.name)}</strong><span>${typeLabel(row.type)} · ${esc(row.studio)}</span></div></div><div class="mobile-meta"><span>Archiviert: ${formatDateTime(row.archive.at)}</span></div><button class="btn btn-secondary" data-restore="${row.id}" type="button">Reaktivieren</button></article>`).join("");
      document.querySelectorAll("[data-restore]").forEach((button) => button.addEventListener("click", () => restore(button.dataset.restore)));
    }

    async function load() {
      const { data, error } = await supabase.from("partners").select("id,type,name,studio,status,conditions,created_by,updated_at").eq("status", "offen").is("created_by", null).order("updated_at", { ascending:false });
      if (error) return toast(`Archiv konnte nicht geladen werden: ${error.message}`, true);
      archived = (data || []).map((row) => ({ ...row, archive: parseArchive(row.conditions) })).filter((row) => row.archive);
      render();
    }

    async function restore(id) {
      const row = archived.find((item) => item.id === id);
      if (!row || !confirm(`${row.name} wirklich reaktivieren?`)) return;
      const nextStatus = ["aktiv", "offen", "ausstehend"].includes(row.archive.status) ? row.archive.status : "aktiv";
      const { error } = await supabase.from("partners").update({ status: nextStatus, conditions: row.archive.conditions }).eq("id", id);
      if (error) return toast(`Reaktivieren fehlgeschlagen: ${error.message}`, true);
      archived = archived.filter((item) => item.id !== id);
      render();
      toast(`${row.name} wurde reaktiviert.`);
    }

    document.querySelector("#archiveLogout").addEventListener("click", window.tsfLogout);
    document.querySelector("#archiveSearch").addEventListener("input", (event) => { query = event.target.value.trim().toLowerCase(); render(); });
    await load();
  };
})();