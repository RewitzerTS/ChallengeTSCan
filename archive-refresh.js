(() => {
  const archivePartner = deletePartner;
  deletePartner = async function (id) {
    const before = state.partners.length;
    await archivePartner(id);
    if (state.partners.length < before) setTimeout(() => window.location.reload(), 450);
  };
})();