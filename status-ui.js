(() => {
  const uiStyle = document.createElement("style");
  uiStyle.textContent = `
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
    .brand-fallback { display: none !important; }
    .empty-state[hidden] { display: none !important; }
  `;
  document.head.append(uiStyle);

  document.querySelectorAll(".brand img, .mobile-brand img").forEach((image) => {
    image.src = "assets/top-sports-logo.svg";
  });
  document.querySelectorAll(".brand-fallback").forEach((fallback) => {
    fallback.hidden = true;
  });

  renderHeader = function () {
    const configs = {
      uebersicht: ["Partnerdatenbank", "Firmenfitness-/Vereinsfitnesspartner", "Suche nach Firmen und Vereinen und prüfe die freigegebenen Konditionen.", ""],
      firmenfitness: ["Firmenfitness", "Firmenpartner", "Alle freigegebenen Firmenfitness-Partnerschaften und Konditionen im Überblick.", "Firmenpartner anlegen"],
      vereinsfitness: ["Vereinsfitness", "Vereinspartner", "Alle freigegebenen Vereinsfitness-Partnerschaften und Konditionen im Überblick.", "Vereinspartner anlegen"],
      verwaltung: ["Verwaltung", "Partner verwalten", "Offene Vorschläge prüfen, Kontaktstatus pflegen und aktive Kooperationen verwalten.", "Partner anlegen"],
    };
    const config = configs[state.page];
    if (!config) return;
    els.pageEyebrow.textContent = config[0];
    els.pageTitle.textContent = config[1];
    els.pageDescription.textContent = config[2];
    els.breadcrumbPage.textContent = navItems.find((item) => item.id === state.page)?.label || "Übersicht";
    els.currentRoleLabel.textContent = ({ employee: "Theke", clubManager: "Clubleiter", admin: "Admin" })[state.role] || "Theke";
    if (els.pagePrimaryAction) {
      const suggest = state.role === "employee" && ["firmenfitness", "vereinsfitness"].includes(state.page);
      els.pagePrimaryAction.hidden = !(suggest || (canManagePartners() && config[3]));
      els.pagePrimaryAction.textContent = suggest
        ? (state.page === "firmenfitness" ? "+ Firmenpartner vorschlagen" : "+ Vereinspartner vorschlagen")
        : `+ ${config[3]}`;
    }
    document.body.dataset.page = state.page;
    document.body.dataset.role = state.role;
  };

  renderTableRow = function (partner) {
    const conditions = formatPartnerConditions(partner) || "Noch keine Konditionen hinterlegt.";
    const adminColumns = canManagePartners()
      ? `<td><div class="partner-name"><strong>${partner.contactName || "–"}</strong><span>${partner.contactEmail || ""}</span></div></td><td>${formatDate(partner.lastContact)}</td><td>${statusBadge(effectivePartnerStatus(partner))}</td>`
      : "";
    return `<tr data-view-row="${partner.id}" tabindex="0" aria-label="${partner.name} Details öffnen"><td><div class="partner-name"><strong>${partner.name}</strong><span>${canManagePartners() ? partner.studio : typeLabel(partner.type)}</span></div></td><td>${typeLabel(partner.type)}</td><td>${conditions}</td>${adminColumns}<td><div class="row-actions"><button class="icon-btn" type="button" data-view="${partner.id}" aria-label="${partner.name} öffnen">↗</button>${adminActions(partner)}</div></td></tr>`;
  };

  renderMobileCard = function (partner) {
    const label = canManagePartners() ? window.tsfStatusActionLabel(partner) : "";
    const conditions = formatPartnerConditions(partner) || "Noch keine Konditionen hinterlegt.";
    const meta = canManagePartners()
      ? `<span>${partner.contactName || "Kein Ansprechpartner"}${partner.contactPhone ? ` · ${partner.contactPhone}` : ""}</span><span>Letzter Kontakt: ${formatDate(partner.lastContact)}</span>`
      : "";
    return `<article class="mobile-card" data-view-row="${partner.id}" tabindex="0" aria-label="${partner.name} Details öffnen"><div class="mobile-card-top"><div class="partner-name"><strong>${partner.name}</strong><span>${typeLabel(partner.type)}${canManagePartners() ? ` · ${partner.studio}` : ""}</span></div>${canManagePartners() ? statusBadge(effectivePartnerStatus(partner)) : ""}</div><div class="mobile-meta"><span>${conditions}</span>${meta}</div><div class="mobile-actions"><button class="btn btn-secondary" type="button" data-view="${partner.id}">Öffnen</button>${label ? `<button class="btn btn-secondary" type="button" data-approve="${partner.id}">${label}</button>` : ""}${canManagePartners() ? `<button class="btn btn-danger" type="button" data-delete="${partner.id}">Löschen</button>` : ""}</div></article>`;
  };
})();