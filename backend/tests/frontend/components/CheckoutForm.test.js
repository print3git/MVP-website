/** @jest-environment jsdom */
const React = require("react");
const { render } = require("@testing-library/react");

const CheckoutForm =
  require("../../../../src/components/CheckoutForm.js").default;
jest.mock("react-places-autocomplete", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: () => React.createElement("div"),
    geocodeByAddress: jest.fn(),
  };
});

describe("CheckoutForm", () => {
  test("renders consistently", () => {
    const { container } = render(React.createElement(CheckoutForm));
    expect(container).toMatchSnapshot();
  });
});
