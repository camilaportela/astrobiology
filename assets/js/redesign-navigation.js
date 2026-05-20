/* Menu lateral de navegação - Astrobiologia */
(function () {
  "use strict";

  function initSideNav() {
    var nav = document.querySelector(".astro-side-nav");
    if (!nav) return;

    var trigger =
      nav.querySelector("[data-astro-menu-trigger]") ||
      nav.querySelector(".astro-side-nav__trigger");

    var panel =
      nav.querySelector("#astro-side-nav-panel") ||
      nav.querySelector(".astro-side-nav__panel");

    var closeBtn =
      nav.querySelector("[data-astro-menu-close]") ||
      nav.querySelector(".astro-side-nav__close");

    var overlay =
      nav.querySelector("[data-astro-menu-overlay]") ||
      nav.querySelector(".astro-side-nav__overlay");

    var links = nav.querySelectorAll(".astro-side-nav__link");

    if (!trigger || !panel) {
      console.warn("[SideNav] trigger ou panel não encontrado.", {
        trigger: !!trigger,
        panel: !!panel
      });
      return;
    }

    function openMenu() {
      nav.classList.add("is-open");
      panel.classList.add("astro-side-nav--open");
      panel.setAttribute("aria-hidden", "false");

      if (overlay) {
        overlay.classList.add("astro-side-nav--open");
      }

      trigger.setAttribute("aria-expanded", "true");
      trigger.setAttribute("aria-label", "Fechar menu");
    }

    function closeMenu() {
      nav.classList.remove("is-open");
      panel.classList.remove("astro-side-nav--open");
      panel.setAttribute("aria-hidden", "true");

      if (overlay) {
        overlay.classList.remove("astro-side-nav--open");
      }

      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-label", "Abrir menu");
    }

    function toggleMenu(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (nav.classList.contains("is-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    trigger.addEventListener("click", toggleMenu);

    if (closeBtn) {
      closeBtn.addEventListener("click", function (event) {
        event.preventDefault();
        closeMenu();
      });
    }

    if (overlay) {
      overlay.addEventListener("click", function (event) {
        event.preventDefault();
        closeMenu();
      });
    }

    links.forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    console.log("[SideNav] menu inicializado", {
      trigger: true,
      panel: true,
      overlay: !!overlay,
      links: links.length
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSideNav, { once: true });
  } else {
    initSideNav();
  }
})();
