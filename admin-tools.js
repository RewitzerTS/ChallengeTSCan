(() => {
  const ARCHIVE_PREFIX = "[[TSF_ARCHIVE:";

  const uiStyle = document.createElement("style");
  uiStyle.textContent = `
    .condition-grid { display:grid; gap:10px; margin-top:4px; }
    .condition-rate { display:flex; justify-content:space-between; gap:18px; align-items:center; padding:12px 14px; border:1px solid rgba(255,255,255,.09); border-radius:10px; background:rgba(255,255,255,.035); }
    .condition-rate span { color:var(--secondary); font-size:13px; font-weight:700; text-transform:none; letter-spacing:0; }
    .condition-rate strong { font-size:16px; white-space:nowrap; }
    .condition-fees { display:grid; gap:8px; margin-top:4px; }
    .condition-fee { display:flex; justify-content:space-between; gap:18px; padding:9px 2px; color:var(--secondary); font-size:14px; }
    .condition-fee strong { color:var(--text); }
    .condition-fallback { margin:0; line-height:1.65; }
  `;
  document.head.append(uiStyle);

  if (!navItems.some((item) => item.id === "archiv")) {
    navItems.push({ id: "archiv", label: "Archiv", href: "archiv.html", icon: "▣" });
  }
  const originalVisibleNavItems = visibleNavItems;
  visibleNavItems = function () {
    return originalVisibleNavItems().filter((item) => item.id !== "archiv" || isAdmin());
  };

  function archiveMarker(status) {
    return `${ARCHIVE_PREFIX}${JSON.stringify({ status: status || "aktiv", at: new Date().toISOString() })}]]\n`;
  }

  function cleanConditions(value) {
    const text = String(value || "");
    if (!text.startsWith(ARCHIVE_PREFIX)) return text;
    const end = text.indexOf("]]\n");
    return end >= 0 ? text.slice(end + 3) : text;
  }

  function conditionMarkup(partner) {
    const terms = Array.isArray(partner.terms)
      ? partner.terms.filter((term) => term?.months && term?.amount)
      : [];

    if (!terms.length) {
      const fallback = cleanConditions(partner.conditions || formatPartnerConditions(partner));
      return `<p class="condition-fallback">${escapeHtml(fallback || "Noch keine Konditionen hinterlegt.")}</p>`;
    }

    const rates = terms
      .map((term) => {
        const months = Number(term.months);
        const label = months === 1 ? "1 Monat" : `${months} Monate`;
        return `<div class="condition-rate"><span>${label}</span><strong>${escapeHtml(formatMoney(term.amount))} €</strong></div>`;
      })
      .join("");

    const fees = [
      partner.hasTransponderFee
        ? `<div class="condition-fee"><span>Transpondergebühr</span><strong>29,90 € einmalig</strong></div>`
        : `<div class="condition-fee"><span>Transpondergebühr</span><strong>entfällt</strong></div>`,
      partner.hasServiceFee
        ? `<div class="condition-fee"><span>Servicepauschale</span><strong>29,90 € halbjährlich</strong></div>`
        : `<div class="condition-fee"><span>Servicepauschale</span><strong>entfällt</strong></div>`,
    ].join("");

    return `<div class="condition-grid">${rates}<div class="condition-fees">${fees}</div></div>`;
  }

  adminActions = function (partner) {
    if (!canManagePartners()) return "";
    const statusAction = window.tsfStatusActionLabel?.(partner) || "";
    return `
      ${statusAction ? `<button class="icon-btn" type="button" data-approve="${partner.id}" aria-label="${escapeHtml(statusAction)}">✓</button>` : ""}
      <button class="icon-btn" type="button" data-edit="${partner.id}" aria-label="${escapeHtml(partner.name)} bearbeiten">✎</button>
      <button class="icon-btn btn-danger" type="button" data-delete="${partner.id}" aria-label="${escapeHtml(partner.name)} archivieren" title="Archivieren">▣</button>
    `;
  };

  const previousRenderMobileCard = renderMobileCard;
  renderMobileCard = function (partner) {
    const markup = previousRenderMobileCard(partner);
    return markup
      .replace(/>Löschen<\/button>/g, ">Archivieren</button>")
      .replace(/data-delete=/g, 'title="Archivieren" data-delete=');
  };

  deletePartner = async function (id) {
    if (!canManagePartners()) return;
    const partner = state.partners.find((item) => item.id === id);
    if (!partner || !confirm(`${partner.name} wirklich archivieren? Die Daten bleiben erhalten und können vom Admin wiederhergestellt werden.`)) return;

    const supabase = await window.tsfAuth.getClient();
    const originalConditions = cleanConditions(partner.conditions || formatPartnerConditions(partner) || "");
    const conditions = `${archiveMarker(partner.status)}${originalConditions}`;
    const { error } = await supabase
      .from("partners")
      .update({ status: "offen", created_by: null, conditions })
      .eq("id", id);

    if (error) {
      showToast(`Archivieren fehlgeschlagen: ${error.message}`, "error");
      return;
    }

    state.partners = state.partners.filter((item) => item.id !== id);
    closeDrawer();
    render();
    showToast(`${partner.name} wurde archiviert.`);
  };

  openDrawer = function (id) {
    const partner = state.partners.find((item) => item.id === id);
    if (!partner) return;

    const adminSections = canManagePartners()
      ? `
        <div class="detail-section"><span>Ansprechpartner</span><strong>${escapeHtml(partner.contactName || "Nicht hinterlegt")}</strong><p>${escapeHtml(partner.contactPhone || "")}</p><p>${escapeHtml(partner.contactEmail || "")}</p></div>
        <div class="detail-section"><span>Besonderheiten</span><p>${escapeHtml(partner.notes || "Keine Besonderheiten hinterlegt.")}</p></div>
        <div class="detail-section"><span>Kooperation</span><p>Geschlossen von: ${escapeHtml(partner.closedBy || "Nicht hinterlegt")}</p><p>Zuständiges Studio: ${escapeHtml(partner.studio || "Nicht hinterlegt")}</p><p>Letzter Kontakt: ${partner.lastContact ? formatDate(partner.lastContact) : "Noch kein Kontakt"}</p></div>
        <div class="detail-section"><span>Kooperationsvertrag</span>${cooperationContractUrl(partner.contractUrl) ? `<a class="btn btn-secondary contract-link" href="${escapeHtml(cooperationContractUrl(partner.contractUrl))}" target="_blank" rel="noopener noreferrer">Vertrag in OneDrive öffnen ↗</a>` : "<p>Noch kein Vertragslink hinterlegt.</p>"}</div>
        <button class="btn btn-secondary" type="button" data-edit="${partner.id}">Bearbeiten</button>
      `
      : "";

    els.drawerType.textContent = typeLabel(partner.type);
    els.drawerTitle.textContent = partner.name;
    els.drawerBody.innerHTML = `<div class="detail-section"><span>Konditionen</span>${conditionMarkup(partner)}</div>${adminSections}`;
    els.detailBackdrop.hidden = false;
    els.detailDrawer.classList.add("is-open");
    els.detailDrawer.setAttribute("aria-hidden", "false");
    els.closeDrawer.focus();
    els.drawerBody.querySelectorAll("[data-edit]").forEach((button) => {
      button.addEventListener("click", () => editPartner(button.dataset.edit));
    });
  };
})();