# Discount Codes

The backend supports promotional codes that reduce the price of an order.
Each code is stored in the `discount_codes` table with the following fields:

- `code` – unique text identifier shown to customers
- `amount_cents` – discount amount in cents
- `expires_at` – optional expiration time
- `max_uses` – how many times the code can be redeemed
- `uses` – number of times the code has been used

Codes can be created manually in the database or via a future admin UI.
