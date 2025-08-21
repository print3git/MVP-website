/* eslint-env browser */
if (typeof window !== "undefined") {
  (function () {
    try {
      if (localStorage.getItem("colorScheme") === "light") {
        document.documentElement.classList.add("light");
      }
    } catch {}
  })();
}
