(() => {
  function todayIso() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function baseStatus(partner) {
    return partner?.status === "kritisch" ? "aktiv" : (partner?.status || "aktiv");
  }

  effectivePartnerStatus = function (partner) {
    const status = baseStatus(partner);
    if (status === "offen" || !partner?.lastContact) return status;
    const contactDate = new Date(`${partner.lastContact}T12:00:00`);
    if (Number.isNaN(contactDate.getTime())) return status;
    const cutoff = new Date();
    cutoff.setHours(12, 0, 0, 0);
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    return contactDate <= cutoff ? "kritisch" : status;
  };

  statusBadge = function (status) {
    const map = {
      aktiv: ["badge-active", "Aktiv"],
      offen: ["badge-open", "Offen"],
      ausstehend: ["badge-open", "Ausstehend"],
      kritisch: ["badge-critical", "Kritisch"],
    };
    const [className, label] = map[status] || ["badge-neutral", "Neutral"];
    return `<span class="badge ${className}">${label}</span>`;
  };

  formatDate = function (value) {
    if (!value) return "Noch kein Kontakt";
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "Noch kein Kontakt";
    return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  };

  window.tsfStatusWorkflow = { effectivePartnerStatus, todayIso, baseStatus };
})();