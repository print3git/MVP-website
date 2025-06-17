## Advertising & Landing

- A/B test ad designs and copy to identify highest-performing creatives.
- Target ads to demographics most likely to convert.
- Use retargeting pixels to bring back visitors who left.
- Include a clear value proposition and call-to-action in each ad.
- Keep landing pages minimal with a single prominent "Start Generating" button.

## Purchase & Checkout

- Offer multiple payment methods including Apple Pay and Google Pay.



## User Experience & Accessibility

- Ensure accessibility with ARIA labels and contrast.
  - Audit pages for missing labels.
  - Fix color contrast issues.
- Optimize API requests to reduce loading time on slow networks.

  - Bundle multiple requests where possible.

- Save user preferences such as units or color scheme.
  - Persist preferences to local storage.
  - Apply them on page load.

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

## Post-Purchase Referral Engine

- Reward £5 off the next order when users post their print online and tag us.
  - Verify the tag before issuing the discount.
- Place a QR code in each package linking to the referral page.

## Subscription Service



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

## Competitions Monetization

- Add Print Club sign-up banner to encourage subscriptions.
  - Insert a CTA banner below the page header with a "Join Print Club" button.
  - Link the button to signup.html#printclub.
  - Record banner clicks for analytics.
- Include a "Buy print" button on each leaderboard entry.
  - Extend competitions.js to render a button below each entry card.
  - On click, store the model ID to localStorage and redirect to payment.html.
- Display a discount code after a user submits an entry.
  - Show a banner with code `CONTEST10` once the entry POST succeeds.
  - Provide a dismiss option and expire the code after use.
- Showcase previous winners with purchase links.
  - Add a carousel of past winning models near the bottom of the page.
  - Each slide links directly to the payment page for that model.
- Add an email signup form for competition announcements.
  - Simple field and submit button posting to /api/mailing-list.
  - Show a confirmation message on success.
- Support entry fees for premium competitions.
  - Allow admins to specify a price when creating a competition.
  - Require payment before an entry is accepted.
- Cross-sell printing accessories on the competitions page.
  - Insert a small banner linking to the accessories store.
  - Display it below the active competitions list.
- Offer digital model downloads for a fee.
  - Provide a "Buy STL" option if the entry has a downloadable file.
  - Serve the file after Stripe checkout completes.
- Display real-time counters for prints sold from competitions.
  - Fetch purchase counts via an API endpoint.
  - Show the number near the leaderboard to create social proof.
- Reserve an advertisement slot for sponsors.
  - Add a 300x250 ad container in the sidebar.
  - Allow partner companies to place ads during each contest.
