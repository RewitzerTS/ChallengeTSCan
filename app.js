const STORAGE_KEY = "tsf-partnerverwaltung-v2";

const pageByFile = {
  "index.html": "uebersicht",
  "": "uebersicht",
  "firmenfitness.html": "firmenfitness",
  "vereinsfitness.html": "vereinsfitness",
  "verwaltung.html": "verwaltung",
};

const navItems = [
  { id: "uebersicht", label: "Übersicht", href: "index.html", icon: "▦" },
  { id: "firmenfitness", label: "Firmenfitness", href: "firmenfitness.html", icon: "▤" },
  { id: "vereinsfitness", label: "Vereinsfitness", href: "vereinsfitness.html", icon: "▥" },
  { id: "verwaltung", label: "Verwaltung", href: "verwaltung.html", icon: "▧" },
];

const seedPartners = [
  {
    id: "p-1001",
    type: "firma",
    name: "Bosch GmbH",
    contactName: "Mara Schneider",
    contactPhone: "+49 711 811-4200",
    contactEmail: "mara.schneider@bosch.com",
    studio: "Echterdingen",
    closedBy: "Clubleitung Echterdingen",
    lastContact: "2026-06-12",
    conditions: "Firmenfitness 1 Monat 39 EUR, keine Startgebühr bei Mitarbeiterausweis.",
    notes: "Nachweis über Bosch Mitarbeiterausweis oder digitale Beschäftigungsbestätigung erforderlich.",
    status: "aktiv",
  },
  {
    id: "p-1002",
    type: "firma",
    name: "Daimler Truck AG",
    contactName: "Thomas Keller",
    contactPhone: "+49 711 8485-233",
    contactEmail: "fitness@daimlertruck.com",
    studio: "Leinfelden",
    closedBy: "Regionalleitung",
    lastContact: "2026-05-28",
    conditions: "Firmenfitness Premium 12 Monate, 15 % Rabatt, Startpaket inklusive.",
    notes: "Quartalsweise Auswertung der aktiven Mitgliedschaften an HR senden.",
    status: "aktiv",
  },
  {
    id: "p-1003",
    type: "firma",
    name: "Festo SE & Co. KG",
    contactName: "Julia Berger",
    contactPhone: "+49 711 347-0",
    contactEmail: "j.berger@festo.com",
    studio: "Nürtingen",
    closedBy: "Studioleitung Nürtingen",
    lastContact: "2026-04-18",
    conditions: "Firmenfitness Classic, 8 % Rabatt, Probemonat nach HR-Freigabe.",
    notes: "Kooperation soll im Juli 2026 neu bewertet werden.",
    status: "offen",
  },
  {
    id: "p-1004",
    type: "verein",
    name: "VfL Pfullingen",
    contactName: "Sven Maier",
    contactPhone: "+49 7121 78033",
    contactEmail: "geschaeftsstelle@vfl-pfullingen.de",
    studio: "Reutlingen",
    closedBy: "Clubleitung Reutlingen",
    lastContact: "2026-06-03",
    conditions: "Vereinsfitness 12 % Rabatt, Team-Screening nach Terminvereinbarung.",
    notes: "Gilt für Mitglieder mit aktueller Vereinsbestätigung. Mannschaftsaktionen separat abstimmen.",
    status: "aktiv",
  },
  {
    id: "p-1005",
    type: "verein",
    name: "TSV Leinfelden",
    contactName: "Nadine Roth",
    contactPhone: "+49 711 754240",
    contactEmail: "info@tsv-leinfelden.de",
    studio: "Leinfelden",
    closedBy: "Studioleitung Leinfelden",
    lastContact: "2026-03-21",
    conditions: "Vereinsfitness 10 % auf Laufzeitverträge, keine Aufnahmegebühr bei Vereinsnachweis.",
    notes: "Jugendliche nur mit regulärer Einverständniserklärung und Beratungstermin.",
    status: "aktiv",
  },
  {
    id: "p-1006",
    type: "verein",
    name: "SV Salamander Kornwestheim",
    contactName: "Patrick Braun",
    contactPhone: "+49 7154 20245",
    contactEmail: "partner@svkornwestheim.de",
    studio: "Kornwestheim",
    closedBy: "Clubleitung Kornwestheim",
    lastContact: "2026-02-15",
    conditions: "Vereinskondition offen, Bestandstarif bis Neuverhandlung gültig.",
    notes: "Ansprechpartner wechselt im Sommer. Vertrag vor Verlängerung prüfen.",
    status: "kritisch",
  },
];

