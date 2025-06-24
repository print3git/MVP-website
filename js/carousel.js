export function initCarousel() {
  const carousel = document.getElementById("printing-carousel");
  if (!carousel) return;
  const track = carousel.querySelector(".carousel-track");
  const slides = track ? Array.from(track.children) : [];
  if (!track || slides.length === 0) return;
  function getSlidesPerView() {
    if (window.matchMedia("(min-width: 1024px)").matches) return 3;
    if (window.matchMedia("(min-width: 640px)").matches) return 2;
    return 1;
  }
  let slidesPerView = getSlidesPerView();
  function setWidths() {
    slidesPerView = getSlidesPerView();
    slides.forEach((s) => {
      s.style.flex = `0 0 ${100 / slidesPerView}%`;
    });
  }
  setWidths();
  let index = 0;
  function update() {
    if (index > slides.length - slidesPerView)
      index = slides.length - slidesPerView;
    if (index < 0) index = 0;
    track.style.transform = `translateX(-${index * (100 / slidesPerView)}%)`;
  }
  carousel.querySelector(".carousel-next")?.addEventListener("click", () => {
    index += 1;
    update();
  });
  carousel.querySelector(".carousel-prev")?.addEventListener("click", () => {
    index -= 1;
    update();
  });
  window.addEventListener("resize", () => {
    setWidths();
    update();
  });
}

document.addEventListener("DOMContentLoaded", initCarousel);
