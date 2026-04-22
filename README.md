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
