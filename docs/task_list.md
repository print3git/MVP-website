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
  - Showcase other users' creations for inspiration.

- Add loyalty features to the account area.
  - Grant a badge after four total purchases.
  - Highlight a "Print of the week" for quick purchase.
  - For subscribers, show a countdown to their next free print.
  - Provide subscriber-only design previews.
  - Track consecutive weekly orders and badge streaks.

## Mailing List Automation

- Create `mailing_list` table with columns `email`, `token`, `confirmed`, and `unsubscribed`.
- Write a migration to create the table.
- Add a model for mailing list entries.
- Implement POST `/api/subscribe` endpoint:
  - Insert a new address if one does not exist.
  - Update an existing entry with a new token and reset the unsubscribed flag.
  - Generate a unique token and store it with the address.
  - Send a confirmation email containing the token.
- Implement GET `/api/confirm-subscription` endpoint:
  - Look up the address by token.
  - Mark the address as confirmed.
- Call the subscribe endpoint when new accounts are created.
- Call the subscribe endpoint during guest checkout.
- Implement GET `/api/unsubscribe` endpoint:
  - Look up the address by token.
  - Mark the address as unsubscribed.
- Handle SendGrid webhook events to unsubscribe addresses on bounce or complaint.
- Add `sync-mailing-list.js` script to push confirmed addresses to SendGrid.
- Schedule the sync script to run daily.
- Add unit tests for subscribe, confirm, unsubscribe, webhook handling and sync logic.


## Competitions Profit Drivers

- Show purchase buttons for past winners.
  - Add a "Buy Print" button below each winning model in `competitions.html`.
  - Pre-fill `print3Model` and `print3JobId` in local storage when the button is clicked.
- Promote Print Club on the competitions page.
  - Insert a short banner explaining membership benefits with a sign-up link.
- Offer a discount for printing your competition entry.
  - Generate a one-time code after an entry is submitted.
  - Display the code in the success message.
- Capture emails for future promotions.
  - Add a small mailing list form on the competitions page.
  - POST addresses to `/api/subscribe` and show confirmation.
- Add "Order Print" button under each past winner card on the competitions page.
  - When clicked, open the model modal with the winner's model and job ID.
  - Save the model ID to localStorage when proceeding to checkout.
- Insert a banner at the top of the page promoting Print Club membership.
  - Link the banner to the existing Print Club modal for sign-up.
- Add social share icons (Twitter, Facebook, Reddit) to every active competition card.
- Place an email form below the active competition list to subscribe to updates.
  - Implement POST `/api/competitions/subscribe` to store the address and send a confirmation email.
- After a user enters a competition, display a one-time discount code for printing their entry.
  - Provide `/api/competitions/:id/discount` endpoint to generate and return the code.
- Create a "Trending Prints" section at the bottom that fetches models from `/api/trending` and shows Add to Basket buttons.

