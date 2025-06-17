# To Do: Increase Profit from Competitions Page

1. **Premium Membership Upsell**
   - [ ] Insert a "Go Premium" banner on `competitions.html` linking to `signup.html?plan=premium`.
   - [ ] Track clicks using a new `/api/metrics/premium-click` POST endpoint.
   - [ ] Style the banner with Tailwind classes consistent with existing design.

2. **Marketplace Links on Leaderboard**
   - [ ] Display a "Buy Model" link beside each leaderboard entry in `js/competitions.js`.
   - [ ] Link to `/payment.html?model_id=XYZ` for the given model.
   - [ ] Send click events to `/api/metrics/model-purchase-click`.

3. **Ad Slot Integration**
   - [ ] Add a rotating ad container below the header in `competitions.html`.
   - [ ] Load ads from `/api/ads/competitions` via `js/competitions.js`.
   - [ ] Record impressions and clicks with `/api/metrics/ad`.

4. **Email Capture Form**
   - [ ] Embed a small form at the bottom of the page inviting visitors to receive competition updates.
   - [ ] Create backend route `/api/newsletter/signup` accepting POST email.
   - [ ] Validate email format client-side and server-side, show success message on completion.

5. **Boosted Entries for a Fee**
   - [ ] Add "Boost your entry" button in the entry modal linking to Stripe checkout.
   - [ ] On payment success, mark entry as boosted via `/api/competitions/:id/boost`.
   - [ ] Display boosted entries at the top of the leaderboard with a badge.

6. **Sponsor Competitions**
   - [ ] Allow creation of competitions tied to purchasing a sponsor product.
   - [ ] Add `type: 'sponsored'` field in competition schema and migrate DB.
   - [ ] Show purchase requirement and verify purchase via `/api/purchases/verify` before allowing entry.

7. **Tip-Based Voting**
   - [ ] Provide a "Tip" button on each entry card which opens a Stripe payment modal.
   - [ ] POST tip data to `/api/competitions/:id/tip` and update displayed totals.
   - [ ] Show total tips collected next to likes.

8. **Merchandise Cross-Sell**
   - [ ] Add promo section advertising limited edition merch related to current competitions.
   - [ ] Link to `/store.html` and track clicks via `/api/metrics/merch-click`.
   - [ ] Use countdown timer to indicate when merch offer ends.

9. **3D Printing Service Upsell**
   - [ ] Add "Get this printed" button next to entry images linking to `payment.html?service=print`.
   - [ ] Provide pre-filled model data to the printing service page.
   - [ ] Track conversions with `/api/metrics/print-service`.

10. **Post-Entry Upgrade Modal**
   - [ ] After submitting an entry, show modal suggesting upgrade to premium for extra features.
   - [ ] Offer one-click upgrade via existing subscription API.
   - [ ] Record dismiss and accept actions using `/api/metrics/upgrade-prompt`.
