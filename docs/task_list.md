## Advertising & Landing

- A/B test ad designs and copy to identify highest-performing creatives.
- Target ads to demographics most likely to convert.
- Use retargeting pixels to bring back visitors who left.
- Include a clear value proposition and call-to-action in each ad.
- Keep landing pages minimal with a single prominent "Start Generating" button.

## Purchase & Checkout

- Offer multiple payment methods including Apple Pay and Google Pay.

## Community & Sharing

- Surface other users' models on profile pages with an option to buy prints.

## User Experience & Accessibility

- Ensure accessibility with ARIA labels and contrast.
  - Audit pages for missing labels.
  - Fix color contrast issues.
- Optimize API requests to reduce loading time on slow networks.

  - Bundle multiple requests where possible.

- Save user preferences such as units or color scheme.
  - Persist preferences to local storage.
  - Apply them on page load.

## Mailing List

- Decide on the signup trigger for collecting emails.
- Sync the database with the mailing service automatically.
- Provide an unsubscribe link in every email.
- Test the full signup and confirmation flow end-to-end.
- Monitor bounces and unsubscribes to keep the list clean.

## Creating urgency

- Show dynamic "Only X left" or "Selling fast" notices.
- Display shipping cut-off timers like "Order in 3h for same-day processing".
- Add small pop-ups such as "Anna from NY just purchased" or "23 people are viewing this item".
- Advertise limited-run products with remaining quantity counters.
- Start a short reservation timer when items are added to the cart.
- Tie promotions to events/holidays (e.g., "Order before Friday for Father's Day delivery").
- Trigger exit-intent pop-ups warning "Sale ends tonight!" or offering a final code.
- Show queue positions or a waitlist to encourage immediate checkout.
- Let users opt in for notifications when a promotion is about to end.

## Profile Models

- Display thumbnails on `profile.html` using the snapshot value.
- Allow clicking a thumbnail to view the 3D model.
- Write tests covering the new endpoint behavior.
