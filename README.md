# AtSundown FiveM Order Assistant

Node.js + Express web app and CLI tools for the AtSundown ready-made FiveM
script assistant.

## Features

- Chat assistant that answers from `knowledge/sundown_kb.txt`
- Gemini chat generation with `@google/genai`
- Gemini embeddings with in-memory cosine search for the knowledge base
- Static HTML/CSS/JS UI for chat and script orders
- Order logging to Google Sheets
- Telegram notification for new orders
- CLI caption generator
- CLI action parser for submitting script orders
- CLI morning sales report to Telegram

## Setup

1. Install dependencies.

```bash
npm install
```

2. Create `.env` from `.env.example`.

```bash
cp .env.example .env
```

3. Set environment variables.

- `GOOGLE_API_KEY` for Gemini
- `GOOGLE_SHEETS_ID` for the Google Sheet that stores orders
- `GOOGLE_SERVICE_ACCOUNT_FILE` or `GOOGLE_SERVICE_ACCOUNT_JSON` for service account credentials
- `TELEGRAM_BOT_TOKEN` for the Telegram bot
- `TELEGRAM_CHAT_ID` for the Telegram recipient
- `PORT` optional, defaults to `3000`
- `GEMINI_CHAT_MODEL` optional, defaults to `gemini-2.5-flash`
- `GEMINI_EMBEDDING_MODEL` optional, defaults to `gemini-embedding-001`

If your existing `.env` still has `GEMINI_EMBEDDING_MODEL=text-embedding-004`
or `GEMINI_EMBEDDING_MODEL=gemini-embedding-2`, remove it or change it to
`gemini-embedding-001`.

4. Prepare the first row in Google Sheets.

```text
Timestamp, Discord, Script, Price, Details, Status
```

If the first row is empty, the app creates the header automatically on the first
order submission.

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## CLI

Generate promotional captions.

```bash
npm run caption -- --script "HUD Script" --price "590 บาท"
```

Run the interactive Demi order agent.

```bash
npm run agent
```

Send yesterday's sales report to Telegram.

```bash
npm run morning-report
```

The morning report reads Google Sheets columns named:

```text
Date, Menu, Qty, Total
```

## API

- `GET /health`
- `GET /api/scripts`
- `POST /api/chat` with `{ "message": "..." }`
- `POST /api/orders` with `{ "discord": "...", "script": "...", "details": "..." }`

## Test

```bash
npm test
```

## Knowledge Base

Edit product information, pricing, FAQ, and contact details in
`knowledge/sundown_kb.txt`.

## Legacy Python

The previous Python implementation is kept in `legacy-python/` for reference
only. The active runtime is Node.js.
