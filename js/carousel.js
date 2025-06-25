export function initCarousel() {
  const carousel = document.getElementById("printing-carousel");
  if (!carousel) return;
  const track = carousel.querySelector(".carousel-track");
  if (!track) return;
  const transitionStyle =
    "transform 0.5s ease-in-out, opacity 0.15s ease-in-out";
  track.style.willChange = "transform";
  track.style.transition = transitionStyle;
  let slides = Array.from(track.children);
  if (slides.length === 0) return;
  function getSlidesPerView() {
    if (window.matchMedia("(min-width: 1024px)").matches) return 3;
    if (window.matchMedia("(min-width: 640px)").matches) return 2;
    return 1;
  }
  let slidesPerView = getSlidesPerView();
  let slideWidth = 100 / slidesPerView;
  function setWidths() {
    slidesPerView = getSlidesPerView();
    slideWidth = 100 / slidesPerView;
    slides = Array.from(track.children);
    slides.forEach((s) => {
      s.style.flex = `0 0 ${slideWidth}%`;
    });
  }
  setWidths();

  // Reveal the carousel after layout calculations to avoid a flash of
  // misplaced slides when the page first loads.
  setTimeout(() => {
    track.style.opacity = "1";
  }, 50);

  let autoMoveInterval;
  let userInteracted = false;

  function stopAutoMove() {
    if (!userInteracted) {
      userInteracted = true;
      clearInterval(autoMoveInterval);
    }
  }

  function next() {
    track.style.transition = transitionStyle;
    track.style.transform = `translateX(-${slideWidth}%)`;
    track.addEventListener(
      "transitionend",
      () => {
        track.appendChild(track.firstElementChild);
        track.style.transition = "none";
        track.style.transform = "translateX(0)";
        slides = Array.from(track.children);
      },
      { once: true },
    );
  }

  function prev() {
    track.style.transition = transitionStyle;
    track.style.transform = `translateX(${slideWidth}%)`;
    track.addEventListener(
      "transitionend",
      () => {
        track.prepend(track.lastElementChild);
        track.style.transition = "none";
        track.style.transform = "translateX(0)";
        slides = Array.from(track.children);
      },
      { once: true },
    );
  }

  carousel.querySelector(".carousel-next")?.addEventListener("click", () => {
    stopAutoMove();
    next();
  });
  carousel.querySelector(".carousel-prev")?.addEventListener("click", () => {
    stopAutoMove();
    prev();
  });

  carousel.addEventListener("mousedown", stopAutoMove, { once: true });
  carousel.addEventListener("touchstart", stopAutoMove, { once: true });

  window.addEventListener("resize", () => {
    setWidths();
  });

  autoMoveInterval = setInterval(() => {
    if (!userInteracted) next();
  }, 6000);
}

document.addEventListener("DOMContentLoaded", initCarousel);
