/* eslint-disable jsdoc/check-tag-names */
/** @jest-environment jsdom */
const React = require("react");
const { render, screen } = require("@testing-library/react");
require("@babel/register")({
  presets: [[require.resolve("@babel/preset-react"), { runtime: "automatic" }]],
  plugins: [
    [require.resolve("@babel/plugin-syntax-typescript"), { isTSX: true }],
  ],
  extensions: [".js", ".jsx"],
});

jest.mock("react-places-autocomplete", () => {
  const React = require("react");
  return ({ value, onChange, children }) =>
    React.createElement(
      "div",
      null,
      children({
        getInputProps: (props) => ({
          ...props,
          value,
          onChange: (e) => onChange(e.target.value),
        }),
        suggestions: [],
        getSuggestionItemProps: () => ({}),
        loading: false,
      }),
    );
});

const CheckoutForm = require("../src/components/CheckoutForm.js").default;

describe("component smoke tests", () => {
  test("CheckoutForm renders", () => {
    render(React.createElement(CheckoutForm));
    expect(screen.getByRole("button", { name: /submit/i })).toBeTruthy();
  });
});
