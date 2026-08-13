(() => {
  const ARCHIVE_PREFIX = "[[TSF_ARCHIVE:";
  const session = window.tsfAuth.readSession?.() || {};

  const style = document.createElement("style");
  style.textContent = `
    .crm-actions{display:flex;flex-wrap:wrap;gap:8px}.crm-history{display:grid;gap:10px}.crm-history-item{padding:10px 12px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(255,255,255,.035)}.crm-history-item strong{display:block;margin-bottom:3px}.crm-history-item small{color:var(--muted)}
    .proposal-progress{margin-bottom:24px}.proposal-progress-grid{display:grid;gap:10px}.proposal-progress-row{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:12px 14px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(255,255,255,.035)}.proposal-progress-row span{color:var(--secondary);font-size:13px}
  `;
  document.head.append(style);

  function cleanConditions(value) {
    const text = String(value || "");
    if (!text.startsWith(ARCHIVE_PREFIX)) return text;
    const end = text.indexOf("]]\n");
    return end >= 0 ? text.slice(end + 3) : text;
  }

  function archiveMarker(status, reason) {
    return `${ARCHIVE_PREFIX}${JSON.stringify({ status: status || "aktiv", at: new Date().toISOString(), reason })}]]\n`;
  }

  deletePartner = async function (id) {
    if (!canManagePartners()) return;
    const partner = state.partners.find((item) => item.id === id);
    if (!partner) return;
    const reason = window.prompt(`Warum wird ${partner.name} archiviert?`, "Kooperation beendet");
    if (reason === null) return;
    if (!reason.trim()) {
      showToast("Bitte gib einen Archivierungsgrund an.", "error");
      return;
    }
    if (!confirm(`${partner.name} wirklich archivieren? Die Daten bleiben erhalten und können vom Admin wiederhergestellt werden.`)) return;

    const supabase = await window.tsfAuth.getClient();
    const originalConditions = cleanConditions(partner.conditions || formatPartnerConditions(partner) || "");
    const conditions = `${archiveMarker(partner.status, reason.trim())}${originalConditions}`;
    const { error } = await supabase.from("partners").update({
      status: "offen",
      created_by: null,
      conditions,
      archived_at: new Date().toISOString(),
      archived_reason: reason.trim(),
      archived_status: window.tsfStatusWorkflow.baseStatus(partner),
    }).eq("id", id);

    if (error) return showToast(`Archivieren fehlgeschlagen: ${error.message}`, "error");
    state.partners = state.partners.filter((item) => item.id !== id);
    closeDrawer();
    render();
    showToast(`${partner.name} wurde archiviert.`);
    setTimeout(() => window.location.reload(), 450);
  };

  const previousOpenDrawer = openDrawer;
  openDrawer = function (id) {
    previousOpenDrawer(id);
    if (!canManagePartners()) return;
    const partner = state.partners.find((item) => item.id === id);
    if (!partner || !els.drawerBody) return;

    const contactSection = document.createElement("div");
    contactSection.className = "detail-section";
    contactSection.innerHTML = `
      <span>Kontaktaktionen</span>
      <div class="crm-actions">
        ${partner.contactPhone ? `<a class="btn btn-secondary" href="tel:${escapeHtml(partner.contactPhone.replace(/\s/g, ""))}">Anrufen</a>` : ""}
        ${partner.contactEmail ? `<a class="btn btn-secondary" href="mailto:${escapeHtml(partner.contactEmail)}">E-Mail schreiben</a>` : ""}
        <button class="btn btn-secondary" type="button" data-contact-log>Kontakt dokumentieren</button>
      </div>`;
    els.drawerBody.append(contactSection);

    const historySection = document.createElement("div");
    historySection.className = "detail-section";
    historySection.innerHTML = `<span>Kontaktverlauf</span><div class="crm-history" data-contact-history><p>Wird geladen…</p></div>`;
    els.drawerBody.append(historySection);

    const contract = els.drawerBody.querySelector(".contract-link");
    if (contract) contract.textContent = "Kooperationsvertrag öffnen ↗";

    contactSection.querySelector("[data-contact-log]")?.addEventListener("click", () => logContact(partner));
    loadHistory(partner.id, historySection.querySelector("[data-contact-history]"));
  };

  async function loadHistory(partnerId, target) {
    const supabase = await window.tsfAuth.getClient();
    const { data, error } = await supabase.from("partner_contact_history")
      .select("id,contacted_at,contact_type,note,created_by_name")
      .eq("partner_id", partnerId)
      .order("contacted_at", { ascending: false });
    if (error) {
      target.innerHTML = `<p>Kontaktverlauf konnte nicht geladen werden.</p>`;
      return;
    }
    const labels = { phone:"Telefon", email:"E-Mail", personal:"Persönlich", other:"Sonstiger Kontakt" };
    target.innerHTML = (data || []).length ? data.map((item) => `<div class="crm-history-item"><strong>${labels[item.contact_type] || "Kontakt"} · ${new Intl.DateTimeFormat("de-DE", {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(item.contacted_at))}</strong><div>${escapeHtml(item.note || "Ohne Notiz")}</div><small>${escapeHtml(item.created_by_name || "Unbekannt")}</small></div>`).join("") : `<p>Noch kein Kontakt dokumentiert.</p>`;
  }

  async function logContact(partner) {
    const typeInput = window.prompt("Kontaktart eingeben: Telefon, E-Mail, Persönlich oder Sonstiges", "Telefon");
    if (typeInput === null) return;
    const note = window.prompt("Kurze Notiz zum Kontakt:", "");
    if (note === null) return;
    const normalized = String(typeInput).trim().toLowerCase();
    const type = normalized.startsWith("tel") ? "phone" : normalized.startsWith("e") ? "email" : normalized.startsWith("pers") ? "personal" : "other";
    const supabase = await window.tsfAuth.getClient();
    const now = new Date();
    const { error } = await supabase.from("partner_contact_history").insert({
      partner_id: partner.id,
      contacted_at: now.toISOString(),
      contact_type: type,
      note: note.trim(),
      created_by_name: session.name || session.username || "Clubleitung",
    });
    if (error) return showToast(`Kontakt konnte nicht gespeichert werden: ${error.message}`, "error");

    const today = window.tsfStatusWorkflow.todayIso();
    const { error: detailError } = await supabase.from("partner_details").update({ last_contact: today }).eq("partner_id", partner.id);
    if (detailError) return showToast(`Kontakt gespeichert, Datum konnte aber nicht aktualisiert werden: ${detailError.message}`, "error");
    partner.lastContact = today;
    render();
    openDrawer(partner.id);
    showToast(`Kontakt zu ${partner.name} wurde dokumentiert.`);
  }

  function normalizeName(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(gmbh|ag|kg|e\.v\.|ev|se|co|und|&|verein)\b/g, "").replace(/[^a-z0-9]/g, "");
  }

  const priorSubmit = handleFormSubmit;
  handleFormSubmit = function (event) {
    const isNew = !$("#partnerId")?.value;
    if (isNew) {
      const entered = normalizeName($("#partnerName")?.value);
      const duplicate = state.partners.find((partner) => normalizeName(partner.name) === entered);
      if (entered && duplicate && !confirm(`„${duplicate.name}“ ist bereits vorhanden. Trotzdem einen weiteren Partner mit diesem Namen anlegen?`)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        $("#partnerName")?.focus();
        return;
      }
    }
    return priorSubmit(event);
  };
  if (els.partnerForm) {
    els.partnerForm.removeEventListener("submit", priorSubmit);
    els.partnerForm.addEventListener("submit", handleFormSubmit);
  }

  function proposalLabel(status) {
    return ({ offen:"Offen", pruefung:"Wird geprüft", ausstehend:"Kontaktiert", aktiv:"Kooperation abgeschlossen" })[status] || status;
  }

  function renderProposalProgress() {
    document.querySelector("#proposalProgress")?.remove();
    if (state.role !== "employee") return;
    const own = state.partners.filter((partner) => partner.createdBy === session.userId);
    if (!own.length) return;
    const section = document.createElement("section");
    section.id = "proposalProgress";
    section.className = "card proposal-progress";
    section.innerHTML = `<div class="card-header"><div><h2>Meine Vorschläge</h2><p>So weit ist die Bearbeitung deiner eingereichten Firmen und Vereine.</p></div></div><div class="proposal-progress-grid">${own.map((partner) => `<div class="proposal-progress-row"><div><strong>${escapeHtml(partner.name)}</strong><span>${typeLabel(partner.type)}</span></div>${statusBadge(partner.status === "pruefung" ? "pruefung" : partner.status)}</div>`).join("")}</div>`;
    const anchor = document.querySelector(".filters-card");
    anchor?.parentNode?.insertBefore(section, anchor);
  }

  const previousRender = render;
  render = function () {
    previousRender();
    renderProposalProgress();
  };
})();