# Celavive Spa Party Registration

This is a local Node.js web app for registering attendees in your Celavive Spa Party and saving them to a Google Sheet.

## What it does

- Runs locally on your computer
- Shows a modern, mobile-friendly registration form
- Collects:
  - Full Name
  - Birthday
  - Mobile Number
  - Email Address
  - Address
  - Profession
- Saves each registration to a `Registrations` sheet in your Google Spreadsheet

## Run locally

1. Copy `.env.example` to `.env`
2. Fill in:
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_FILE`
3. Put your Google service account JSON file in the project folder
4. Start the app:

```bash
npm start
```

5. Open:

```text
http://127.0.0.1:8080
```

## Google Sheets setup

1. Create a Google Cloud service account
2. Enable the Google Sheets API for that project
3. Download the service account JSON key
4. Share your target Google Sheet with the service account email as an editor
5. Set the sheet ID and JSON path in `.env`

Example `.env`:

```bash
PORT=8080
GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_FILE=./service-account.json
```

## Deploy to Netlify

1. Deploy the repo to Netlify.
2. In Netlify site settings, add these environment variables:
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_JSON`
3. For `GOOGLE_SERVICE_ACCOUNT_JSON`, paste the full service account JSON as a single-line JSON string, or use a base64-encoded version of that JSON.
4. Netlify will serve the static files from `public/` and route `/api/*` to the serverless function automatically through `netlify.toml`.

If the homepage shows a 404 on Netlify, it usually means the site was deployed before `netlify.toml` was added or the publish directory was not set to `public`.

## Notes

- If Google Sheets is not configured yet, the app still opens locally but submissions will show a setup message.
- The app automatically creates a `Registrations` tab if it does not exist.
- The header row is added automatically the first time the app writes to the sheet.

## Special Events (build your own form)

Pick **Special Event** as the event type to name the event yourself — GeneSys Circle,
GeneSys Anniversary, Awarding Night, anything — and build its form block by block.

Available blocks:

- Short answer, paragraph, email, mobile number, number, date, time
- Multiple choice, checkboxes, dropdown, poll (all with your own options)
- Rating scale (1 to 3, 5, 7, or 10)
- Photo upload — the respondent attaches a photo (max 3 per form)
- Section heading (text only)
- Image (display) — a picture *you* show on the form

You can also upload a **header photo** in the form builder to replace the default
GeneSys photos at the top of your public form.

Multiple choice and checkbox blocks can offer an "Other" box. Every question can be
marked required.

A Special Event publishes one public page at `/special-event/<slug>` plus its QR code.
It does not create RSVP or attendance pages.

Responses land in their own sheet/table named after the event, one column per question.
You can keep editing the form after it goes live: **renaming or deleting a question never
touches answers already collected** — the old column stays put and new questions are
appended as new columns. Use the *Accept new responses* toggle to close the form.

Photos are shrunk in the browser before upload, both the ones you add to the form and
the ones respondents submit. Submitted photos are stored one per table and referenced
from the response row by id, so opening the response log never downloads every picture —
click **View photo** on a row to fetch just that one.

Form images are stored in a separate per-event table, so the event record itself stays
small and the dashboard stays fast.

Note: `lib/platform.js` is loaded once at boot, so **restart `npm start` after pulling
changes**. A stale server shows errors like `Block 4 uses an unsupported type`.

## Email setup (Gmail)

Payment QR emails, payment confirmations, and password resets all send through Gmail
using an **app password** (not your normal Gmail password).

1. Turn on 2-Step Verification at <https://myaccount.google.com/security>
2. Go to <https://myaccount.google.com/apppasswords>
3. Create an app password named e.g. `GeneSys Events` and copy the 16 characters
4. Add to `.env` (and to Netlify environment variables when deployed):

```bash
GMAIL_USER=yourname@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
EMAIL_FROM_NAME=GeneSysPH Events
```

5. Restart the app

Until this is set, nothing is emailed: the app logs a warning and carries on, so
form entries and payments are still recorded. Gmail allows roughly 500 emails a day.

## Collecting payments on a Special Event

Open the event, scroll to the **Form builder**, and turn on
*Ask for payment after the form is submitted*. Set the amount, tick the methods you
accept, and upload your GCash QR (in GCash: **QR** → save or screenshot your personal QR).

What the respondent sees:

1. They fill in and submit the form — the entry is saved immediately
2. Step 2 appears: pick a payment method, enter an email address
3. Your QR, the amount, and a unique reference code such as `AB12-CD34` appear on
   screen and are emailed to them

What you do:

1. Check your GCash app for the payment (the reference code is in the payment notes)
2. Open the response log and press **Mark Paid** on that row
3. That sends their confirmation email and flips the row to Paid

**Payments are not confirmed automatically.** GCash has no way to tell this app that
money arrived, so the *Mark Paid* step is a real decision you make after seeing the
payment. Only an integrated gateway (PayMongo, Xendit) could confirm automatically,
and that needs a merchant account and per-transaction fees.

## Firebase / Firestore backend

The app can use Firestore as the primary backend instead of Google Sheets.
This is better for higher traffic because submissions are saved to a database first.

Add these variables to `.env` locally, and to Netlify environment variables when deployed:

```bash
DATA_BACKEND=firebase
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_SERVICE_ACCOUNT_FILE=./usana-bc-tracker-signup-7153d529ad39.json
AUTH_SECRET=use_a_long_random_secret_here
```

You may also use `FIREBASE_SERVICE_ACCOUNT_JSON` instead of a file path on Netlify.
The Firebase service account must have Firestore read/write access.

For Netlify Functions, prefer the smaller split-key format to avoid AWS Lambda's 4KB environment variable limit:

```bash
DATA_BACKEND=firebase
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
AUTH_SECRET=use_a_long_random_secret_here
```

When using the split-key format, remove `FIREBASE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SERVICE_ACCOUNT_JSON`, and `GOOGLE_SHEET_ID` from Netlify unless you still need Google Sheets there.

### Migrate existing Google Sheets data to Firebase

Before switching live traffic, keep your Google Sheets variables in `.env` too:

```bash
GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_FILE=./usana-bc-tracker-signup-7153d529ad39.json
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_SERVICE_ACCOUNT_FILE=./usana-bc-tracker-signup-7153d529ad39.json
```

Then run:

```bash
npm run migrate:firebase
```

After the migration prints the copied sheet names and row counts, set:

```bash
DATA_BACKEND=firebase
```

Restart the app. Google Sheets can stay configured as a backup/export source, but new live reads and writes will use Firebase.