const currentFile = window.location.pathname.split("/").pop();
const state = {
  page: pageByFile[currentFile] || "uebersicht",
  role: localStorage.getItem("tsf-role") || "employee",
  query: "",
  studio: "alle",
  formOpen: false,
  partners: loadPartners(),
};

const $ = (selector) => document.querySelector(selector);
const els = {
  desktopNav: $("#desktopNav"),
  mobileNav: $("#mobileNav"),
  breadcrumbPage: $("#breadcrumbPage"),
  currentRoleLabel: $("#currentRoleLabel"),
  roleToggle: $("#roleToggle"),
  globalSearch: $("#globalSearch"),
  pageEyebrow: $("#pageEyebrow"),
  pageTitle: $("#pageTitle"),
  pageDescription: $("#pageDescription"),
  pagePrimaryAction: $("#pagePrimaryAction"),
  kpiGrid: $("#kpiGrid"),
  partnerSearch: $("#partnerSearch"),
  studioFilter: $("#studioFilter"),
  overviewSections: $("#overviewSections"),
  partnerTableBody: $("#partnerTableBody"),
  partnerMobileList: $("#partnerMobileList"),
  resultCount: $("#resultCount"),
  resetFilters: $("#resetFilters"),
  emptyReset: $("#emptyReset"),
  emptyState: $("#emptyState"),
  adminPanel: $("#adminPanel"),
  partnerForm: $("#partnerForm"),
  formError: $("#formError"),
  cancelEdit: $("#cancelEdit"),
  detailBackdrop: $("#detailBackdrop"),
  detailDrawer: $("#detailDrawer"),
  drawerType: $("#drawerType"),
  drawerTitle: $("#drawerTitle"),
  drawerBody: $("#drawerBody"),
  closeDrawer: $("#closeDrawer"),
  toast: $("#toast"),
};

function isAdmin() {
  return state.role === "admin";
}

function loadPartners() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : seedPartners;
  } catch {
    return seedPartners;
  }
}

function savePartners() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.partners));
}

function typeLabel(type) {
  return type === "firma" ? "Firmenfitness" : "Vereinsfitness";
}

