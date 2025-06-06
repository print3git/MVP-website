# Project Task List

This consolidated list merges all outstanding tasks from the previous to-do documents.

## Advertising & Landing

- A/B test ad designs and copy to identify highest-performing creatives.
- Target ads to demographics most likely to convert.
- Use retargeting pixels to bring back visitors who left.
- Include a clear value proposition and call-to-action in each ad.
- Keep landing pages minimal with a single prominent "Start Generating" button.
- Offer social login and guest mode so users can begin without account friction.

- Offer subreddit-specific landing pages for Reddit ads.
  - Accept an `sr` query parameter indicating the subreddit.
  - Place a dedicated .glb placeholder for each subreddit in `/models/`.
  - Create `js/subredditLanding.js` with a mapping from subreddit to placeholder and quote.
  - Parse `sr` on page load to choose the correct .glb and quote.
  - Insert the quote into a new element with id `sr-quote`.
  - Include `<script src="js/subredditLanding.js"></script>` on the landing page.
  - Fallback to the default astronaut and generic quote when `sr` is missing or unknown.
  - Generate ad links with the `?sr=<subreddit>` parameter.

## Prompting & Generation

- Display trending prompts or community examples for inspiration.

## Purchase & Checkout

- Offer multiple payment methods including Apple Pay and Google Pay.
- Automatically calculate and display shipping cost and delivery ETA before checkout.
- Send a reminder email if a user generates a model but doesn't purchase.
- Show estimated print cost and delivery time before checkout.
  - Calculate cost and ETA from model parameters.
  - Display them near the checkout button.

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
- Choose an email marketing service or build a custom solution.
- Update signup and order forms with an opt-in checkbox.
- Store opted-in addresses in a `mailing_list` table.
- Send confirmation emails to verify subscriptions.
- Sync the database with the mailing service automatically.
- Provide an unsubscribe link in every email.
- Test the full signup and confirmation flow end-to-end.
- Document how the mailing list is managed.
- Monitor bounces and unsubscribes to keep the list clean.

## Creating urgency
- Show dynamic "Only X left" or "Selling fast" notices.
- Display shipping cut-off timers like "Order in 3h for same-day processing".
- Add small pop-ups such as "Anna from NY just purchased" or "23 people are viewing this item".
- Advertise limited-run products with remaining quantity counters.
- Start a short reservation timer when items are added to the cart.
- Offer bonuses to the first 100 customers and show how many spots are left.
- Tie promotions to events/holidays (e.g., "Order before Friday for Father's Day delivery").
- Trigger exit-intent pop-ups warning "Sale ends tonight!" or offering a final code.
- Show queue positions or a waitlist to encourage immediate checkout.
- Offer free shipping for a short window with a countdown bar.
- Add progress bars toward goals like "Join the first 100 buyers".
- Let users opt in for notifications when a promotion is about to end.

