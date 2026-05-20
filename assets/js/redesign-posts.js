/* Homepage posts gallery - Astrobiologia */
(function () {
  "use strict";

  var state = {
    posts: [],
    index: 0,
    visibleCount: 4
  };

  function escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(dateString) {
    if (!dateString) return "";

    var date = new Date(dateString + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function getVisibleCount() {
    if (window.matchMedia("(max-width: 560px)").matches) return 1;
    if (window.matchMedia("(max-width: 820px)").matches) return 2;
    if (window.matchMedia("(max-width: 1100px)").matches) return 3;
    return Math.min(4, state.posts.length || 4);
  }

  function createCard(post) {
    var title = escapeHTML(post.title || "Publicação");
    var subtitle = escapeHTML(post.subtitle || "");
    var tag = escapeHTML(post.tag || "Texto");
    var author = escapeHTML(post.author || "");
    var date = escapeHTML(formatDate(post.date));
    var url = escapeHTML(post.url || "/noticias/");
    var image = escapeHTML(post.image || "/assets/img/planets/2k_stars_milky_way.jpg");
    var meta = [author, date].filter(Boolean).join(" • ");

    return (
      '<a class="b-game-card" href="' + url + '">' +
        '<span class="b-game-card__cover" style="background-image: url(' + image + ');"></span>' +
        '<span class="b-game-card__content">' +
          '<span class="b-game-card__tag">' + tag + '</span>' +
          '<h3>' + title + '</h3>' +
          (subtitle ? '<p>' + subtitle + '</p>' : '') +
          (meta ? '<span class="b-game-card__meta">' + escapeHTML(meta) + '</span>' : '') +
        '</span>' +
      '</a>'
    );
  }

  function updateCarousel() {
    var track = document.querySelector("[data-posts-track]");
    var prev = document.querySelector("[data-posts-prev]");
    var next = document.querySelector("[data-posts-next]");

    if (!track) return;

    state.visibleCount = getVisibleCount();

    if (!state.posts.length) {
      track.innerHTML = '<p class="home-posts-gallery__loading">Nenhuma publicação disponível por enquanto.</p>';
      if (prev) prev.hidden = true;
      if (next) next.hidden = true;
      return;
    }

    if (!track.dataset.rendered) {
      track.innerHTML = state.posts.map(createCard).join("");
      track.dataset.rendered = "true";
    }

    var maxIndex = Math.max(0, state.posts.length - state.visibleCount);

    if (state.index > maxIndex) {
      state.index = maxIndex;
    }

    var firstCard = track.querySelector(".b-game-card");
    var gap = 30;
    var cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 0;
    var offset = state.index * (cardWidth + gap);

    track.style.transform = "translateX(-" + offset + "px)";

    if (prev) {
      prev.hidden = state.index <= 0;
    }

    if (next) {
      next.hidden = state.index >= maxIndex;
    }
  }

  function bindControls() {
    var prev = document.querySelector("[data-posts-prev]");
    var next = document.querySelector("[data-posts-next]");

    if (prev) {
      prev.addEventListener("click", function () {
        state.index = Math.max(0, state.index - 1);
        updateCarousel();
      });
    }

    if (next) {
      next.addEventListener("click", function () {
        var maxIndex = Math.max(0, state.posts.length - state.visibleCount);
        state.index = Math.min(maxIndex, state.index + 1);
        updateCarousel();
      });
    }

    window.addEventListener("resize", updateCarousel);
  }

  function initPosts() {
    var track = document.querySelector("[data-posts-track]");

    if (!track) return;

    fetch("/assets/data/posts.json?v=1")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Não foi possível carregar posts.json");
        }

        return response.json();
      })
      .then(function (posts) {
        state.posts = Array.isArray(posts) ? posts : [];
        state.posts.sort(function (a, b) {
          return String(b.date || "").localeCompare(String(a.date || ""));
        });

        bindControls();
        updateCarousel();
      })
      .catch(function (error) {
        console.warn("[Posts]", error);
        track.innerHTML = '<p class="home-posts-gallery__loading">Não foi possível carregar as publicações agora.</p>';
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPosts, { once: true });
  } else {
    initPosts();
  }
})();