function formatMoney(value) {
  const raw = String(value ?? "").trim().replace("€", "").replace(/eur/i, "").trim();
  const parsed = Number(raw.replace(/\./g, "").replace(",", "."));
  if (!raw) return "";
  if (Number.isNaN(parsed)) return raw;
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function formatPartnerConditions(partner) {
  if (Array.isArray(partner.terms) && partner.terms.length) {
    const tariffText = partner.terms
      .filter((term) => term.months && term.amount)
      .map((term) => {
        const months = Number(term.months);
        const duration = months === 1 ? "1 Monat" : `${months} Monate`;
        return `${duration} ${formatMoney(term.amount)} €`;
      })
      .join(" / ");
    const fees = [];

    if (partner.hasTransponderFee) fees.push("zzgl. einmalig 29,90 € Transpondergebühr");
    if (partner.hasServiceFee) fees.push("zzgl. 29,90 € halbjährliche Servicepauschale");

    return `${typeLabel(partner.type)} ${tariffText}${fees.length ? `, ${fees.join(" und ")}` : ""}.`;
  }

  if (partner.termMonths && partner.termAmount) {
    const months = Number(partner.termMonths);
    const duration = months === 1 ? "1 Monat" : `${months} Monate`;
    const fees = [];

    if (partner.hasTransponderFee) fees.push("zzgl. einmalig 29,90 € Transpondergebühr");
    if (partner.hasServiceFee) fees.push("zzgl. 29,90 € halbjährliche Servicepauschale");

    return `${typeLabel(partner.type)} ${duration} ${formatMoney(partner.termAmount)} €${fees.length ? `, ${fees.join(" und ")}` : ""}.`;
  }

  return partner.conditions || "";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function statusBadge(status) {
  const map = {
    aktiv: ["badge-active", "Aktiv"],
    offen: ["badge-open", "Prüfen"],
    kritisch: ["badge-critical", "Kritisch"],
  };
  const [className, label] = map[status] || ["badge-neutral", "Neutral"];
  return `<span class="badge ${className}">${label}</span>`;
}

function pageTypeFilter() {
  if (state.page === "firmenfitness") return "firma";
  if (state.page === "vereinsfitness") return "verein";
  return "alle";
}

function filteredPartners() {
  const filter = pageTypeFilter();
  const query = state.query.trim().toLowerCase();

  return state.partners.filter((partner) => {
    const matchesType = filter === "alle" || partner.type === filter;
    const matchesStudio = state.studio === "alle" || partner.studio === state.studio;
    const conditionText = formatPartnerConditions(partner);
    const publicText = [partner.name, typeLabel(partner.type), conditionText].join(" ").toLowerCase();
    const adminText = [
      partner.name,
      typeLabel(partner.type),
      conditionText,
      partner.contactName,
      partner.contactEmail,
      partner.contactPhone,
      partner.notes,
      partner.closedBy,
      partner.studio,
    ].join(" ").toLowerCase();

    return matchesType && matchesStudio && (!query || (isAdmin() ? adminText : publicText).includes(query));
  });
}

function renderNavigation() {
  const markup = navItems
    .map(
      (item) => `
        <a class="nav-item ${state.page === item.id ? "is-active" : ""}" href="${item.href}">
          <span aria-hidden="true">${item.icon}</span>
          <span>${item.label}</span>
        </a>
      `
    )
    .join("");

  els.desktopNav.innerHTML = markup;
  els.mobileNav.innerHTML = markup;
}

function renderHeader() {
  const configs = {
    uebersicht: [
      "Partnerdatenbank",
      "Kooperationspartner im Überblick",
      "Suche nach Firmen und Vereinen und prüfe die freigegebenen Konditionen.",
      "",
    ],
    firmenfitness: [
      "Firmenfitness",
      "Firmenpartner",
      "Alle Firmenkooperationen mit den freigegebenen Konditionen.",
      "Firmenpartner anlegen",
    ],
    vereinsfitness: [
      "Vereinsfitness",
      "Vereinspartner",
      "Alle Vereinspartner mit den freigegebenen Konditionen.",
      "Vereinspartner anlegen",
    ],
    verwaltung: [
      "Verwaltung",
      "Partner verwalten",
      "Kooperationen anlegen, bearbeiten und löschen.",
      "Partner speichern",
    ],
  };

  const config = configs[state.page];
  els.pageEyebrow.textContent = config[0];
  els.pageTitle.textContent = config[1];
  els.pageDescription.textContent = isAdmin() ? config[2] : config[2].replace("anlegen, bearbeiten und löschen", "anzeigen");
  els.breadcrumbPage.textContent = navItems.find((item) => item.id === state.page).label;
  els.currentRoleLabel.textContent = isAdmin() ? "Clubleiter" : "Mitarbeiter";
  els.roleToggle.textContent = isAdmin() ? "Lesemodus" : "Admin-Modus";
  els.pagePrimaryAction.hidden = !isAdmin() || state.page !== "verwaltung";
  els.pagePrimaryAction.textContent = `+ ${config[3] || "Partner anlegen"}`;
  document.body.dataset.page = state.page;
  document.body.dataset.role = state.role;
}

function renderKpis() {
  const firms = state.partners.filter((partner) => partner.type === "firma").length;
  const clubs = state.partners.filter((partner) => partner.type === "verein").length;
  const visible = filteredPartners().length;
  const items = [
    ["Firmenpartner", firms, "freigegebene Konditionen"],
    ["Vereinspartner", clubs, "freigegebene Konditionen"],
    ["Aktuelle Seite", visible, "sichtbare Einträge"],
    ["Ansicht", isAdmin() ? "Intern" : "Tarife", isAdmin() ? "mit Kontakten" : "ohne Kontakte"],
  ];

  els.kpiGrid.innerHTML = items
    .map(
      ([label, value, note]) => `
        <article class="card kpi-card">
          <span>${label}</span>
          <strong>${value}</strong>
          <p>${note}</p>
        </article>
      `
    )
    .join("");
}

function renderTableHeader() {
  const adminColumns = isAdmin() ? "<th>Ansprechpartner</th><th>Letzter Kontakt</th><th>Status</th>" : "";
  return `<tr><th>Partner</th><th>Art</th><th>Konditionen</th>${adminColumns}<th>Aktion</th></tr>`;
}

function renderList() {
  const partners = filteredPartners();
  els.resultCount.textContent = partners.length === 1 ? "1 Eintrag" : `${partners.length} Einträge`;
  els.emptyState.hidden = partners.length > 0;
  ensureExportButton();
  document.querySelector("thead").innerHTML = renderTableHeader();
  els.partnerTableBody.innerHTML = partners.map(renderTableRow).join("");
  els.partnerMobileList.innerHTML = partners.map(renderMobileCard).join("");

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => openDrawer(button.dataset.view));
  });
  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editPartner(button.dataset.edit));
  });
  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deletePartner(button.dataset.delete));
  });
}

