const targets = [
  { selector: 'a[href="competitions.html"]', removeParent: true },
  { selector: 'a[href="CommunityCreations.html"]', removeParent: true },
  { selector: "#earn-rewards-badge", removeParent: false },
  { selector: "#print-club-badge", removeParent: false },
];

for (const { selector, removeParent } of targets) {
  const el = document.querySelector(selector);
  if (el) {
    const node = removeParent && el.parentElement ? el.parentElement : el;
    node.remove();
  }
}
