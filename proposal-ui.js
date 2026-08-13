(() => {
  function setFieldVisible(selector, visible, required = false) {
    const field = $(selector);
    if (!field) return;
    const container = field.closest("label") || field.closest("fieldset");
    if (container) container.hidden = !visible;
    field.required = visible && required;
    field.disabled = !visible;
  }

  function configureForm() {
    if (!els.partnerForm) return;
    const manager = canManagePartners();
    setFieldVisible("#closedBy", manager, true);
    setFieldVisible("#lastContact", manager, true);
    setFieldVisible("#contractUrl", manager, false);
    const conditions = document.querySelector(".condition-editor");
    if (conditions) conditions.hidden = !manager;
    conditions?.querySelectorAll("input").forEach((field) => field.disabled = !manager);
    const typeField = $("#partnerType");
    if (typeField) typeField.disabled = ["firmenfitness", "vereinsfitness"].includes(state.page);
  }

  resetForm = function () {
    if (!els.partnerForm || !$("#partnerId")) return;
    els.partnerForm.reset();
    $("#partnerId").value = "";
    $("#lastContact").value = canManagePartners() ? window.tsfStatusWorkflow.todayIso() : "";
    document.querySelectorAll("[data-term-row]").forEach((row) => {
      const checkbox = row.querySelector('input[type="checkbox"][name="termMonths"]');
      const amount = row.querySelector("[data-term-amount]");
      if (checkbox) checkbox.checked = false;
      if (amount) amount.value = "";
    });
    if ($("#hasTransponderFee")) $("#hasTransponderFee").checked = false;
    if ($("#hasServiceFee")) $("#hasServiceFee").checked = false;
    els.formError.hidden = true;
    configureForm();
  };

  updatePartnerFormCopy = function (partner) {
    const title = $("#partnerFormTitle");
    const description = $("#partnerFormDescription");
    const submitButton = els.partnerForm?.querySelector('.form-actions .btn-primary');
    if (!title || !description || !submitButton) return;
    if (partner) {
      title.textContent = "Partner bearbeiten";
      description.textContent = "Bestehende Kooperation aktualisieren. Der Status bleibt erhalten.";
      submitButton.textContent = "Speichern";
      return;
    }
    const label = pageTypeFilter() === "firma" ? "Firmenpartner" : pageTypeFilter() === "verein" ? "Vereinspartner" : "Partner";
    title.textContent = canManagePartners() ? `${label} anlegen` : `${label} vorschlagen`;
    description.textContent = canManagePartners()
      ? "Neue abgeschlossene Kooperation erfassen und direkt aktiv schalten."
      : "Potentiellen Partner einreichen. Die Clubleitung erhält den Vorschlag mit Status Offen.";
    submitButton.textContent = canManagePartners() ? "Speichern" : "Vorschlag einreichen";
  };

  openPartnerForm = function (partner = null) {
    if (partner && !canManagePartners()) return;
    if (!partner && state.page === "uebersicht") return;
    if (!canManagePartners() && !["firmenfitness", "vereinsfitness"].includes(state.page)) return;
    state.formOpen = true;
    els.adminPanel.hidden = false;
    document.body.classList.add("modal-open");
    if (partner) fillForm(partner); else resetForm();
    updatePartnerFormCopy(partner);
    if (!partner && ["firmenfitness", "vereinsfitness"].includes(state.page)) $("#partnerType").value = pageTypeFilter();
    configureForm();
    setTimeout(() => $("#partnerName")?.focus(), 0);
  };

  renderAdminVisibility = function () {
    if (els.overviewSections) els.overviewSections.hidden = true;
    if (!els.adminPanel || !els.partnerForm) return;
    els.adminPanel.hidden = !state.formOpen;
    els.partnerForm.querySelectorAll("input,select,textarea,button").forEach((field) => field.disabled = false);
    configureForm();
  };

  window.tsfConfigureProposalForm = configureForm;
})();