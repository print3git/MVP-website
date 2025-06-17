## Advertising & Landing

- A/B test ad designs and copy to identify highest-performing creatives.
- Target ads to demographics most likely to convert.
- Use retargeting pixels to bring back visitors who left.
- Include a clear value proposition and call-to-action in each ad.
- Keep landing pages minimal with a single prominent "Start Generating" button.
- Provide multiple quotes for each subreddit and rotate them on reload.
- Use a distinct .glb model for each subreddit landing page.

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

## Discount Code System

- Create a `discount_codes` database table with fields for code, amount/percent off, expiration, usage limits, and active flag.
- Add an API endpoint to validate discount codes and return the discount amount.
- Update the checkout page to include an optional discount code input box that applies validated codes.
- Build an admin interface or script for creating and retiring codes securely.
- Track code usage for auditing and store codes safely (e.g., hashed).
- Expand the test suite to cover valid, expired, and invalid discount codes.

## Decreasing CAC

- Add real photo of printed object or user-generated image to hero section to reinforce the physical product.
- Display pricing info near the prompt field such as "From $X / print" to reduce hesitation.

## Referral Discount System

- Replace the hard-coded list with database queries and record each successful use.
- Validate codes against expiration dates and remaining uses.
- Plan a database schema for tracking referral codes and the users who share them.
- Add an API endpoint for generating referral links and applying associated discounts for new customers.
- Decide on the credit/discount amounts for both referrer and referee and persist the data.
- Integrate referral tracking into the checkout flow alongside discount codes.

## Subscription Service


- Show a progress bar on the account dashboard with prints used this week and an upgrade CTA.
- Require prints to be redeemed in pairs and reset credits weekly without rollover.
- Send monthly reminder emails to subscribers encouraging them to use remaining prints.
- Track sign‑ups and churn; A/B test pricing (£140 vs £160) and monitor ARPU.
- Offer a first‑month discount or referral credit to incentivize new subscribers.

## Repeat Purchase Incentives


- Show gifting options at checkout and on delivery confirmation.
  - Add a "This is a surprise" toggle for recipient details.
  - Offer a discount when ordering two prints of the same model.
  - Rotate limited-time seasonal bundles for gifting.
- Run theme campaigns such as "Sci-fi month" or "D&D drop".

  - Award a badge when someone purchases three times in a month.
- Build a personal library page listing all previous designs.
  - Enable one-click reorders from the library.
  - Add a "Remix this model" button for spin-off prints.
  - Offer an optional monthly "time capsule" print.
- Send automated post-purchase emails.
  - Showcase other users' creations for inspiration.
  - Include a direct reorder button in the email.
  - Send a follow-up reminder 5–7 days after delivery.
- Add loyalty features to the account area.
  - Grant a badge after four total purchases.
  - Highlight a "Print of the week" for quick purchase.
  - For subscribers, show a countdown to their next free print.
  - Provide subscriber-only design previews.
  - Track consecutive weekly orders and badge streaks.
