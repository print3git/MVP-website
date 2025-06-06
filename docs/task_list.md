# Project Task List

This consolidated list merges all outstanding tasks from the previous to-do documents.

## Advertising & Landing

- A/B test ad designs and copy to identify highest-performing creatives.
- Target ads to demographics most likely to convert.
- Use retargeting pixels to bring back visitors who left.
- Include a clear value proposition and call-to-action in each ad.
- Keep landing pages minimal with a single prominent "Start Generating" button.
- Offer social login and guest mode so users can begin without account friction.
- Provide a few example prompts to inspire new visitors.
- Prefill the prompt box with the last prompt or a suggested one.

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

- Validate prompts client-side to prevent submission errors.
- Display trending prompts or community examples for inspiration.
- Show a real-time progress bar and estimated wait time while the model renders.
- Allow users to continue browsing or editing the prompt without losing progress.
- Let users edit the prompt or images without losing the current model.
  - Keep the previous model in memory.
  - Re-run generation only when edits are confirmed.

## Purchase & Checkout

- Present a 3D viewer with clear "Buy Now" and "Edit" options once generation completes.
- Enable one-click purchase using saved payment/shipping details.
- Offer multiple payment methods including Apple Pay and Google Pay.
- Automatically calculate and display shipping cost and delivery ETA before checkout.
- Send a reminder email if a user generates a model but doesn't purchase.
- Provide incentives like discounts or credits for the first order.
- Automatically prefill shipping and payment details from the user's profile.
  - Retrieve saved profile info from the backend.
  - Populate the checkout form with the saved data.
- Offer a one-click "Buy Now" button directly on the model viewer page.
  - Add a button that uses saved details.
  - Submit the order in one step.
- Show estimated print cost and delivery time before checkout.
  - Calculate cost and ETA from model parameters.
  - Display them near the checkout button.

## Community & Sharing

- Surface other users' models on profile pages with an option to buy prints.
- Let creators mark their models as publicly sellable or private.
- Record each purchase in the buyer's order history for reordering and tracking.
- Let users share a generated model to the community or social media with one click.
  - Provide Open Graph meta tags for previews.
  - Implement GET /api/shared/:slug endpoint to fetch shared model metadata.

## Profiles & Competitions

- Update the admin UI to edit prize details.
- Create a competition submission form allowing a user to link an existing model to a competition.
- Build the form UI and validation.
- POST the selected model to the competition entry API.

## User Experience & Accessibility

- Ensure accessibility with ARIA labels and contrast.
  - Audit pages for missing labels.
  - Fix color contrast issues.
- Display clear inline error messages if generation fails or the prompt is invalid.
  - Provide failure states in the UI.
  - Validate prompts before submission.
- Ensure all interactions work smoothly on mobile with responsive layouts.
  - Add responsive CSS for each page.
  - Test flows at mobile breakpoints.
- Make keyboard navigation and screen reader labels first-class.
  - Define a consistent tab order.
  - Add missing ARIA labels.
- Optimize API requests to reduce loading time on slow networks.
  - Bundle multiple requests where possible.
- Save user preferences such as units or color scheme.
  - Persist preferences to local storage.
  - Apply them on page load.

## Testing & Continuous Integration

- Add unit tests for frontend scripts.
  - Write tests for each UI module.
- Add test for /api/my/models returning models ordered by date.
- Add test for /api/community requires user auth.
- Add test for /api/community/recent pagination and category filter.
- Add test for /api/competitions/active returning upcoming comps.
- Add test for /api/competitions/:id/enter prevents duplicate entry.
- Add test for /api/competitions/:id/enter rejecting unauthenticated user.
- Add test for /api/competitions/:id/entries leaderboard order.
- Add test for /api/admin/competitions creation unauthorized.
- Add test for /api/create-order rejecting unknown job.
- Add test for /api/webhook/stripe invalid signature.
- Add test for queue processing multiple items sequentially.
- Add test for queue progress events reach 100%.
- Add test for payment countdown timer expiration logic.
- Write a unit test to validate the countdown expiration logic.

## Mailing List

- Decide on the signup trigger for collecting emails.
- Sync the database with the mailing service automatically.
- Provide an unsubscribe link in every email.
- Test the full signup and confirmation flow end-to-end.
- Monitor bounces and unsubscribes to keep the list clean.

## Creating urgency

- Implement countdown timers for limited-time offers.
- Show dynamic "Only X left" or "Selling fast" notices.
- Implement short-lived discounts with visible expiration timers.
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
- Implement a one-click "Buy Now" checkout option to reduce friction.
