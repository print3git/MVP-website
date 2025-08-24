# Regression Test Plan

## Backend

- **Unit**
  - `computeTaxOwed` returns correct VAT and handles invalid input.
- **Integration**
  - `POST /api/models` succeeds with valid payload.
  - `POST /api/models` rejects invalid payloads.

## Frontend

- `CheckoutForm` switches to manual address entry and accepts user input.

## End-to-End

- Signup page renders expected heading.
- Navigating to a missing page yields HTTP 404.

## CI

- Workflow files exist under `.github/workflows`.
- `.env.example` includes required DB variables.

## Ownership

- QA team maintains regression tests.
- Changes reviewed by full-stack test architect.