function canExportCurrentPage() {
  return isAdmin() && (state.page === "firmenfitness" || state.page === "vereinsfitness");
}

function ensureExportButton() {
  const existing = $("#exportXlsx");
  if (!canExportCurrentPage()) {
    if (existing) existing.remove();
    return;
  }
  if (existing) return;

  const button = document.createElement("button");
  button.className = "btn btn-secondary";
  button.id = "exportXlsx";
  button.type = "button";
  button.textContent = "XLSX exportieren";
  button.addEventListener("click", exportCurrentPartners);
  els.resetFilters.before(button);
}

function renderTableRow(partner) {
  const conditionText = formatPartnerConditions(partner);
  const adminColumns = isAdmin()
    ? `
      <td><div class="partner-name"><strong>${partner.contactName}</strong><span>${partner.contactEmail}</span></div></td>
      <td>${formatDate(partner.lastContact)}</td>
      <td>${statusBadge(partner.status)}</td>
    `
    : "";

  return `
    <tr>
      <td><div class="partner-name"><strong>${partner.name}</strong><span>${isAdmin() ? partner.studio : typeLabel(partner.type)}</span></div></td>
      <td>${typeLabel(partner.type)}</td>
      <td>${conditionText}</td>
      ${adminColumns}
      <td><div class="row-actions"><button class="icon-btn" type="button" data-view="${partner.id}" aria-label="${partner.name} öffnen">↗</button>${adminActions(partner)}</div></td>
    </tr>
  `;
}

function renderMobileCard(partner) {
  const conditionText = formatPartnerConditions(partner);
  const adminMeta = isAdmin()
    ? `<span>${partner.contactName} · ${partner.contactPhone}</span><span>Letzter Kontakt: ${formatDate(partner.lastContact)}</span>`
    : "";

  return `
    <article class="mobile-card">
      <div class="mobile-card-top">
        <div class="partner-name"><strong>${partner.name}</strong><span>${typeLabel(partner.type)}${isAdmin() ? ` · ${partner.studio}` : ""}</span></div>
        ${isAdmin() ? statusBadge(partner.status) : ""}
      </div>
      <div class="mobile-meta"><span>${conditionText}</span>${adminMeta}</div>
      <div class="mobile-actions"><button class="btn btn-secondary" type="button" data-view="${partner.id}">Öffnen</button>${isAdmin() ? `<button class="btn btn-danger" type="button" data-delete="${partner.id}">Löschen</button>` : ""}</div>
    </article>
  `;
}

function adminActions(partner) {
  if (!isAdmin()) return "";
  return `
    <button class="icon-btn" type="button" data-edit="${partner.id}" aria-label="${partner.name} bearbeiten">✎</button>
    <button class="icon-btn btn-danger" type="button" data-delete="${partner.id}" aria-label="${partner.name} löschen">×</button>
  `;
}

