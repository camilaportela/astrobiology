// Menu lateral de navegação - Astrobiologia
(function () {
  var nav = document.querySelector(".astro-side-nav");

  if (!nav) {
    return;
  }

  var trigger = nav.querySelector(".astro-side-nav__trigger");
  var closeButton = nav.querySelector(".astro-side-nav__close");
  var overlay = nav.querySelector(".astro-side-nav__overlay");
  var panel = nav.querySelector(".astro-side-nav__panel");
  var links = nav.querySelectorAll(".astro-side-nav__link");

  function openNav() {
    nav.classList.add("is-open");

    if (trigger) {
      trigger.setAttribute("aria-expanded", "true");
      trigger.setAttribute("aria-label", "Fechar menu");
    }

    if (panel) {
      panel.setAttribute("aria-hidden", "false");
    }
  }

  function closeNav() {
    nav.classList.remove("is-open");

    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-label", "Abrir menu");
    }

    if (panel) {
      panel.setAttribute("aria-hidden", "true");
    }
  }

  function toggleNav() {
    if (nav.classList.contains("is-open")) {
      closeNav();
    } else {
      openNav();
    }
  }

  if (trigger) {
    trigger.addEventListener("click", toggleNav);
  }

  if (closeButton) {
    closeButton.addEventListener("click", closeNav);
  }

  if (overlay) {
    overlay.addEventListener("click", closeNav);
  }

  links.forEach(function (link) {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeNav();
    }
  });
})();
