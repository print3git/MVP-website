# MVP Website

This repository contains the early MVP code for print2's website and backend.

- Frontend HTML pages are in the repository root.
- General backend code is in the `backend/` folder.
- The lightweight Hunyuan3D API server lives in `backend/hunyuan_server/`.
- The `img/` folder is now reserved strictly for image assets.

## Local Setup

1. Copy `.env.example` to `.env` in the repository root and update the values:
   - `DB_URL` – connection string for your PostgreSQL database.
   - `STRIPE_SECRET_KEY` – secret key from your Stripe dashboard.
   - `STRIPE_WEBHOOK_SECRET` – signing secret for Stripe webhooks.
   - `HUNYUAN_API_KEY` – key for the Hunyuan3D API.
   - Optional: `PORT` and `HUNYUAN_PORT` to override the default ports.

2. Install dependencies for both servers:

   ```bash
   cd backend && npm install
   cd hunyuan_server && npm install
   ```

3. Initialize the database:

   ```bash
   cd ..
   npm run init-db
   ```

4. Start the servers in separate terminals:

   ```bash
   npm start            # inside backend/
   cd hunyuan_server && npm start  # inside backend/hunyuan_server/
   ```

