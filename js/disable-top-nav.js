const selectors = [
  'a[href="competitions.html"]',
  "#addons-link",
  "#profile-link",
  'a[href="CommunityCreations.html"]',
  'a[href="marketplace.html"]',
  "#earn-rewards-badge",
  "#print-club-badge",
];

for (const selector of selectors) {
  const el = document.querySelector(selector);
  if (el) {
    el.classList.add("opacity-50", "cursor-not-allowed");
    el.addEventListener("click", (e) => e.preventDefault());
    el.setAttribute("title", "Coming soon");
  }
}
