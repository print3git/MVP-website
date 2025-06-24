export function initCarousel() {
  const carousel = document.getElementById("printing-carousel");
  if (!carousel) return;
  const track = carousel.querySelector(".carousel-track");
  const slides = track ? Array.from(track.children) : [];
  if (!track || slides.length === 0) return;
  let index = 0;
  function update() {
    track.style.transform = `translateX(-${index * 100}%)`;
  }
  carousel.querySelector(".carousel-next")?.addEventListener("click", () => {
    index = (index + 1) % slides.length;
    update();
  });
  carousel.querySelector(".carousel-prev")?.addEventListener("click", () => {
    index = (index - 1 + slides.length) % slides.length;
    update();
  });
}

document.addEventListener("DOMContentLoaded", initCarousel);
