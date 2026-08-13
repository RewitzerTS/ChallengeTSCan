(() => {
  let remoteSnapshot = new Map();
  let syncQueue = Promise.resolve();
  let adapterReady = false;

  const clonePartner = (partner) => JSON.parse(JSON.stringify(partner));
  const samePartner = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const archiveMarker = "[[TSF_ARCHIVE:";

  function publicSelect() {
    return "id,type,name,studio,terms,has_transponder_fee,has_service_fee,conditions,status,created_by,created_at,updated_at";
  }

  function isArchivedRow(row) {
    return row.status === "offen" && !row.created_by && String(row.conditions || "").startsWith(archiveMarker);
  }

  function rowToPartner(row, details = null) {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      contactName: details?.contact_name || "",
      contactPhone: details?.contact_phone || "",
      contactEmail: details?.contact_email || "",
      studio: row.studio || "",
      closedBy: details?.closed_by || "",
      lastContact: details?.last_contact || "",
      contractUrl: details?.contract_url || "",
      terms: Array.isArray(row.terms) ? row.terms : [],
      termMonths: "",
      termAmount: "",
      hasTransponderFee: Boolean(row.has_transponder_fee),
      hasServiceFee: Boolean(row.has_service_fee),
      conditions: row.conditions || "",
      notes: details?.notes || "",
      status: row.status === "kritisch" ? "aktiv" : (row.status || "aktiv"),
      createdBy: row.created_by || null,
    };
  }

  function publicPayload(partner) {
    return {
      id: partner.id,
      type: partner.type,
      name: partner.name,
      studio: partner.studio || "",
      terms: Array.isArray(partner.terms) ? partner.terms : [],
      has_transponder_fee: Boolean(partner.hasTransponderFee),
      has_service_fee: Boolean(partner.hasServiceFee),
      conditions: partner.conditions || formatPartnerConditions(partner) || "",
      status: partner.status === "kritisch" ? "aktiv" : (partner.status || "aktiv"),
    };
  }

  function detailsPayload(partner) {
    return {
      partner_id: partner.id,
      contact_name: partner.contactName || "",
      contact_phone: partner.contactPhone || "",
      contact_email: partner.contactEmail || "",
      closed_by: partner.closedBy || "",
      last_contact: partner.lastContact || null,
      contract_url: partner.contractUrl || "",
      notes: partner.notes || "",
    };
  }

  function clearPersistentPartnerCache() {
    try { localStorage.setItem(STORAGE_KEY, "[]"); } catch {}
  }

  async function loadScript(src) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`${src} konnte nicht geladen werden.`));
      document.head.append(script);
    });
  }

  async function loadWorkflow() {
    for (const src of ["status-rules.js", "status-actions.js", "status-ui.js", "proposal-ui.js", "proposal-submit.js", "admin-tools.js"]) {
      await loadScript(src);
    }
  }

  async function fetchRemotePartners() {
    const supabase = await window.tsfAuth.getClient();
    const { data: rows, error } = await supabase.from("partners").select(publicSelect()).order("name", { ascending: true });
    if (error) throw error;

    const visibleRows = (rows || []).filter((row) => !isArchivedRow(row));
    let detailsByPartner = new Map();
    if (canManagePartners() && visibleRows.length) {
      const { data: details, error: detailsError } = await supabase
        .from("partner_details")
        .select("partner_id,contact_name,contact_phone,contact_email,closed_by,last_contact,contract_url,notes");
      if (detailsError) throw detailsError;
      detailsByPartner = new Map((details || []).map((detail) => [detail.partner_id, detail]));
    }

    const partners = visibleRows.map((row) => rowToPartner(row, detailsByPartner.get(row.id)));
    state.partners = partners;
    remoteSnapshot = new Map(partners.map((partner) => [partner.id, clonePartner(partner)]));
    adapterReady = true;
    clearPersistentPartnerCache();
    render();
  }

  async function syncManagerChanges(supabase, desired) {
    const changed = [...desired.values()].filter((partner) => {
      const previous = remoteSnapshot.get(partner.id);
      return !previous || !samePartner(previous, partner);
    });
    const deletedIds = [...remoteSnapshot.keys()].filter((id) => !desired.has(id));

    if (changed.length) {
      const { error: partnerError } = await supabase.from("partners").upsert(changed.map(publicPayload), { onConflict: "id" });
      if (partnerError) throw partnerError;
      const { error: detailsError } = await supabase.from("partner_details").upsert(changed.map(detailsPayload), { onConflict: "partner_id" });
      if (detailsError) throw detailsError;
    }
    if (deletedIds.length) {
      throw new Error("Partner werden nicht mehr endgültig gelöscht. Bitte nutze die Archivieren-Funktion.");
    }
  }

  async function syncEmployeeProposals(supabase, desired) {
    const proposals = [...desired.values()].filter((partner) => !remoteSnapshot.has(partner.id) && partner.status === "offen");
    if (!proposals.length) return;
    const { error: partnerError } = await supabase.from("partners").insert(proposals.map(publicPayload));
    if (partnerError) throw partnerError;
    const { error: detailsError } = await supabase.from("partner_details").insert(proposals.map(detailsPayload));
    if (detailsError) throw detailsError;
  }

  async function syncRemotePartners() {
    if (!adapterReady) return;
    const supabase = await window.tsfAuth.getClient();
    const desired = new Map(state.partners.map((partner) => [partner.id, clonePartner(partner)]));
    if (canManagePartners()) await syncManagerChanges(supabase, desired);
    else await syncEmployeeProposals(supabase, desired);
    remoteSnapshot = desired;
    clearPersistentPartnerCache();
  }

  function queueSync() {
    clearPersistentPartnerCache();
    syncQueue = syncQueue.then(syncRemotePartners).catch(async (error) => {
      console.error("Supabase sync failed", error);
      showToast(`Speichern fehlgeschlagen: ${error.message || "Backend nicht erreichbar"}`, "error");
      try { await fetchRemotePartners(); } catch (reloadError) { console.error("Supabase reload failed", reloadError); }
    });
  }

  async function initializeAdapter() {
    try {
      const session = await window.tsfAuth.ready;
      if (!session) return;
      await loadWorkflow();
      await fetchRemotePartners();
      savePartners = queueSync;
    } catch (error) {
      console.error("Supabase adapter initialization failed", error);
      showToast("Zentrale Partnerdaten konnten nicht geladen werden.", "error");
    }
  }

  initializeAdapter();
})();