function openDrawer(id) {
  const partner = state.partners.find((item) => item.id === id);
  if (!partner) return;
  const conditionText = formatPartnerConditions(partner);

  const adminSections = isAdmin()
    ? `
      <div class="detail-section"><span>Ansprechpartner</span><strong>${partner.contactName}</strong><p>${partner.contactPhone}</p><p>${partner.contactEmail}</p></div>
      <div class="detail-section"><span>Besonderheiten</span><p>${partner.notes || "Keine Besonderheiten hinterlegt."}</p></div>
      <div class="detail-section"><span>Kooperation</span><p>Geschlossen von: ${partner.closedBy}</p><p>Zuständiges Studio: ${partner.studio}</p><p>Letzter Kontakt: ${formatDate(partner.lastContact)}</p></div>
      <button class="btn btn-secondary" type="button" data-edit="${partner.id}">Bearbeiten</button>
    `
    : "";

  els.drawerType.textContent = typeLabel(partner.type);
  els.drawerTitle.textContent = partner.name;
  els.drawerBody.innerHTML = `<div class="detail-section"><span>Konditionen</span><p>${conditionText}</p></div>${adminSections}`;
  els.detailBackdrop.hidden = false;
  els.detailDrawer.classList.add("is-open");
  els.detailDrawer.setAttribute("aria-hidden", "false");
  els.closeDrawer.focus();
  els.drawerBody.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editPartner(button.dataset.edit));
  });
}

function closeDrawer() {
  els.detailDrawer.classList.remove("is-open");
  els.detailDrawer.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    if (!els.detailDrawer.classList.contains("is-open")) els.detailBackdrop.hidden = true;
  }, 220);
}

function editPartner(id) {
  const partner = state.partners.find((item) => item.id === id);
  if (!partner) return;
  state.role = "admin";
  localStorage.setItem("tsf-role", state.role);
  if (state.page === "verwaltung") {
    openPartnerForm(partner);
    return;
  }
  window.location.href = `verwaltung.html?edit=${encodeURIComponent(id)}`;
}

function deletePartner(id) {
  const partner = state.partners.find((item) => item.id === id);
  if (!partner || !confirm(`${partner.name} wirklich löschen?`)) return;
  state.partners = state.partners.filter((item) => item.id !== id);
  savePartners();
  render();
  showToast(`${partner.name} wurde gelöscht.`);
}

function openPartnerForm(partner = null) {
  if (!isAdmin() || state.page !== "verwaltung") return;
  state.formOpen = true;
  els.adminPanel.hidden = false;
  document.body.classList.add("modal-open");
  if (partner) fillForm(partner);
  else resetForm();
  setTimeout(() => $("#partnerName")?.focus(), 0);
}

function closePartnerForm() {
  state.formOpen = false;
  els.adminPanel.hidden = true;
  document.body.classList.remove("modal-open");
  resetForm();
}

function getSelectedTermsFromForm() {
  return Array.from(document.querySelectorAll("[data-term-row]"))
    .map((row) => {
      const checkbox = row.querySelector('input[type="checkbox"][name="termMonths"]');
      const amount = row.querySelector("[data-term-amount]");
      return checkbox && checkbox.checked
        ? {
            months: checkbox.value,
            amount: amount ? amount.value.trim() : "",
          }
        : null;
    })
    .filter(Boolean);
}

function setTermsInForm(partner) {
  document.querySelectorAll("[data-term-row]").forEach((row) => {
    const checkbox = row.querySelector('input[type="checkbox"][name="termMonths"]');
    const amount = row.querySelector("[data-term-amount]");
    if (checkbox) checkbox.checked = false;
    if (amount) amount.value = "";
  });

  const terms = Array.isArray(partner.terms) && partner.terms.length
    ? partner.terms
    : partner.termMonths && partner.termAmount
      ? [{ months: partner.termMonths, amount: partner.termAmount }]
      : [];

  terms.forEach((term) => {
    const row = document.querySelector(`[data-term-row="${term.months}"]`);
    if (!row) return;
    const checkbox = row.querySelector('input[type="checkbox"][name="termMonths"]');
    const amount = row.querySelector("[data-term-amount]");
    if (checkbox) checkbox.checked = true;
    if (amount) amount.value = term.amount || "";
  });
}

function fillForm(partner) {
  $("#partnerId").value = partner.id;
  $("#partnerType").value = partner.type;
  $("#partnerName").value = partner.name;
  $("#contactName").value = partner.contactName;
  $("#contactPhone").value = partner.contactPhone;
  $("#contactEmail").value = partner.contactEmail;
  $("#partnerStudio").value = partner.studio;
  $("#closedBy").value = partner.closedBy;
  $("#lastContact").value = partner.lastContact;
  setTermsInForm(partner);
  if ($("#hasTransponderFee")) $("#hasTransponderFee").checked = Boolean(partner.hasTransponderFee);
  if ($("#hasServiceFee")) $("#hasServiceFee").checked = Boolean(partner.hasServiceFee);
  $("#conditions").value = formatPartnerConditions(partner);
  $("#notes").value = partner.notes;
}

