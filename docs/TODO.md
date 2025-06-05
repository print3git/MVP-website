# Project TODO

This file consolidates outstanding tasks for the MVP website. Completed items have been removed.

## Clickthrough Rate Optimization
### Advert to Landing
- A/B test ad designs and copy to identify highest-performing creatives.
- Target ads to demographics most likely to convert.
- Use retargeting pixels to bring back visitors who left.
- Include a clear value proposition and call-to-action in each ad.

### Landing to Prompt
- Keep landing pages minimal with a single prominent "Start Generating" button.
- Offer social login and guest mode so users can begin without account friction.
- Provide a few example prompts to inspire new visitors.

### Prompt to Generation
- Validate prompts client-side to prevent submission errors.
- Show a short tooltip explaining how to craft a good prompt.
- Display trending prompts or community examples for inspiration.

### Generation to Purchase
- Show a real-time progress bar and estimated wait time while the model renders.
- Allow users to continue browsing or editing the prompt without losing progress.
- Present a 3D viewer with clear "Buy Now" and "Edit" options once generation completes.
- Enable one-click purchase using saved payment/shipping details.
- Offer multiple payment methods including Apple Pay and Google Pay.
- Automatically calculate and display shipping cost and delivery ETA before checkout.
- Send a reminder email if a user generates a model but doesn't purchase.
- Provide incentives like discounts or credits for the first order.

### Community Prints
- Surface other users' models on profile pages with an option to buy prints.
- Let creators mark their models as publicly sellable or private.
- Record each purchase in the buyer's order history for reordering and tracking.

## Front-End
- Ensure accessibility with ARIA labels and contrast.
  - Audit pages for missing labels.
  - Fix color contrast issues.
- Add drag-and-drop image uploads with inline cropping and resizing.
  - Implement a drag-and-drop area.
  - Integrate a client-side cropping library.
- Display clear inline error messages if generation fails or the prompt is invalid.
  - Provide failure states in the UI.
  - Validate prompts before submission.
- Integrate social login (Google, GitHub) and allow guest checkout without creating an account.
  - Add Google OAuth login.
  - Add GitHub OAuth login.
  - Offer guest checkout option.
- Automatically prefill shipping and payment details from the user's profile.
  - Retrieve saved profile info from the backend.
  - Populate the checkout form with the saved data.
- Offer a one-click "Buy Now" button directly on the model viewer page.
  - Add a button that uses saved details.
  - Submit the order in one step.
- Let users edit the prompt or images without losing the current model.
  - Re-run generation only when edits are confirmed.
- Ensure all interactions work smoothly on mobile with responsive layouts.
  - Add responsive CSS for each page.
  - Test flows at mobile breakpoints.
- Make keyboard navigation and screen reader labels first-class.
  - Define a consistent tab order.
  - Add missing ARIA labels.
- Provide a "reorder" button for past models so users can purchase again instantly.
  - Add a button to order history.
  - Preload the model into the cart.
- Show estimated print cost and delivery time before checkout.
  - Calculate cost and ETA from model parameters.
  - Display them near the checkout button.
- Let users share a generated model to the community or social media with one click.
  - Provide Open Graph meta tags for previews.
  - Implement GET /api/shared/:slug endpoint to fetch shared model metadata.
- Provide tooltips or a short tutorial overlay explaining each step.
  - Design tooltip copy and dismiss logic.
  - Allow users to skip the tutorial.
- Add a progress indicator at the top summarizing "Prompt → Model → Buy."
  - Display the current step at all times.
- Optimize API requests to reduce loading time on slow networks.
  - Bundle multiple requests where possible.
- Save user preferences such as units or color scheme.
  - Persist preferences to local storage.
  - Apply them on page load.

## Testing & CI
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

## Profiles & Competitions
- Update the admin UI to edit prize details.
- Create a competition submission form allowing a user to link an existing model to a competition.
- Build the form UI and validation.
- POST the selected model to the competition entry API.

## Referral System
- Design a referral rewards page and sharing links.
