// Menu lateral de navegação - Astrobiologia
(function () {
  "use strict";

  function initSideNav() {
    var trigger = document.querySelector(".astro-side-nav__trigger");
    var panel = document.querySelector(".astro-side-nav__panel");
    var closeBtn = document.querySelector(".astro-side-nav__close");
    var links = document.querySelectorAll(".astro-side-nav__link");

    if (!trigger || !panel) {
      console.warn("[SideNav] Elementos não encontrados. Menu lateral não iniciado.");
      return;
    }

    // Estado do menu
    var isOpen = false;

    /**
     * Abre o menu lateral
     */
    function openMenu() {
      if (isOpen) return;

      isOpen = true;
      panel.classList.add("astro-side-nav--open");
      trigger.setAttribute("aria-expanded", "true");

      // Previne scroll da página quando menu está aberto
      document.body.style.overflow = "hidden";

      console.log("[SideNav] Menu aberto");
    }

    /**
     * Fecha o menu lateral
     */
    function closeMenu() {
      if (!isOpen) return;

      isOpen = false;
      panel.classList.remove("astro-side-nav--open");
      trigger.setAttribute("aria-expanded", "false");

      // Restaura scroll da página
      document.body.style.overflow = "";

      console.log("[SideNav] Menu fechado");
    }

    /**
     * Toggle do menu
     */
    function toggleMenu() {
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    // Event listeners

    // Clique no botão trigger
    trigger.addEventListener("click", function () {
      toggleMenu();
    });

    // Clique no botão de fechar
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        closeMenu();
      });
    }

    // Clique em links fecha o menu
    links.forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu();
      });
    });

    // Tecla ESC fecha o menu
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen) {
        closeMenu();
      }
    });

    // Clique fora do menu fecha o menu
    document.addEventListener("click", function (event) {
      if (isOpen) {
        var isClickInsidePanel = panel.contains(event.target);
        var isClickOnTrigger = trigger.contains(event.target);

        if (!isClickInsidePanel && !isClickOnTrigger) {
          closeMenu();
        }
      }
    });

    // Fecha o menu ao redimensionar a janela para desktop
    window.addEventListener("resize", function () {
      if (window.innerWidth > 768 && isOpen) {
        closeMenu();
      }
    });

    console.log("[SideNav] Menu lateral iniciado com sucesso");
  }

  // Inicializa quando o DOM está pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSideNav, { once: true });
  } else {
    initSideNav();
  }
})();