function handleFormSubmit(event) {
  event.preventDefault();
  if (!isAdmin()) {
    showToast("Nur Clubleiter können Partnerdaten speichern.", "error");
    return;
  }
  if (!els.partnerForm.checkValidity()) {
    els.formError.hidden = false;
    els.partnerForm.reportValidity();
    return;
  }

  const id = $("#partnerId").value || `p-${Date.now()}`;
  const terms = getSelectedTermsFromForm();
  if (!terms.length || terms.some((term) => !term.amount)) {
    showToast("Bitte wähle mindestens eine Laufzeit aus und trage den passenden Betrag ein.", "error");
    return;
  }

  const partner = {
    id,
    type: $("#partnerType").value,
    name: $("#partnerName").value.trim(),
    contactName: $("#contactName").value.trim(),
    contactPhone: $("#contactPhone").value.trim(),
    contactEmail: $("#contactEmail").value.trim(),
    studio: $("#partnerStudio").value,
    closedBy: $("#closedBy").value.trim(),
    lastContact: $("#lastContact").value,
    terms,
    termMonths: "",
    termAmount: "",
    hasTransponderFee: $("#hasTransponderFee") ? $("#hasTransponderFee").checked : false,
    hasServiceFee: $("#hasServiceFee") ? $("#hasServiceFee").checked : false,
    conditions: "",
    notes: $("#notes").value.trim(),
    status: "aktiv",
  };
  partner.conditions = formatPartnerConditions(partner);

  const existing = state.partners.findIndex((item) => item.id === id);
  if (existing >= 0) state.partners[existing] = partner;
  else state.partners.unshift(partner);
  savePartners();
  closePartnerForm();
  render();
  showToast(`${partner.name} wurde gespeichert.`);
}

function resetForm() {
  if (!els.partnerForm || !$("#partnerId")) return;
  els.partnerForm.reset();
  $("#partnerId").value = "";
  $("#lastContact").value = new Date().toISOString().slice(0, 10);
  document.querySelectorAll("[data-term-row]").forEach((row) => {
    const checkbox = row.querySelector('input[type="checkbox"][name="termMonths"]');
    const amount = row.querySelector("[data-term-amount]");
    if (checkbox) checkbox.checked = false;
    if (amount) amount.value = "";
  });
  if ($("#hasTransponderFee")) $("#hasTransponderFee").checked = false;
  if ($("#hasServiceFee")) $("#hasServiceFee").checked = false;
  els.formError.hidden = true;
}

function renderAdminVisibility() {
  const adminPage = state.page === "verwaltung";
  els.overviewSections.hidden = state.page !== "uebersicht";
  els.adminPanel.hidden = !adminPage || !state.formOpen;
  els.partnerForm.querySelectorAll("input,select,textarea,button").forEach((field) => {
    field.disabled = !isAdmin();
  });
}

function syncInputs() {
  els.partnerSearch.value = state.query;
  els.globalSearch.value = state.query;
  els.studioFilter.value = state.studio;
}

