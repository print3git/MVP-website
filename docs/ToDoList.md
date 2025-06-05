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
- [x] Insert a new `<p id="flash-discount">` element in `payment.html` below the existing quantity discount text.
- [x] Style the countdown message so it matches other notice text.
- [x] In `js/payment.js`, check `localStorage` for a `flashDiscountEnd` value on page load.
- [x] If none exists or it's expired, set `flashDiscountEnd` to five minutes from the current time.
- [x] Start a timer that updates the remaining time in `#flash-discount` every second.
- [x] When the timer reaches zero, remove the message and delete `flashDiscountEnd` from `localStorage`.
- [x] Apply a 5% discount during checkout while the timer is active.
- [x] Pass this discount along with the quantity discount to `createCheckout`.
- [x] Add a developer-only button or method to reset the timer for testing.

## Comprehensive Test Suite
- Add test for /api/progress streaming events until completion
- Add test for /api/my/models rejecting unauthenticated user
- Add test for /api/my/models returning models ordered by date
- Add test for /api/users/:username/models 404 when user missing
- Add test for /api/models/:id/like toggling like and unlike
- Add test for /api/models/:id/like rejecting unauthenticated user
- Add test for /api/community submission missing jobId
- Add test for /api/community requires user auth
- Add test for /api/community/recent pagination and category filter
- Add test for /api/community/popular sorting by likes then date
- Add test for /api/competitions/active returning upcoming comps
- Add test for /api/competitions/:id/enter prevents duplicate entry
- Add test for /api/competitions/:id/enter rejecting unauthenticated user
- Add test for /api/competitions/:id/entries leaderboard order
- Add test for /api/admin/competitions creation unauthorized
- Add test for /api/admin/competitions creation success
- Add test for /api/create-order rejecting unknown job
- Add test for /api/create-order applying discount argument
- Add test for /api/webhook/stripe invalid signature
- Add test for /api/webhook/stripe updating order and queueing print
- Add test for queue processing multiple items sequentially
- Add test for queue progress events reach 100%
- Add test for login page error display on failed login
- Add test for signup page error display on failed signup
- Add test for payment countdown timer expiration logic
