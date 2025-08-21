import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CheckoutForm from "../../src/components/CheckoutForm";

jest.mock("react-places-autocomplete", () => {
  return {
    __esModule: true,
    default: ({ children, value, onChange }) => (
      <div>
        <input
          data-testid="autocomplete"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {children({
          getInputProps: (props) => ({
            ...props,
            value,
            onChange: (e) => onChange(e.target.value),
          }),
          suggestions: [],
          getSuggestionItemProps: () => ({}),
          loading: false,
        })}
      </div>
    ),
    geocodeByAddress: jest.fn(() =>
      Promise.resolve([{ address_components: [] }]),
    ),
  };
});

describe("CheckoutForm", () => {
  test("allows manual address entry", () => {
    render(<CheckoutForm />);
    fireEvent.click(screen.getByText(/enter it manually/i));
    const street = screen.getByLabelText(/street/i);
    fireEvent.change(street, { target: { value: "123 Main" } });
    expect(street.value).toBe("123 Main");
  }, 10000);
});
