(() => {
  let remoteSnapshot = new Map();
  let syncQueue = Promise.resolve();
  let adapterReady = false;

  function clonePartner(partner) {
    return JSON.parse(JSON.stringify(partner));
  }

  function publicSelect() {
    return "id,type,name,studio,terms,has_transponder_fee,has_service_fee,conditions,status,created_at,updated_at";
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
      status: row.status || "aktiv",
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
      status: partner.status || "aktiv",
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

  function saveLocalCache() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.partners));
    } catch {
      // The remote database remains the source of truth even if local cache storage fails.
    }
  }

  async function fetchRemotePartners() {
    const supabase = await window.tsfAuth.getClient();
    const { data: rows, error } = await supabase
      .from("partners")
      .select(publicSelect())
      .order("name", { ascending: true });

    if (error) throw error;

    let detailsByPartner = new Map();
    if (canManagePartners() && rows?.length) {
      const { data: details, error: detailsError } = await supabase
        .from("partner_details")
        .select("partner_id,contact_name,contact_phone,contact_email,closed_by,last_contact,contract_url,notes");
      if (detailsError) throw detailsError;
      detailsByPartner = new Map((details || []).map((detail) => [detail.partner_id, detail]));
    }

    const partners = (rows || []).map((row) => rowToPartner(row, detailsByPartner.get(row.id)));
    state.partners = partners;
    remoteSnapshot = new Map(partners.map((partner) => [partner.id, clonePartner(partner)]));
    saveLocalCache();
    render();
    adapterReady = true;
  }

  async function syncRemotePartners() {
    if (!adapterReady || !canManagePartners()) return;

    const supabase = await window.tsfAuth.getClient();
    const desired = new Map(state.partners.map((partner) => [partner.id, clonePartner(partner)]));
    const deletedIds = [...remoteSnapshot.keys()].filter((id) => !desired.has(id));
    const partners = [...desired.values()];

    if (partners.length) {
      const { error: partnerError } = await supabase
        .from("partners")
        .upsert(partners.map(publicPayload), { onConflict: "id" });
      if (partnerError) throw partnerError;

      const { error: detailsError } = await supabase
        .from("partner_details")
        .upsert(partners.map(detailsPayload), { onConflict: "partner_id" });
      if (detailsError) throw detailsError;
    }

    if (deletedIds.length) {
      const { error: deleteError } = await supabase.from("partners").delete().in("id", deletedIds);
      if (deleteError) throw deleteError;
    }

    remoteSnapshot = desired;
    saveLocalCache();
  }

  function queueSync() {
    saveLocalCache();
    syncQueue = syncQueue
      .then(syncRemotePartners)
      .catch(async (error) => {
        console.error("Supabase sync failed", error);
        showToast(`Speichern fehlgeschlagen: ${error.message || "Backend nicht erreichbar"}`, "error");
        try {
          await fetchRemotePartners();
        } catch (reloadError) {
          console.error("Supabase reload failed", reloadError);
        }
      });
  }

  async function initializeAdapter() {
    try {
      const session = await window.tsfAuth.ready;
      if (!session) return;
      await fetchRemotePartners();

      // Existing app actions call savePartners(). Replace only the persistence layer;
      // UI behavior, filters, XLSX export and dialogs stay unchanged.
      savePartners = queueSync;
    } catch (error) {
      console.error("Supabase adapter initialization failed", error);
      showToast("Zentrale Partnerdaten konnten nicht geladen werden.", "error");
    }
  }

  initializeAdapter();
})();
