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


## Comprehensive Test Suite
- Add test for /api/my/models returning models ordered by date
- Add test for /api/community requires user auth
- Add test for /api/community/recent pagination and category filter
- Add test for /api/competitions/active returning upcoming comps
- Add test for /api/competitions/:id/enter prevents duplicate entry
- Add test for /api/competitions/:id/enter rejecting unauthenticated user
- Add test for /api/competitions/:id/entries leaderboard order
- Add test for /api/admin/competitions creation unauthorized
- Add test for /api/create-order rejecting unknown job
- Add test for /api/webhook/stripe invalid signature
- Add test for queue processing multiple items sequentially
- Add test for queue progress events reach 100%
- Add test for payment countdown timer expiration logic
