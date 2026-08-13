(() => {
  const PREFIX = "[[TSF_ARCHIVE:";
  window.tsfArchive = window.tsfArchive || {};

  function parseArchive(value) {
    const text = String(value || "");
    if (!text.startsWith(PREFIX)) return null;
    const end = text.indexOf("]]\n");
    if (end < 0) return null;
    try { return { ...JSON.parse(text.slice(PREFIX.length, end)), conditions: text.slice(end + 3) }; }
    catch { return null; }
  }

  function esc(value) {
    const el = document.createElement("span");
    el.textContent = value ?? "";
    return el.innerHTML;
  }

  async function loadArchiveMeta() {
    const supabase = await window.tsfAuth.getClient();
    const { data } = await supabase.from("partners")
      .select("id,conditions,archived_at,archived_reason,archived_status")
      .not("archived_at", "is", null);
    return new Map((data || []).map((row) => [row.id, { ...row, parsed: parseArchive(row.conditions) }]));
  }

  function decorateReasons(meta) {
    document.querySelectorAll("[data-restore]").forEach((button) => {
      const row = meta.get(button.dataset.restore);
      if (!row) return;
      const reason = row.archived_reason || row.parsed?.reason || "Kein Grund hinterlegt";
      const card = button.closest(".mobile-card");
      if (card && !card.querySelector(".archive-reason")) {
        const info = document.createElement("span");
        info.className = "archive-reason";
        info.textContent = `Grund: ${reason}`;
        card.querySelector(".mobile-meta")?.append(info);
      }
      const tableRow = button.closest("tr");
      const archivedCell = tableRow?.children?.[3];
      if (archivedCell && !archivedCell.querySelector(".archive-reason")) {
        archivedCell.insertAdjacentHTML("beforeend", `<div class="table-muted archive-reason">${esc(reason)}</div>`);
      }
    });
  }

  const originalInitialize = window.tsfArchive.initialize;
  window.tsfArchive.initialize = async function () {
    document.addEventListener("click", async (event) => {
      const button = event.target.closest?.("[data-restore]");
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const meta = await loadArchiveMeta();
      const row = meta.get(button.dataset.restore);
      if (!row) return;
      const parsed = row.parsed || {};
      const status = ["aktiv", "offen", "pruefung", "ausstehend"].includes(row.archived_status || parsed.status)
        ? (row.archived_status || parsed.status)
        : "aktiv";
      if (!confirm("Partner wirklich reaktivieren?")) return;
      const supabase = await window.tsfAuth.getClient();
      const { error } = await supabase.from("partners").update({
        status,
        conditions: parsed.conditions ?? row.conditions,
        archived_at: null,
        archived_reason: null,
        archived_status: null,
      }).eq("id", button.dataset.restore);
      if (error) return alert(`Reaktivieren fehlgeschlagen: ${error.message}`);
      window.location.reload();
    }, true);

    await originalInitialize();
    const meta = await loadArchiveMeta();
    decorateReasons(meta);
    new MutationObserver(() => decorateReasons(meta)).observe(document.body, { childList:true, subtree:true });
  };
})();