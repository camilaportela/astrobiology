/* Menu lateral de navegação - Astrobiologia */
(function () {
  "use strict";

  function getSideNavElements() {
    var nav = document.querySelector(".astro-side-nav");

    if (!nav) {
      return null;
    }

    return {
      nav: nav,
      trigger:
        nav.querySelector("[data-astro-menu-trigger]") ||
        nav.querySelector(".astro-side-nav__trigger"),
      panel:
        nav.querySelector("#astro-side-nav-panel") ||
        nav.querySelector(".astro-side-nav__panel"),
      closeBtn:
        nav.querySelector("[data-astro-menu-close]") ||
        nav.querySelector(".astro-side-nav__close"),
      overlay:
        nav.querySelector("[data-astro-menu-overlay]") ||
        nav.querySelector(".astro-side-nav__overlay"),
      links: nav.querySelectorAll(".astro-side-nav__link")
    };
  }

  function setMenuState(elements, shouldOpen) {
    if (!elements || !elements.nav || !elements.panel || !elements.trigger) {
      return;
    }

    elements.nav.classList.toggle("is-open", shouldOpen);
    elements.panel.classList.toggle("astro-side-nav--open", shouldOpen);
    elements.panel.setAttribute("aria-hidden", shouldOpen ? "false" : "true");

    if (elements.overlay) {
      elements.overlay.classList.toggle("astro-side-nav--open", shouldOpen);
    }

    elements.trigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    elements.trigger.setAttribute("aria-label", shouldOpen ? "Fechar menu" : "Abrir menu");
  }

  function initSideNav() {
    var elements = getSideNavElements();

    if (!elements || !elements.trigger || !elements.panel) {
      console.warn("[SideNav] elementos essenciais não encontrados.", elements);
      return;
    }

    console.log("[SideNav] inicializado", {
      trigger: !!elements.trigger,
      panel: !!elements.panel,
      overlay: !!elements.overlay,
      links: elements.links.length
    });

    document.addEventListener("click", function (event) {
      // Only treat clicks on the three-line icon (or an explicit data attribute) as trigger
      var triggerIcon = event.target.closest(".astro-side-nav__trigger-icon, [data-astro-menu-trigger]");
      var closeBtn = event.target.closest("[data-astro-menu-close], .astro-side-nav__close");
      var overlay = event.target.closest("[data-astro-menu-overlay], .astro-side-nav__overlay");
      var link = event.target.closest(".astro-side-nav__link");

      if (triggerIcon && elements.nav.contains(triggerIcon)) {
        // prevent clicks from bubbling when activating the menu
        event.preventDefault();
        event.stopPropagation();

        var isOpen = elements.nav.classList.contains("is-open");
        setMenuState(elements, !isOpen);
        return;
      }

      if (
        (closeBtn && elements.nav.contains(closeBtn)) ||
        (overlay && elements.nav.contains(overlay)) ||
        (link && elements.nav.contains(link))
      ) {
        setMenuState(elements, false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setMenuState(elements, false);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSideNav, { once: true });
  } else {
    initSideNav();
  }
})();
