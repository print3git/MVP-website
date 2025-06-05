# Flash Discount Banner Design Steps

This document outlines a high level approach for implementing an eye-catching countdown banner on `payment.html`.

1. **Research modern banner designs**
   - Look at popular ecommerce sites for inspiration.
   - Note color palettes and animation ideas.
2. **Draft the HTML structure**
   - Insert a `<div id="flash-banner">` container above the main content.
   - Include a `<span id="flash-timer">` placeholder for the countdown text.
3. **Apply vibrant styling**
   - Use a teal‑to‑cyan gradient background.
   - Make the text bold with high contrast.
   - Ensure the banner spans the full width.
4. **Implement the countdown logic in `js/payment.js`**
   - Start from a five‑minute timer stored in localStorage.
   - Update the minutes and seconds every second.
   - Hide the banner when the timer ends.
5. **Add accessibility features**
   - Provide `role="status"` so screen readers announce updates.
   - Ensure the color contrast ratio meets WCAG guidelines.
6. **Write automated tests**
   - Verify the countdown reaches zero at the correct time.
   - Confirm the banner disappears when the timer finishes.
7. **Refine the visuals**
   - Test on mobile breakpoints.
   - Adjust spacing and animations for a polished look.
