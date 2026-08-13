(() => {
  function actionLabel(partner) {
    const { baseStatus } = window.tsfStatusWorkflow;
    if (effectivePartnerStatus(partner) === "kritisch") return "Kontakt dokumentieren";
    if (baseStatus(partner) === "offen") return "Prüfung starten";
    if (baseStatus(partner) === "pruefung") return "Als kontaktiert markieren";
    if (baseStatus(partner) === "ausstehend") return "Als aktiv markieren";
    return "";
  }

  adminActions = function (partner) {
    if (!canManagePartners()) return "";
    const label = actionLabel(partner);
    return `${label ? `<button class="icon-btn" type="button" data-approve="${partner.id}" title="${label}" aria-label="${partner.name}: ${label}">✓</button>` : ""}<button class="icon-btn" type="button" data-edit="${partner.id}" aria-label="${partner.name} bearbeiten">✎</button><button class="icon-btn btn-danger" type="button" data-delete="${partner.id}" aria-label="${partner.name} archivieren">×</button>`;
  };

  approvePartner = function (id) {
    if (!canManagePartners()) return;
    const partner = state.partners.find((item) => item.id === id);
    if (!partner) return;
    const { baseStatus } = window.tsfStatusWorkflow;
    const status = baseStatus(partner);

    if (effectivePartnerStatus(partner) === "kritisch") {
      openDrawer(id);
      setTimeout(() => document.querySelector('[data-contact-log]')?.click(), 0);
      return;
    }

    if (status === "offen") {
      partner.status = "pruefung";
      savePartners();
      render();
      showToast(`${partner.name} wird jetzt geprüft.`);
      return;
    }

    if (status === "pruefung") {
      partner.status = "ausstehend";
      savePartners();
      render();
      showToast(`${partner.name} wurde als kontaktiert markiert.`);
      return;
    }

    if (status === "ausstehend") {
      partner.status = "aktiv";
      savePartners();
      render();
      showToast(`${partner.name} ist jetzt aktiv.`);
    }
  };

  window.tsfStatusActionLabel = actionLabel;
})();