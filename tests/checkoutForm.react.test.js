/* eslint-disable jsdoc/check-tag-names */
/**
 * @jest-environment jsdom
 */
const React = require("react");
const { render, fireEvent, screen } = require("@testing-library/react");

jest.mock("react-places-autocomplete", () => {
  return ({ value, onChange, children }) =>
    React.createElement(
      "div",
      {},
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

test("manual entry fields appear when link clicked", () => {
  render(React.createElement(CheckoutForm));
  expect(screen.queryByLabelText(/Street/i)).toBeNull();
  fireEvent.click(screen.getByText(/Enter it manually/));
  expect(screen.getByLabelText(/Street/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/ZIP/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();
});

test("hidden inputs mirror manual values", () => {
  render(React.createElement(CheckoutForm));
  fireEvent.click(screen.getByText(/Enter it manually/));
  fireEvent.change(screen.getByLabelText(/Street/i), {
    target: { value: "1 Main" },
  });
  expect(screen.getAllByDisplayValue("1 Main").length).toBe(2);
});
