# Stripe Webhook

To forward events to the local development server:

```
stripe listen --forward-to localhost:3000/stripe/webhook
```

To simulate a checkout completion event:

```
stripe trigger checkout.session.completed
```