function exportCurrentPartners() {
  if (!canExportCurrentPage()) return;

  const headers = [
    "Partner",
    "Art",
    "Konditionen",
    "Ansprechpartner",
    "Telefon",
    "E-Mail",
    "Studio",
    "Letzter Kontakt",
    "Besonderheiten",
    "Kooperation geschlossen von",
    "Status",
  ];
  const rows = filteredPartners().map((partner) => [
    partner.name,
    typeLabel(partner.type),
    formatPartnerConditions(partner),
    partner.contactName,
    partner.contactPhone,
    partner.contactEmail,
    partner.studio,
    formatDate(partner.lastContact),
    partner.notes || "",
    partner.closedBy,
    partner.status,
  ]);
  const blob = createXlsxBlob(headers, rows);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const prefix = state.page === "firmenfitness" ? "firmenfitness" : "vereinsfitness";

  link.href = url;
  link.download = `${prefix}-partner-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Der XLSX-Export wurde erstellt.");
}

function createXlsxBlob(headers, rows) {
  return createZipBlob([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Partner" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: createWorksheetXml(headers, rows),
    },
  ]);
}

function createWorksheetXml(headers, rows) {
  const allRows = [headers, ...rows];
  const sheetData = allRows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = row
        .map((cell, columnIndex) => {
          const ref = `${columnName(columnIndex + 1)}${rowNumber}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetData}</sheetData></worksheet>`;
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index) {
  let name = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
}

const zipEncoder = new TextEncoder();
let crcTable;

function crc32(bytes) {
  if (!crcTable) {
    crcTable = Array.from({ length: 256 }, (_, index) => {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      return value >>> 0;
    });
  }

  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function little16(value) {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function little32(value) {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function createZipBlob(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const name = zipEncoder.encode(file.name);
    const data = zipEncoder.encode(file.content);
    const crc = crc32(data);
    const local = new Uint8Array([
      ...little32(0x04034b50),
      ...little16(20),
      ...little16(0),
      ...little16(0),
      ...little16(0),
      ...little16(0),
      ...little32(crc),
      ...little32(data.length),
      ...little32(data.length),
      ...little16(name.length),
      ...little16(0),
      ...name,
      ...data,
    ]);
    const central = new Uint8Array([
      ...little32(0x02014b50),
      ...little16(20),
      ...little16(20),
      ...little16(0),
      ...little16(0),
      ...little16(0),
      ...little16(0),
      ...little32(crc),
      ...little32(data.length),
      ...little32(data.length),
      ...little16(name.length),
      ...little16(0),
      ...little16(0),
      ...little16(0),
      ...little16(0),
      ...little32(0),
      ...little32(offset),
      ...name,
    ]);

    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array([
    ...little32(0x06054b50),
    ...little16(0),
    ...little16(0),
    ...little16(files.length),
    ...little16(files.length),
    ...little32(centralSize),
    ...little32(offset),
    ...little16(0),
  ]);

  return new Blob([...localParts, ...centralParts, end], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function showToast(message, type = "success") {
  els.toast.textContent = message;
  els.toast.style.borderLeftColor = type === "error" ? "var(--error)" : "var(--success)";
  els.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => (els.toast.hidden = true), 3600);
}

function render() {
  renderHeader();
  renderNavigation();
  renderKpis();
  renderAdminVisibility();
  renderList();
  syncInputs();
}

function bindEvents() {
  els.roleToggle.addEventListener("click", () => {
    state.role = isAdmin() ? "employee" : "admin";
    localStorage.setItem("tsf-role", state.role);
    render();
  });
  els.pagePrimaryAction.addEventListener("click", () => openPartnerForm());
  [els.partnerSearch, els.globalSearch].forEach((input) => {
    input.addEventListener("input", (event) => {
      state.query = event.target.value;
      syncInputs();
      renderList();
    });
  });
  els.studioFilter.addEventListener("change", (event) => {
    state.studio = event.target.value;
    renderList();
  });
  els.resetFilters.addEventListener("click", () => {
    state.query = "";
    state.studio = "alle";
    render();
  });
  els.emptyReset.addEventListener("click", () => {
    state.query = "";
    state.studio = "alle";
    render();
  });
  els.partnerForm.addEventListener("submit", handleFormSubmit);
  els.cancelEdit.addEventListener("click", closePartnerForm);
  els.closeDrawer.addEventListener("click", closeDrawer);
  els.detailBackdrop.addEventListener("click", closeDrawer);
  els.adminPanel.addEventListener("click", (event) => {
    if (event.target === els.adminPanel) closePartnerForm();
  });
  document.querySelectorAll("[data-quick]").forEach((button) => {
    button.addEventListener("click", () => {
      window.location.href = button.dataset.quick === "firma" ? "firmenfitness.html" : button.dataset.quick === "verein" ? "vereinsfitness.html" : "verwaltung.html";
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      if (state.formOpen) closePartnerForm();
    }
  });
}

bindEvents();
resetForm();
const editId = new URLSearchParams(window.location.search).get("edit");
if (editId && state.page === "verwaltung") {
  const partner = state.partners.find((item) => item.id === editId);
  if (partner) state.formOpen = true;
}
render();
if (editId && state.page === "verwaltung") {
  const partner = state.partners.find((item) => item.id === editId);
  if (partner) openPartnerForm(partner);
}
