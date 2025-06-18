## Advertising & Landing

- A/B test ad designs and copy to identify highest-performing creatives.
- Target ads to demographics most likely to convert.
- Use retargeting pixels to bring back visitors who left.
- Include a clear value proposition and call-to-action in each ad.
- Keep landing pages minimal with a single prominent "Start Generating" button.

## Analytics & Attribution

- Create `ad_clicks` table with columns `id`, `subreddit`, `session_id`, and `timestamp`.
- Add POST `/api/track/ad-click` to insert a row when a visitor arrives with an `sr` parameter.
- Create `cart_events` table storing `id`, `session_id`, `model_id`, `subreddit`, and `timestamp`.
- Record Add to Cart actions via POST `/api/track/cart`.
- Create `checkout_events` table with `id`, `session_id`, `subreddit`, `step`, and `timestamp`.
- Log events for checkout start and completion through POST `/api/track/checkout`.
- Implement GET `/api/metrics/conversion` to compute CTR, ATC, and checkout rates per subreddit.
- Add unit tests for the new endpoints and database logic.

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
  - Block checkout unless the quantity is even when paying with credits.
  - Add `weekly-reset.js` script to allocate new credits each Monday.
  - Schedule `npm run reset-credits` via cron.
- Send monthly reminder emails to subscribers encouraging them to use remaining prints.
  - Create `email_templates/reminder.txt` with a short message.
  - Implement `scripts/send-printclub-reminders.js` to dispatch the emails.
- Track sign‑ups and churn; A/B test pricing (£140 vs £160) and monitor ARPU.
  - Record join and cancel events in a new `subscription_events` table.
  - Add admin endpoint to report active members and churn.
  - Randomly assign visitors to pricing variants and store which one they saw.
- Offer a first‑month discount or referral credit to incentivize new subscribers.
  - Apply a one-time 10% discount when a referral code is present.
  - Display the discounted price on the sign-up form.

## Print Club

- Show remaining weekly credits at checkout and update after purchase.
- Deduct one credit when an order is placed using the subscription.
- Add `weekly-reset.js` script to grant new credits each Monday.
- Expose `npm run reset-credits` to run the reset script.
- Send reminder emails two days before unused credits expire.
- Record sign-up and cancellation events in `subscription_events` table.
- Display a "Manage subscription" button on the profile page linking to the Stripe customer portal.
- Add unit tests for credit deduction and weekly reset.

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

- Add a model for mailing list entries.
- Call the subscribe endpoint when new accounts are created.
- Call the subscribe endpoint during guest checkout.
- Implement GET `/api/unsubscribe` endpoint:
  - Look up the address by token.
  - Mark the address as unsubscribed.
- Schedule the sync script to run daily.
- Add unit tests for subscribe, confirm, unsubscribe, webhook handling and sync logic.

## Competitions Profit Drivers

- Show purchase buttons for past winners.
  - Add a "Buy Print" button below each winning model in `competitions.html`.
  - Pre-fill `print3Model` and `print3JobId` in local storage when the button is clicked.
- Offer a discount for printing your competition entry.
  - Generate a one-time code after an entry is submitted.
  - Display the code in the success message.
- Add "Order Print" button under each past winner card on the competitions page.
  - When clicked, open the model modal with the winner's model and job ID.
  - Save the model ID to localStorage when proceeding to checkout.
- After a user enters a competition, display a one-time discount code for printing their entry.
  - Provide `/api/competitions/:id/discount` endpoint to generate and return the code.
- Create a "Trending Prints" section at the bottom that fetches models from `/api/trending` and shows Add to Basket buttons.


## Competitions Engagement

- Show a countdown timer next to each active competition.
  - Include `deadline` in the competitions API response.
  - Update `competitions.js` to refresh the timer every second.
- Highlight winners with a short interview section.
  - Pull winner info from `/api/competitions/winners`.
  - Display image and quote below the winners list.
- Email users when a new competition opens or voting begins.
  - Add a subscribe checkbox on the competitions page.
  - Send notifications via `/api/competitions/notify`.
- Allow visitors to vote on entries.
  - POST votes to `/api/competitions/:id/vote`.
  - Show vote counts on each entry card.
- Rotate featured themes monthly.
  - Store a `theme` field in the competition record.
  - Display the current theme at the top of the page.
- Provide prize coupons to top entries.
  - Generate a coupon code when a winner is picked.
  - Email the prize code to the winner.
- Update the leaderboard in real time.
  - Poll `/api/competitions/:id/leaderboard` every minute.
  - Replace the leaderboard section with fresh data.
- Add an entry gallery grid.
  - Fetch entries from `/api/competitions/:id/entries`.
  - Show paginated thumbnails linking to the model modal.

## 3D Model Loading Performance

- Optimize the `.glb` file used on `index.html` and `payment.html`.
  - Remove unused meshes, nodes, and animations in a 3D tool.
  - Reduce polygon count and lower texture resolution.
  - Compress geometry with Draco or Meshopt and convert textures to KTX2/Basis.
  - Export the optimized model and update the viewer `src` attribute.
- Host the optimized model on a fast CDN or static server.
  - Upload the file and configure CORS.
- Send strong caching headers for the model and environment map.
  - Use hashed filenames and long `max-age` values.
- Use Level of Detail models, loading low poly first then swapping in higher quality.
- Compress and preload the environment map.
- Serve assets over HTTP/2 or HTTP/3.
- Measure load times with Lighthouse or real browser tests and track improvements.



## Social Sharing

