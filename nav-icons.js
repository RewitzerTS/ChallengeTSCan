(() => {
  const icons = {
    "index.html": `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>`,
    "firmenfitness.html": `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"></path><path d="M16 9h2a2 2 0 0 1 2 2v10"></path><path d="M8 7h4M8 11h4M8 15h4M9 21v-3h2v3"></path></svg>`,
    "vereinsfitness.html": `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><circle cx="17" cy="9" r="2.5"></circle><path d="M3.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6"></path><path d="M14 15.5c.8-.7 1.8-1 3-1 2.3 0 3.8 1.5 4.2 4.5"></path></svg>`,
    "verwaltung.html": `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5"></path><circle cx="16" cy="6" r="2"></circle><circle cx="8" cy="12" r="2"></circle><circle cx="13" cy="18" r="2"></circle></svg>`,
    "benutzer.html": `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="8" r="3"></circle><path d="M4 20c.5-4 2.5-6 6-6 2.2 0 3.9.8 5 2.4"></path><circle cx="18" cy="17" r="2.5"></circle><path d="M18 12.8v1.1M18 20.1v1.1M13.8 17h1.1M21.1 17h1.1M15 14l.8.8M20.2 19.2l.8.8M21 14l-.8.8M15.8 19.2l-.8.8"></path></svg>`,
    "archiv.html": `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v14H4z"></path><path d="M3 3h18v4H3zM9 11h6"></path></svg>`,
  };

  function pageFromHref(href) {
    try {
      const url = new URL(href, window.location.href);
      return url.pathname.split("/").pop() || "index.html";
    } catch {
      return "";
    }
  }

  function upgradeLink(link) {
    if (!(link instanceof HTMLAnchorElement) || link.dataset.iconReady === "1") return;
    const icon = icons[pageFromHref(link.getAttribute("href") || "")];
    if (!icon) return;

    const directSpans = [...link.children].filter((child) => child.tagName === "SPAN");
    if (directSpans.length > 1 && directSpans[0].textContent.trim().length <= 2) {
      directSpans[0].remove();
    }

    [...link.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.remove();
    });

    link.insertAdjacentHTML("afterbegin", icon);
    link.dataset.iconReady = "1";
  }

  function ensureBottomNav() {
    if (document.querySelector(".bottom-nav")) return;
    const source = document.querySelector(".sidebar .nav-list");
    if (!source) return;

    const links = [...source.querySelectorAll("a.nav-item")];
    if (!links.length) return;

    const nav = document.createElement("nav");
    nav.className = "bottom-nav";
    nav.setAttribute("aria-label", "Mobile Navigation");
    nav.style.setProperty("--nav-item-count", String(links.length));
    links.forEach((link) => nav.append(link.cloneNode(true)));
    document.body.append(nav);
  }

  function upgradeNavigation() {
    ensureBottomNav();
    document.querySelectorAll(".nav-item").forEach(upgradeLink);
  }

  if (!document.querySelector("#nav-icon-styles")) {
    const style = document.createElement("style");
    style.id = "nav-icon-styles";
    style.textContent = `
      .nav-icon {
        width: 21px;
        height: 21px;
        flex: 0 0 21px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        overflow: visible;
      }
      @media (max-width: 1023px) {
        .bottom-nav .nav-item {
          min-height: 76px;
          gap: 6px;
          padding: 8px 3px 7px;
          line-height: 1.1;
        }
        .bottom-nav .nav-icon {
          width: 27px;
          height: 27px;
          flex-basis: 27px;
          stroke-width: 2.1;
        }
        .bottom-nav .nav-item > span:last-child {
          display: block;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 700;
        }
      }
      @media (max-width: 390px) {
        .bottom-nav .nav-item > span:last-child { font-size: 10px; }
        .bottom-nav .nav-icon { width: 26px; height: 26px; flex-basis: 26px; }
      }
    `;
    document.head.append(style);
  }

  upgradeNavigation();
  const observer = new MutationObserver(upgradeNavigation);
  observer.observe(document.body, { childList: true, subtree: true });
})();