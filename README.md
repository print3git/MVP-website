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
- `STRIPE_PUBLISHABLE_KEY` – publishable key for Stripe.js on the frontend.
- `STRIPE_WEBHOOK_SECRET` – signing secret for Stripe webhooks.
- `HUNYUAN_API_KEY` – key for the Hunyuan3D API.
- Optional: `PORT` and `HUNYUAN_PORT` to override the default ports.
- Optional: `HUNYUAN_SERVER_URL` if your Hunyuan API runs on a custom URL.

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

5. (Optional) Run the purchase reminder job periodically:

   ```bash
   npm run send-reminders  # inside backend/
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

## Uploading Reference Images

Images can be added via drag-and-drop in the generator page. Dropping one or more files opens a cropping dialog powered by Cropper.js allowing you to trim each image before upload.

## User Profiles API

Two new routes expose profile information:

- `GET /api/profile` – retrieve the currently authenticated user's profile.
- `GET /api/users/:username/profile` – fetch a public profile for any user.

Profiles are stored in the `user_profiles` table. After pulling the latest code
run the migration to create this table:

```bash
cd backend
npm run migrate
```

### One-Click Checkout

The model viewer page includes a **Buy Now** button for fast purchasing. When a
logged-in user has shipping details saved in their profile, clicking **Buy Now**
submits the order immediately and redirects to the Stripe checkout page.

### Drag-and-Drop Image Uploads

Users can drag and drop image files onto the upload area on `index.html`. A
cropping modal powered by [Cropper.js](https://github.com/fengyuanchen/cropperjs)
lets users resize their images to a square preview before the files are uploaded
to the server. The same modal appears when browsing for files via the standard
file picker.

## Sharing API

Models can be shared publicly via unique slugs.

- `POST /api/models/:id/share` – create a share link for a model.
- `GET /api/shared/:slug` – retrieve metadata for a shared model.
- Visiting `/shared/:slug` returns an HTML page with Open Graph meta tags that
  redirect to `share.html` for viewing.

## Contributing

We welcome pull requests! Please fork the repo and create a topic branch. Ensure `npm test` runs clean before submitting.
Run `npm run test-ci` for the same tests using a single process, which matches the CI configuration.
Run `npm run format` in `backend/` to apply Prettier formatting before committing.
For significant changes, please open an issue first to discuss what you would like to change. Be sure to follow the code style enforced by Prettier.

## ToDo List

All open tasks are tracked in [docs/task_list.md](docs/task_list.md).
