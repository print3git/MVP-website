## Advertising & Landing

- A/B test ad designs and copy to identify highest-performing creatives.
- Target ads to demographics most likely to convert.
- Use retargeting pixels to bring back visitors who left.
- Integrate pixel data with ad platform to build custom audiences.
- Include a clear value proposition and call-to-action in each ad.

## Hub Deployment Kit

- Preconfigure printers with SD images and calibration files.
- Bundle setup guides and monitoring scripts in each kit.
- Automate camera and network configuration on arrival.

## Printer Monitoring & Maintenance

- Stream camera feeds for all printers.
- Detect failed prints via computer vision and trigger reprints.
- Log maintenance events and schedule nozzle swaps.
- Alert when a printer's failure rate rises above threshold.

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

- **Secure login for remote operators**
  - Add `/operator/login` page with username and password fields.
  - Hash passwords with bcrypt and store them securely.
  - Issue JWT tokens in HTTP-only cookies.
  - Throttle login attempts.
  - Provide password reset workflow.

- **Daily task checklists per hub**
  - Create `operator_tasks` table with hub and date columns.
  - API `GET /hubs/:id/tasks/today` returns tasks for that hub.
  - Show tasks with checkboxes in the operator dashboard.
  - Mark tasks complete via `POST /tasks/:id/complete`.
  - Summarise hub progress in the admin dashboard.

- **Alerts for incomplete tasks**
  - Nightly job checks for tasks not completed by shift end.
  - Send Slack or email alerts to founders.
  - Show unresolved tasks in the admin panel.

- **Additional safeguards**
  - Implement optional two-factor authentication for operators.
  - Log login attempts and task completions for auditing.
  - Provide interface to schedule future operator shifts.

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

## Carrier Pickup Integration

- Schedule carrier pickups via API based on daily volume.
- Generate manifests for each pickup.
- Notify carriers automatically if volume increases.
- Track pickup confirmation or failures.

## Customer Communication Automation

- Generate tracking URLs via the shipping API when orders dispatch.
- Automatically create a reprint order when quality checks fail.
- Notify customers about the reprint with an updated arrival estimate.
- Log reprint events for reporting and analytics.
- Store survey responses in the database and surface metrics on the dashboard.
- Reintroduce next-day delivery countdown on the site when logistics allow.

## Gifting Flow Integration

- Build recipient portal with magic-link login, 3D preview, edit controls and shipping tracker.
- Credit the sender if the recipient purchases within 60 days and log events to Segment/GA4.
- **Data & config**
  - Expose `FeatureFlags.GIFTING` and add gifting email/portal env vars.
- **Backend endpoints**
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

## Increasing print2 pro subscriptions

- **Pricing incentives**
  - Family or group tiers – discounted rates for multiple members under one plan.
  - Loyalty discounts – reduce the price or grant bonus prints for members who reach milestones (3-month, 6-month, 1-year).
  - Upgrade credits – allow unused credits to roll over or convert into higher-tier prints after a period.
  - Pause functionality – let members pause their subscription for a short time without canceling.
  - "Founders rate" – limited-time, lifetime pricing for early adopters.

- **Exclusive content & features**
  - "Print of the Week" specials – curated weekly designs only available to members.
  - Limited-edition runs – exclusive prints that are never offered to non-members.
  - Digital extras – provide STL files, wallpapers, or design behind-the-scenes content.
  - Priority printing – members' orders jump the queue for faster turnaround.
  - Member-only giveaways – occasional free extras such as filament samples or display stands.
  - Time Capsule prints – monthly or quarterly themed prints available only to continuing members.
  - Livestreaming your print being created.

- **Community building**
  - Members-only forum or Discord for discussion and sharing.
  - Featured member spotlights showcasing subscriber creations.
  - Monthly design challenges with member voting.
  - In-person or virtual meetups.
  - Badge system on profiles.

- **Referral and affiliate programs**
  - Referral points that credit members for bringing in new subscribers.
  - Social sharing incentives for posting referral links.
  - Affiliate partnerships offering commissions to influencers or partners.

- **Marketing & promotion**
  - Retargeted ads reminding past visitors about the club.
  - Email drip campaigns highlighting perks and success stories.
  - Testimonials and user-generated content.
  - Limited-time countdown banners to create urgency.
  - Cross-promotion with competitions.
  - Bundled deals with other offerings.

- **Service and support enhancements**
  - Dedicated support channel for club members.
  - Printed instructions and tips in shipments.
  - Shipping perks such as free or faster delivery.
  - Quality guarantee with free reprints if needed.

- **Operational / technical improvements**
  - Auto-renew reminders before billing.
  - Usage progress bar to track available prints.
  - Personalized recommendations based on past orders.
  - Mobile app with push notifications.
  - Integrated wish list to remember desired prints.
  - One-click reorder of past favorites.
  - API access for makers to integrate uploads.

- **Long-term engagement ideas**
  - Subscription anniversary gifts.
  - Member surveys to gather feedback.
  - Customizable print options such as colors or sizes.
  - Points for interaction in forums or reviews.
  - Collaborations with design artists for exclusive models.

- **Partnerships & cross-industry tie-ins**
  - Educational partners like schools or maker spaces.
  - Hardware bundles offering a printer plus membership.
  - Filament manufacturer collaborations with special colors.
  - Charity collaborations donating a portion of fees.

- **Content & media strategies**
  - Behind-the-scenes videos of the printing process.
  - Livestream design sessions.
  - Printable accessory packs as digital files.
  - Guest artist series with new designers each month.

- **Stability & trust**
  - Transparent credit tracking and rollover.
  - Money-back guarantee for new members.
  - Clear terms of service.

## Seller Credits

- Add migration introducing a table or column for `sale_credits` tied to `user_id`.
- Implement `getSaleCredit` and `adjustSaleCredit` helpers in the backend.
- Award sellers £5 credit in the checkout webhook when a job is paid.
- Provide `GET /api/credits` and `POST /api/credits/redeem` endpoints.
- Display credit balance on profile pages and allow applying credit at checkout.
- Add Jest tests for credit accrual and redemption.
- Document the feature in the README.

## Community Gamification & Loyalty

- Show a dynamic reward badge on navigation that loads points from `/api/rewards`.
- Allow redeeming points for discount codes via `/api/rewards/redeem`.
- Track referral clicks and signups through the referral link endpoints.
- Send competition and reward updates via the mailing list workflow.
- Expand leaderboards, badges and monthly challenges on community pages.

## Add-ons Page & Post-Purchase Flow

- Send follow-up emails after purchase to promote accessories.
- Automate STL merging for accessories so no manual design work is needed.
- Provide micro personalisation nudges like small props and texture tweaks.
- Plan future expansions such as accessory subscriptions and creator uploads.
- Track add-on performance to refine marketing and bundle offers.
- Keep fulfilment simple by printing merged models without extra steps.
