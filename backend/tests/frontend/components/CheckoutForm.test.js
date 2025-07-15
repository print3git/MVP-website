/** @jest-environment jsdom */
const React = require("react");
const { render } = require("@testing-library/react");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");
jest.mock("react-places-autocomplete", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: () => React.createElement("div"),
    geocodeByAddress: jest.fn(),
  };
});

const src = fs.readFileSync(
  path.join(__dirname, "../../../../src/components/CheckoutForm.js"),
  "utf8",
);
const { code } = babel.transformSync(src, {
  filename: "component.js",
  presets: [["@babel/preset-react", { runtime: "automatic" }]],
  plugins: [
    ["@babel/plugin-syntax-typescript", { isTSX: true }],
    "@babel/plugin-transform-modules-commonjs",
  ],
});
const moduleObj = { exports: {} };
const func = new Function("require", "module", "exports", code);
func(require, moduleObj, moduleObj.exports);
const CheckoutForm = moduleObj.exports.default;

describe("CheckoutForm", () => {
  test("renders consistently", () => {
    const { container } = render(React.createElement(CheckoutForm));
    expect(container).toMatchSnapshot();
  });
});
