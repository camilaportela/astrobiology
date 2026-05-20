let open = document.querySelector('.navbar--icon');
let menu = document.querySelector('.nav--open');
let close = document.querySelector('.nav--open-icon');
let menuIsOpen = false;

function setMenuState(shouldOpen) {
  if (!menu) {
    return;
  }

    menuIsOpen = shouldOpen;
    menu.classList.toggle('close', !shouldOpen);
    menu.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
    menu.style.transform = shouldOpen ? 'translateX(0)' : 'translateX(-300px)';
    menu.style.opacity = shouldOpen ? '1' : '0';
    menu.style.pointerEvents = shouldOpen ? 'auto' : 'none';
}

if (open) {
  open.addEventListener('click', function () {
        setMenuState(!menuIsOpen);
  });
}

if (close) {
  close.addEventListener('click', function () {
        setMenuState(false);
  });
}

if (menu) {
    setMenuState(false);
}

document.addEventListener("DOMContentLoaded", function () {
	const tabElement1 = document.getElementById('name');
	const tabElement2 = document.getElementById('game');
	const tabElement3 = document.getElementById('like');
	const tabElement4 = document.getElementById('contact');

    if (tabElement1) {
        tabElement1.addEventListener("click", function (e) {
            e.preventDefault();
            scrollToElement("first");
        });
    }

    if (tabElement2) {
        tabElement2.addEventListener("click", function (e) {
            e.preventDefault();
            scrollToElement("second");
        });
    }

    if (tabElement3) {
        tabElement3.addEventListener("click", function (e) {
            e.preventDefault();
            scrollToElement("third");
        });
    }

    if (tabElement4) {
        tabElement4.addEventListener("click", function (e) {
            e.preventDefault();
            scrollToElement("fourth");
        });
    }

    function smoothScrollTo(targetPosition, duration) {
        const startPosition = window.scrollY;
        const distance = targetPosition - startPosition;
        const startTime = performance.now();

        function step(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const ease = easeInOutQuad(progress);
            window.scrollTo(0, startPosition + distance * ease);

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    function scrollToElement(elementId) {
        const targetElement = document.getElementById(elementId);

        if (targetElement) {
            const offset = targetElement.getBoundingClientRect().top + window.scrollY;
            smoothScrollTo(offset, 500);
        }
    }

    function easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
});
