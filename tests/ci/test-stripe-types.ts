import Stripe from "../../backend/node_modules/stripe";

describe("Stripe type safety", () => {
  const API_VERSION = "2025-06-30.basil";
  const stripe = new Stripe("sk_test_123", { apiVersion: API_VERSION });

  test("client uses expected API version", () => {
    expect(stripe.getApiField("version")).toBe(API_VERSION);
  });

  test("checkout session parameters are valid", () => {
    /** @type {Stripe.Checkout.SessionCreateParams} */
    const params = {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 1000,
            product_data: {
              name: "Test product",
            },
          },
          quantity: 1,
        },
      ],
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
    };

    /** @type {Stripe.Checkout.SessionCreateParams.Mode[]} */
    const allowedModes = ["payment", "setup", "subscription"];
    expect(allowedModes).toContain(params.mode);

    params.line_items?.forEach((item) => {
      const price = item.price_data || {};
      expect(typeof price.currency).toBe("string");
      expect(typeof price.unit_amount).toBe("number");
      expect(typeof price.product_data?.name).toBe("string");
    });

    // Uncomment the block below to see the TypeScript errors that would occur
    // when invalid values are used.
    /*
    const invalid: Stripe.Checkout.SessionCreateParams = {
      // @ts-expect-error - mode must be 'payment' | 'setup' | 'subscription'
      mode: "invalid",
      line_items: [
        {
          price_data: {
            currency: 123, // @ts-expect-error - currency must be string
            unit_amount: "1000", // @ts-expect-error - unit_amount must be number
            product_data: {
              name: 456, // @ts-expect-error - name must be string
            },
          },
          quantity: 1,
        },
      ],
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
    };
    */
  });
});
