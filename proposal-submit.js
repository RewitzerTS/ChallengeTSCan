(() => {
  const legacySubmit = handleFormSubmit;

  handleFormSubmit = function (event) {
    event.preventDefault();
    const isNew = !$("#partnerId").value;
    const existingPartner = state.partners.find((item) => item.id === $("#partnerId").value);
    const manager = canManagePartners();

    if (!manager && !isNew) {
      showToast("Thekenmitarbeiter können nur neue Partner vorschlagen.", "error");
      return;
    }

    window.tsfConfigureProposalForm?.();
    if (!els.partnerForm.checkValidity()) {
      els.formError.hidden = false;
      els.partnerForm.reportValidity();
      return;
    }

    const id = $("#partnerId").value || `p-${Date.now()}`;
    let contractUrl = "";
    let terms = [];

    if (manager) {
      const rawUrl = $("#contractUrl").value.trim();
      contractUrl = cooperationContractUrl(rawUrl);
      if (rawUrl && !contractUrl) {
        showToast("Bitte gib einen gültigen HTTP- oder HTTPS-Link zum Kooperationsvertrag ein.", "error");
        $("#contractUrl").focus();
        return;
      }
      terms = getSelectedTermsFromForm();
      if (!terms.length || terms.some((term) => !term.amount)) {
        showToast("Bitte wähle mindestens eine Laufzeit aus und trage den passenden Betrag ein.", "error");
        return;
      }
    }

    const partner = {
      id,
      type: $("#partnerType").value,
      name: $("#partnerName").value.trim(),
      contactName: $("#contactName").value.trim(),
      contactPhone: $("#contactPhone").value.trim(),
      contactEmail: $("#contactEmail").value.trim(),
      studio: $("#partnerStudio").value,
      closedBy: manager ? $("#closedBy").value.trim() : "",
      lastContact: manager ? $("#lastContact").value : "",
      contractUrl,
      terms,
      termMonths: "",
      termAmount: "",
      hasTransponderFee: manager && Boolean($("#hasTransponderFee")?.checked),
      hasServiceFee: manager && Boolean($("#hasServiceFee")?.checked),
      conditions: "",
      notes: $("#notes").value.trim(),
      status: isNew ? (manager ? "aktiv" : "offen") : window.tsfStatusWorkflow.baseStatus(existingPartner),
    };
    partner.conditions = manager ? formatPartnerConditions(partner) : "";

    const existingIndex = state.partners.findIndex((item) => item.id === id);
    if (existingIndex >= 0) state.partners[existingIndex] = partner;
    else state.partners.unshift(partner);
    savePartners();
    closePartnerForm();
    render();
    showToast(manager ? `${partner.name} wurde gespeichert.` : `${partner.name} wurde als offener Vorschlag eingereicht.`);
  };

  if (els.partnerForm) {
    els.partnerForm.removeEventListener("submit", legacySubmit);
    els.partnerForm.addEventListener("submit", handleFormSubmit);
  }
})();