- Add share icons to the library page.
  - Reuse the five-button block from `index.html` in `library.html` and load `share.js`.
- Expand `share.html` with the full set of networks.
  - Include Reddit, TikTok and Instagram buttons.
  - Add a "Copy Link" button using `navigator.clipboard`.
- Serve model snapshots when sharing.
  - Update `/shared/:slug` to return the `snapshot` from `jobs` and use it for `og:image`.
  - Display the snapshot while the model loads in `share.html`.
- Track share button usage.
  - Create a `share_events` table with columns `share_id`, `network` and `timestamp`.
  - POST `/api/track/share` from `share.js` whenever a button is clicked.
  - Add a unit test verifying share events are recorded.
- Add UTM parameters to all ad URLs.
- Capture UTM parameters in the session on landing.
- Store UTM and subreddit values with each order.
- Log page view, add to cart, and purchase events with session IDs.
- Pull daily spend and impressions from the Reddit Ads API.
- Compute views, CTR, add-to-cart rate, and checkout rate per subreddit.
- Record cost of goods sold for each pricing tier.
- Calculate profit per order and CAC metrics.
- Display aggregated profit by subreddit in an admin dashboard.
- Add unit tests covering profit calculations and data import.

## Automated Scaling Engine
- Fetch campaign performance hourly via cron.
- Compute marginal CAC per subreddit.
- Compare CAC to profit per sale with thresholds.
- Increase or decrease budgets via Reddit Ads API accordingly.
- Pause campaigns when CAC exceeds profit threshold.
- Log each budget change to a `scaling_events` table.
- Expose an admin endpoint listing recent scaling actions.

## Autonomous 3D Printing
- Create `print_jobs` table with order ID, printer ID, status, and G-code path.
- Monitor printer status via OctoPrint or Klipper API.
- Assign new jobs to idle printers automatically.
- Upload generated G-code and start printing.
- Update job status when printing completes via webhook.
- Slice STL/GLB files into G-code after order placement.
- Show printer queues and status on a dashboard.
- Notify operator when a printer requires manual clearing.

## AI Advert Generation
- Maintain JSON template library for ad text patterns.
- Generate ad copy variants using an LLM with subreddit context.
- Produce image thumbnails through a diffusion model API.
- Display proposed ads in an approval dashboard.
- Allow edits to copy or images before approval.
- Submit approved ads to Reddit Ads API automatically.
- Discover related subreddits via Reddit API to suggest new targets.
- Store approval or rejection events for each generated ad.

## Fulfillment Capacity Forecasting
- Summarize daily orders per location via a batch job.
- Estimate printer hours required from the order volume.
- Compare demand to available printer capacity.
- Alert via email when capacity is at risk.
- Graph forecasted demand vs. capacity in the admin panel.
## Distributed Printing Infrastructure
- Create unified tables for orders, printer hubs, printers, jobs, inventory and metrics.
- Poll each printer via OctoPrint to collect queue length, status and error codes.
- Store printer telemetry in the central database.
- Implement heartbeat checks to flag offline printers.
- Display per-printer status in the admin dashboard.

## Load Balancer & Routing
- Route new orders to the nearest hub based on customer location.
- Consider printer queue length and health when routing jobs.
- Overflow excess prints to secondary hubs automatically.
- Add unit tests verifying routing decisions.

## Scaling Triggers & Procurement
- Calculate average queue saturation per hub daily.
- Generate purchase orders when saturation stays above threshold.
- Email vendors with pre-filled printer order details.
- Integrate vendor APIs to place orders automatically.
- Schedule new hub deployment when regional demand exceeds capacity.

## Hub Deployment Kit
- Preconfigure printers with SD images and calibration files.
- Bundle setup guides and monitoring scripts in each kit.
- Build dashboard to assign operators and track shipments.
- Automate camera and network configuration on arrival.
- Record printer serial numbers and hub location.

## Operations Dashboard
- Show printer load, backlog and daily capacity per hub.
- Display printer errors and maintenance alerts.
- Summarize upcoming scaling triggers.
- Restrict access to founders only.

## Business Intelligence
- Aggregate CAC, ROAS and profit per subreddit.
- Graph daily profit and capacity utilisation.
- Email a weekly PDF summary to founders.
- Highlight anomalies in sales or printer uptime.

## Printer Monitoring & Maintenance
- Stream camera feeds for all printers.
- Detect failed prints via computer vision and trigger reprints.
- Log maintenance events and schedule nozzle swaps.
- Alert when a printer's failure rate rises above threshold.

## Packaging Automation
- Feed finished prints into automated bagging machines.
- Connect bagged items to a boxing conveyor.
- Print and apply shipping labels automatically.
- Track shipments through the carrier API.

## Customer Service Automation
- Create a FAQ response bot for common queries.
- Send automatic order status and delay notifications.
- Issue goodwill coupons if service-level targets are missed.
- Escalate unresolved tickets to the founders.

## Viral Referral System
- Generate referral links for each purchase.
- Record referred orders and credit rewards.
- Prompt customers to share photos with pre-filled captions.
- Auto-moderate shared content for policy violations.

## Legal & Accounting Automation
- Track revenue by country for tax calculations.
- Compute VAT or GST owed per region.
- Flag prohibited shipping destinations automatically.
- Export monthly accounting data for the accountant.

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
- Enable remote restart and shutdown commands.
- Run periodic firmware updates over the network.
- Schedule automatic calibration prints.
- Switch jobs to a backup printer on failure.
