export function escapeHtml(input) {
  return input.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
}

export function setSafeInnerHTML(el, template, ...values) {
  const safe = template.reduce((acc, part, i) => {
    const val = i < values.length ? escapeHtml(String(values[i])) : "";
    return acc + part + val;
  }, "");
  el.innerHTML = safe;
}
