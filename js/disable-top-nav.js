const selectors = [
  'a[href="competitions.html"]',
  'a[href="addons.html"]',
  'a[href="profile.html"]',
  'a[href="CommunityCreations.html"]',
  'a[href="marketplace.html"]',
  "#earn-rewards-badge",
  "#print-club-badge",
];

for (const selector of selectors) {
  const el = document.querySelector(selector);
  if (!el) continue;

  el.classList.add("opacity-50", "cursor-not-allowed");
  el.setAttribute("title", "Coming soon");
  el.setAttribute("aria-disabled", "true");
  el.addEventListener("click", (e) => e.preventDefault());
}
