/** @jest-environment jsdom */ // eslint-disable-line jsdoc/check-tag-names
const React = require("react");
const { render } = require("@testing-library/react");
const fs = require("fs");
const path = require("path");

const pages = {
  "/index.html": fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  ),
  "/login.html": fs.readFileSync(
    path.join(__dirname, "..", "login.html"),
    "utf8",
  ),
  "/signup.html": fs.readFileSync(
    path.join(__dirname, "..", "signup.html"),
    "utf8",
  ),
  "/payment.html": fs.readFileSync(
    path.join(__dirname, "..", "payment.html"),
    "utf8",
  ),
};

function MemoryRouter({ children }) {
  return React.createElement(React.Fragment, null, children);
}
function App({ route }) {
  return React.createElement("div", {
    "data-route": route,
    dangerouslySetInnerHTML: { __html: pages[route] },
  });
}

describe("layout structure", () => {
  const expectations = {
    "/index.html": {
      header: 1,
      footer: 0,
      nav: 0,
      main: 1,
      section: 2,
      aside: 0,
    },
    "/login.html": {
      header: 1,
      footer: 0,
      nav: 0,
      main: 1,
      section: 0,
      aside: 0,
    },
    "/signup.html": {
      header: 1,
      footer: 0,
      nav: 0,
      main: 1,
      section: 0,
      aside: 0,
    },
    "/payment.html": {
      header: 1,
      footer: 0,
      nav: 0,
      main: 1,
      section: 1,
      aside: 0,
    },
  };

  for (const [route, counts] of Object.entries(expectations)) {
    test(`structure for ${route}`, () => {
      const { container } = render(
        React.createElement(
          MemoryRouter,
          { initialEntries: [route] },
          React.createElement(App, { route }),
        ),
      );
      const page = Array.from(container.querySelectorAll("[data-route]")).find(
        (el) => el.getAttribute("data-route") === route,
      );
      const count = (tag) => page.querySelectorAll(tag).length;
      for (const [tag, expected] of Object.entries(counts)) {
        expect(count(tag)).toBe(expected);
      }
    });
  }
});
