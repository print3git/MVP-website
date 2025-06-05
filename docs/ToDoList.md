# Clickthrough Rate Optimization

This list tracks ideas to aggressively increase click-through at every step from advert to purchase.

## Advert to Landing
- A/B test ad designs and copy to identify highest-performing creatives.
- Target ads to demographics most likely to convert.
- Use retargeting pixels to bring back visitors who left.
- Include a clear value proposition and call-to-action in each ad.

## Landing to Prompt
- Keep landing pages minimal with a single prominent "Start Generating" button.
- Offer social login and guest mode so users can begin without account friction.
- Provide a few example prompts to inspire new visitors.
- Prefill the prompt box with the last prompt or a suggested one.

## Prompt to Generation
- Validate prompts client-side to prevent submission errors.
- Show a short tooltip/tutorial explaining how to craft a good prompt.
- Display trending prompts or community examples for inspiration.

## Generation to Purchase
- Show a real-time progress bar and estimated wait time while the model renders.
- Allow users to continue browsing or editing the prompt without losing progress.
- Present a 3D viewer with clear "Buy Now" and "Edit" options once generation completes.
- Enable one-click purchase using saved payment/shipping details.
- Offer multiple payment methods including Apple Pay and Google Pay.
- Automatically calculate and display shipping cost and delivery ETA before checkout.
- Send a reminder email if a user generates a model but doesn't purchase.
- Provide incentives like discounts or credits for the first order.

## Community Prints
- Add a "Purchase Print" button on every item in the Community Creations gallery.
- Surface other users' models on profile pages with an option to buy prints.
- Let creators mark their models as publicly sellable or private.
- Record each purchase in the buyer's order history for reordering and tracking.

## Payment Countdown Discount
- Insert a new `<p id="flash-discount">` element in `payment.html` below the existing quantity discount text.
- Style the countdown message so it matches other notice text.
- In `js/payment.js`, check `localStorage` for a `flashDiscountEnd` value on page load.
- If none exists or it's expired, set `flashDiscountEnd` to five minutes from the current time.
- Start a timer that updates the remaining time in `#flash-discount` every second.
- When the timer reaches zero, remove the message and delete `flashDiscountEnd` from `localStorage`.
- Apply a 5% discount during checkout while the timer is active.
- Pass this discount along with the quantity discount to `createCheckout`.
- Add a developer-only button or method to reset the timer for testing.

## Single Image Upload Restriction
- Change the "Upload Images" label to "Upload Image" in `index.html`.
- Remove the `multiple` attribute from the upload input.
- Limit `uploadedFiles` to only one file in `js/index.js`.
- Render just one thumbnail in the preview area and shrink its height.
- Update ARIA labels or text that reference multiple images.
