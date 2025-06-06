# Mailing List Management

This project uses SendGrid via Nodemailer to send confirmation emails and other updates.
Email addresses are stored in the `mailing_list` table with a unique confirmation token.
Users can opt in on the signup and checkout forms. After opting in, a confirmation
message containing a link to `/api/confirm-subscription?token=...` is sent. Visiting
that link marks the address as confirmed.

Addresses are added to the `mailing_list` table only after a user has created an
account or completed checkout and the opt‑in box is checked. The frontend triggers
the `/api/subscribe` endpoint at that moment to queue the confirmation email.

To configure the email service, set `SENDGRID_API_KEY` and `EMAIL_FROM` in `.env`.
Subscriptions are processed through the `/api/subscribe` endpoint which inserts
or updates the address and dispatches the confirmation email.
