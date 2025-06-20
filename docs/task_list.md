## Advertising & Landing

- A/B test ad designs and copy to identify highest-performing creatives.
- Target ads to demographics most likely to convert.
- Use retargeting pixels to bring back visitors who left.
- Include a clear value proposition and call-to-action in each ad.

## Purchase & Checkout

- Offer multiple payment methods including Apple Pay and Google Pay.

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

## 3D Model Loading Performance


Serve assets over HTTP/2 or HTTP/3.
Measure load times with Lighthouse or real browser tests and track improvements.


## Fulfillment Capacity Forecasting

- Graph forecasted demand vs. capacity in the admin panel.


## Hub Deployment Kit

- Preconfigure printers with SD images and calibration files.
- Bundle setup guides and monitoring scripts in each kit.
- Automate camera and network configuration on arrival.

## Printer Monitoring & Maintenance

- Stream camera feeds for all printers.
- Detect failed prints via computer vision and trigger reprints.
- Log maintenance events and schedule nozzle swaps.
- Alert when a printer's failure rate rises above threshold.

## Packaging Automation

- Feed finished prints into automated bagging machines.
- Connect bagged items to a boxing conveyor.
- Print and apply shipping labels automatically.

## Customer Service Automation

- Create a FAQ response bot for common queries.
- Issue goodwill coupons if service-level targets are missed.
- Escalate unresolved tickets to the founders.

## Marketplace & Licensing (Future)

- Build designer submission portal for new models.
- Validate uploaded STLs automatically.
- Implement revenue share and royalty tracking.
- Apply licensed models to the storefront automatically.

## Robotic Print Handling

- Install robotic arms to remove finished prints from beds.
- Integrate vision inspection for surface defects.
- Retry failed removals and log incidents.
- Place accepted prints on the bagging conveyor.

## Operator Management

- Provide secure login for remote operators.
- Display daily task checklists per hub.
- Record start and end times for each shift.
- Alert founders if tasks remain incomplete.

## Printer Control & Recovery

- Run periodic firmware updates over the network.
- Schedule automatic calibration prints.

## Inventory Monitoring & Restocking

- Integrate vendor API to place restock orders.
- Display inventory dashboard showing stock and delivery ETA.

## Predictive Maintenance

- Record nozzle temperature and print time metrics.
- Calculate mean time between failures per printer.
- Forecast next service date from usage hours.
- Schedule maintenance windows when printers are idle.
- Notify founders if predicted failure risk exceeds threshold.

## Remote Operator Onboarding

- Maintain a roster of approved remote operators.
- Provide a standard training checklist on signup.
- Allow assigning operators to hubs through the dashboard.
- Track completion of daily tasks per operator.
- Flag missing tasks for review.

## Printer Load Monitoring Enhancements

- Expose API endpoint for live printer metrics.
- Visualise utilisation trends in the dashboard.
- Trigger scaling alerts when sustained utilisation exceeds 80%.

## Procurement Automation Enhancements

- Track order acknowledgements and estimated arrival dates.
- Update dashboard with shipping status for each order.
- Flag overdue printer deliveries.

## Hub Deployment Automation

- Preload Raspberry Pi images on SD cards for printers.
- Mark the hub live after all printers pass a test print.

## Global Operations Reporting

- Email a weekly "state of company" PDF with key metrics.
- Highlight hubs with repeated errors or downtime.
- Archive all reports in cloud storage.

## Carrier Pickup Integration

- Schedule carrier pickups via API based on daily volume.
- Generate manifests for each pickup.
- Notify carriers automatically if volume increases.
- Track pickup confirmation or failures.

## Customer Communication Automation

- Include a tracking link in shipping confirmation.
- Offer automatic reprint if a print fails quality checks.
- Survey customers after delivery for feedback.

## Gifting Flow Integration

- Record `is_gift` metadata in Stripe checkout and send recipient claim email.
- Build recipient portal with magic-link login, 3D preview, edit controls and shipping tracker.
- Send lifecycle emails: gift notification, shipping updates and Day 30 upsell.
- Credit the sender if the recipient purchases within 60 days and log events to Segment/GA4.
- **Data & config**
  - Add nullable gifts table with order and recipient details.
  - Add `is_gift` boolean column to orders.
  - Expose `FeatureFlags.GIFTING` and add gifting email/portal env vars.
- **Backend endpoints**
  - POST `/gifts` to create gift orders and return a Stripe session id.
  - Handle Stripe webhook to insert gift rows when metadata flag is set.
  - POST `/gifts/:id/claim` for recipients to confirm shipping and personalisation.
  - GET `/users/:id/gifts/sent` and `/received` for dashboard history.
  - Queue worker to start print job and send confirmations after claim.
  - POST `/referral/redeem` to credit the sender for follow-on purchases.
- **Frontend components**
  - Gift button on product cards and `GiftModal` with recipient info and optional gift-wrap toggle.
  - Handle gift query param in checkout and render extra step.
  - `ClaimGiftPage` for magic-link flow and 3D editor.
  - Snackbar notification after adding a gift and redirect to Stripe.
  - Badge "Gifts (β)" in header behind feature flag.
  - Gift history tab under user profile.
- **UX / UI polish**
  - Update Figma with gifting CTA variants.
  - Define colour tokens `giftHighlight` and `giftAccent`.
  - Provide `gift.svg` and `arrow-send.svg` icons.
  - Microcopy: "We’ll email your friend a link to pick colours & delivery date (no address needed yet)."
- **Legal & policy**
  - Update Terms of Service with gifting section and data use.
  - Update privacy policy with lawful basis and deletion timeline.
- **Testing & QA**
  - Cypress happy path for gifting flow.
  - Unit test to reject claiming twice.
  - Jest snapshot for GiftModal states.
  - Email rendering tests across major clients.
  - Lighthouse checks for performance and layout shift.
- **Deployment & roll-out**
  - Monitor analytics before full rollout.
- **Additional ideas to keep UX clean while boosting gifting**
  - Provide preset gift message templates for quick sending.
  - Allow scheduling the gift email for a future date.
  - Offer a minimal gift-wrap upsell toggle in the modal.
  - Use subtle gift icons on product thumbnails instead of large banners.
  - A/B test concise versus detailed gift copy to avoid clutter.
