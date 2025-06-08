# Multi-Item Checkout Plan

These tasks outline the minimal steps to support buying several prints at once with as little friction as possible.

## Backend

1. **Create `cart_items` table** – store `user_id`, `job_id` and `quantity` for each item being prepared for checkout.
2. **Create `order_items` table** – link each paid order to the individual jobs and quantities purchased.
3. **Add helper functions in `db.js`** for inserting, updating and fetching cart and order items.
4. **Expose REST endpoints**:
   - `POST /api/cart/items` to add a job to the cart.
   - `PATCH /api/cart/items/:id` to change quantity.
   - `DELETE /api/cart/items/:id` to remove an item.
   - `GET /api/cart` to list all current cart items for the user.
5. **Implement `POST /api/cart/checkout`** – create a Stripe session containing every cart item and clear the cart on success.
6. **Write unit tests** covering each new route to guarantee expected behaviour.

## Frontend

7. **Add an "Add to Cart" button** next to the current "Buy Now" option in the model viewer.
8. **Show a cart icon with item count** in the page header that links to the cart page or drawer.
9. **Build a simple cart page/panel** listing each selected model, its quantity and a remove option.
10. **Fetch cart contents on page load** and keep the count in sync after any change.
11. **Provide a "Checkout All" button** on the cart view that calls `/api/cart/checkout` and redirects to Stripe.
12. **Clear the cart and confirm success** when returning from Stripe after payment.
13. **Store cart items in `localStorage` for guests** and merge them with the server cart once the user logs in.
14. **Verify the entire flow with manual smoke tests** ensuring no step blocks the buyer.
