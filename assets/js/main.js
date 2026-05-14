$(document).ready(function () {
  // typing animation
  (function ($) {
    $.fn.writeText = function (content) {
      var contentArray = content.split(""),
        current = 0,
        elem = this;
      setInterval(function () {
        if (current < contentArray.length) {
          elem.text(elem.text() + contentArray[current++]);
        }
      }, 80);
    };
  })(jQuery);

  // input text for typing animation
  $("#holder").writeText("WEB DESIGNER + FRONT-END DEVELOPER");

  // initialize wow.js
  new WOW().init();

  // Push the body and the nav over by 285px over
  var main = function () {
    $(".fa-bars").click(function () {
      $(".nav-screen").animate(
        {
          right: "0px"
        },
        200
      );

      $("body").animate(
        {
          right: "285px"
        },
        200
      );
    });

    // Then push them back */
    $(".fa-xmark").click(function () {
      $(".nav-screen").animate(
        {
          right: "-285px"
        },
        200
      );

      $("body").animate(
        {
          right: "0px"
        },
        200
      );
    });

    $(".nav-links a").click(function () {
      $(".nav-screen").animate(
        {
          right: "-285px"
        },
        500
      );

      $("body").animate(
        {
          right: "0px"
        },
        500
      );
    });
  };

  $(document).ready(main);

  // initiate full page scroll

  $("#fullpage").fullpage({
    scrollBar: true,
    normalScrollElements: ".article-section",
    normalScrollElementTouchThreshold: 5,
    scrollingSpeed: 1200,
    responsiveWidth: 400,
    navigation: true,
    navigationTooltips: ["home", "about"],
    anchors: ["home", "about"],
    fitToSection: false,

    afterLoad: function (anchorLink, index) {
      var loadedSection = $(this);

      //using index
      if (index == 1) {
        /* add opacity to arrow */
        $(".fa-chevron-down").each(function () {
          $(this).css("opacity", "1");
        });
        $(".header-links a").each(function () {
          $(this).css("color", "white");
        });
        $(".header-links").css("background-color", "transparent");
      } else if (index != 1) {
        $(".header-links a").each(function () {
          $(this).css("color", "black");
        });
        $(".header-links").css("background-color", "white");
      }

      //using index
      if (index == 2) {
        /* animate skill bars */
        $(".skillbar").each(function () {
          $(this)
            .find(".skillbar-bar")
            .animate(
              {
                width: $(this).attr("data-percent")
              },
              2500
            );
        });
      }
    }
  });

  // move section down one
  $(document).on("click", "#moveDown", function () {
    $.fn.fullpage.moveSectionDown();
  });

  // ensure solar system fits inside the stripe: compute scale from stripe height (40vh) and base size (1560px)
  function updateSolarScale() {
    try {
      var stripePercent = 40; // must match CSS .aboutme height (40vh)
      var stripePx = window.innerHeight * (stripePercent / 100);
      var baseSize = 1560; // the unscaled solar-syst size in px
      var scale = stripePx / baseSize;
      if (!isFinite(scale) || scale <= 0) scale = 0.34;
      // clamp scale so it doesn't get too large
      if (scale > 1) scale = 1;
      document.documentElement.style.setProperty('--solar-scale', scale);
    } catch (e) {
      // noop
    }
  }

  // initial update and on resize
  updateSolarScale();
  window.addEventListener('resize', updateSolarScale);

  // fullpage.js link navigation
  $(document).on("click", "#skills", function () {
    $.fn.fullpage.moveTo(2);
  });

  // comment actions
  $(document).on("click", ".comment__text--meta a", function (e) {
    e.preventDefault();

    var heartIcon = $(this).find(".fa-heart");
    if (heartIcon.length) {
      heartIcon.toggleClass("fa-regular fa-solid liked");
    }
  });

  // smooth scrolling
  $(function () {
    $("a[href*=#]:not([href=#])").click(function () {
      if (
        location.pathname.replace(/^\//, "") ==
          this.pathname.replace(/^\//, "") &&
        location.hostname == this.hostname
      ) {
        var target = $(this.hash);
        target = target.length
          ? target
          : $("[name=" + this.hash.slice(1) + "]");
        if (target.length) {
          $("html,body").animate(
            {
              scrollTop: target.offset().top
            },
            700
          );
          return false;
        }
      }
    });
  });

  //ajax form
  $(function () {
    // Get the form.
    var form = $("#ajax-contact");

    // Get the messages div.
    var formMessages = $("#form-messages");

    // Set up an event listener for the contact form.
    $(form).submit(function (e) {
      // Stop the browser from submitting the form.
      e.preventDefault();

      // Serialize the form data.
      var formData = $(form).serialize();

      // Submit the form using AJAX.
      $.ajax({
        type: "POST",
        url: $(form).attr("action"),
        data: formData
      })
        .done(function (response) {
          // Make sure that the formMessages div has the 'success' class.
          $(formMessages).removeClass("error");
          $(formMessages).addClass("success");

          // Set the message text.
          $(formMessages).text(response);

          // Clear the form.
          $("#name").val("");
          $("#email").val("");
          $("#message").val("");
        })
        .fail(function (data) {
          // Make sure that the formMessages div has the 'error' class.
          $(formMessages).removeClass("success");
          $(formMessages).addClass("error");

          // Set the message text.
          if (data.responseText !== "") {
            $(formMessages).text(data.responseText);
          } else {
            $(formMessages).text(
              "Oops! An error occured and your message could not be sent."
            );
          }
        });
    });
  });
});

class ClickSpark extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = this.createSpark();
    this.svg = this.shadowRoot.querySelector("svg");
    this._parent = this.parentNode;
    this._parent.addEventListener("click", this);
  }

  disconnectedCallback() {
    this._parent.removeEventListener("click", this);
    delete this._parent;
  }

  handleEvent(e) {
    this.setSparkPosition(e);
    this.animateSpark();
  }

  animateSpark() {
    var sparks = Array.prototype.slice.call(this.svg.children);
    var size = parseInt(sparks[0].getAttribute("y1"), 10);
    var offset = size / 2 + "px";

    var keyframes = function (i) {
      var deg = "calc(" + i + " * (360deg / " + sparks.length + "))";

      return [
        {
          strokeDashoffset: size * 3,
          transform: "rotate(" + deg + ") translateY(" + offset + ")"
        },
        {
          strokeDashoffset: size,
          transform: "rotate(" + deg + ") translateY(0)"
        }
      ];
    };

    var options = {
      duration: 660,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      fill: "forwards"
    };

    sparks.forEach(function (spark, i) {
      spark.animate(keyframes(i), options);
    });
  }

  setSparkPosition(e) {
    this.style.left = e.pageX - this.clientWidth / 2 + "px";
    this.style.top = e.pageY - this.clientHeight / 2 + "px";
  }

  createSpark() {
    return (
      "<style>" +
      ":host { position: absolute; pointer-events: none; }" +
      "</style>" +
      "<svg width=\"30\" height=\"30\" viewBox=\"0 0 100 100\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"4\" stroke=\"var(--click-spark-color, currentcolor)\" transform=\"rotate(-20)\">" +
      Array.from({ length: 8 }, function () {
        return "<line x1=\"50\" y1=\"30\" x2=\"50\" y2=\"4\" stroke-dasharray=\"30\" stroke-dashoffset=\"30\" style=\"transform-origin: center\" />";
      }).join("") +
      "</svg>"
    );
  }
}

if (!customElements.get("click-spark")) {
  customElements.define("click-spark", ClickSpark);
}
