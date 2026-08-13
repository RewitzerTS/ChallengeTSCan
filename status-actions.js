(() => {
  function actionLabel(partner) {
    const { baseStatus } = window.tsfStatusWorkflow;
    if (effectivePartnerStatus(partner) === "kritisch") return "Kontakt heute aktualisieren";
    if (baseStatus(partner) === "offen") return "Als kontaktiert markieren";
    if (baseStatus(partner) === "ausstehend") return "Als aktiv markieren";
    return "";
  }

  adminActions = function (partner) {
    if (!canManagePartners()) return "";
    const label = actionLabel(partner);
    return `${label ? `<button class="icon-btn" type="button" data-approve="${partner.id}" title="${label}" aria-label="${partner.name}: ${label}">✓</button>` : ""}<button class="icon-btn" type="button" data-edit="${partner.id}" aria-label="${partner.name} bearbeiten">✎</button><button class="icon-btn btn-danger" type="button" data-delete="${partner.id}" aria-label="${partner.name} löschen">×</button>`;
  };

  approvePartner = function (id) {
    if (!canManagePartners()) return;
    const partner = state.partners.find((item) => item.id === id);
    if (!partner) return;
    const { todayIso, baseStatus } = window.tsfStatusWorkflow;
    const status = baseStatus(partner);

    if (effectivePartnerStatus(partner) === "kritisch") {
      partner.lastContact = todayIso();
      partner.status = status;
      savePartners();
      render();
      showToast(`Kontakt zu ${partner.name} wurde auf heute aktualisiert.`);
      return;
    }

    if (status === "offen") {
      partner.status = "ausstehend";
      partner.lastContact = todayIso();
      savePartners();
      render();
      showToast(`${partner.name} wurde kontaktiert und ist jetzt ausstehend.`);
      return;
    }

    if (status === "ausstehend") {
      partner.status = "aktiv";
      if (!partner.lastContact) partner.lastContact = todayIso();
      savePartners();
      render();
      showToast(`${partner.name} ist jetzt aktiv.`);
    }
  };

  window.tsfStatusActionLabel = actionLabel;
})();