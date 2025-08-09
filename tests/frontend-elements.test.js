const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

describe("frontend key elements", () => {
  const load = (file) => {
    const filePath = path.join(__dirname, "..", file);
    const html = fs.readFileSync(filePath, "utf8");
    return new JSDOM(html).window.document;
  };

  describe("index.html", () => {
    let document;
    beforeAll(() => {
      document = load("index.html");
    });

    test("navigation links are present", () => {
      expect(
        document.querySelector('a[href="competitions.html"]'),
      ).not.toBeNull();
      expect(document.getElementById("addons-link")).not.toBeNull();
      expect(document.getElementById("profile-link")).not.toBeNull();
    });

    test("stats ticker exists", () => {
      expect(document.getElementById("stats-ticker")).not.toBeNull();
    });
  });

  describe("login.html", () => {
    let document;
    beforeAll(() => {
      document = load("login.html");
    });

    test("header links remain", () => {
      expect(document.getElementById("back-link")).not.toBeNull();
      expect(document.getElementById("earn-rewards-badge")).not.toBeNull();
      expect(document.getElementById("print-club-badge")).not.toBeNull();
    });
  });
});
