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


## Serving the Frontend Locally

`index.html` and `payment.html` use ES module scripts. When opened directly from
the filesystem (e.g. with a `file://` URL) the browser blocks these modules and
nothing loads. Run a lightweight web server in the repository root and open the
pages through `http://localhost` to avoid this issue. Two easy options are:

```bash
npx http-server      # Node.js
# or
python -m http.server
```

Then navigate to `http://localhost:8080/index.html` or
`http://localhost:8080/payment.html`.

## Profiles System Plan

1. Add a `users` table storing id, username, email, password hash, and timestamps.
2. Implement API endpoints for user registration and login with hashed passwords.
3. Add session or token-based authentication middleware.
4. Provide sign-up and sign-in forms on the frontend.
5. Associate generated models with the authenticated user's id.
6. Expose an API to list all models created by a user.
7. Build a profile page showing a user's models and like counts.
8. Allow viewing other users' profiles by id or username.
9. Create a `likes` table linking `user_id` and `model_id`.
10. Implement endpoints to like and unlike models.
11. Display like counts in the community gallery and profiles.
12. Use like counts to populate the "popular now" list.
13. Create a `competitions` table with name and date fields.
14. Add a `competition_entries` table linking models to competitions.
15. Expose APIs to submit models to competitions and fetch leaderboards.
16. Show active competitions and leaderboards on the frontend.
