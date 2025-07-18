/* eslint-disable jsdoc/check-tag-names */
/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Force react-places-autocomplete used by CheckoutForm to throw during render
jest.mock("react-places-autocomplete", () => {
  return () => {
    throw new Error("mock failure");
  };
});

const CheckoutForm = require("../src/components/CheckoutForm.js").default;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return React.createElement("div", { role: "alert" }, "boundary caught");
    }
    return this.props.children;
  }
}

describe("react component error boundaries", () => {
  test("CheckoutForm fails gracefully", () => {
    expect(() =>
      render(
        React.createElement(
          ErrorBoundary,
          null,
          React.createElement(CheckoutForm, { invalidProp: {} })
        )
      )
    ).not.toThrow();
    expect(screen.getByRole("alert")).toHaveTextContent("boundary caught");
  });
});
