(async () => {
  const session = await window.tsfAuth.ready;
  if (!session) return;
  if (session.role !== "admin") {
    window.location.replace("index.html");
    return;
  }

  const load = (src) => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`${src} konnte nicht geladen werden.`));
    document.head.append(script);
  });

  await load("archive-ui.js");
  await load("archive-store.js");
  window.tsfArchive.renderShell(session);
  await window.tsfArchive.initialize();
})().catch((error) => console.error("Archiv konnte nicht geladen werden", error));