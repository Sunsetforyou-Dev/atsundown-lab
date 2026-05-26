# AtSundown FiveM Order Assistant

Node.js + Express web app and CLI tools for the AtSundown ready-made FiveM
script assistant.

## Features

- Chat assistant that answers from `knowledge/sundown_kb.txt`
- Gemini chat generation with `@google/genai`
- Gemini embeddings with in-memory cosine search
- Static HTML/CSS/JS UI with Light/Dark theme
- Product order form with price and feature preview
- Google Sheets order logging
- Telegram order notifications
- CLI caption generator, order agent, and morning report

## Products

- `sundown_syncobject` ราคา 1,000 บาท: ระบบจัดการแฟชั่นที่ดีที่สุด
- `sundown_discordjob` ราคา 500 บาท: ระบบเพิ่มยศใน Discord ตาม Job ในเซิฟ
- `sundown_deleteobj` ราคา 1,200 บาท: ลบแฟชั่นลอย ออโต้

## Setup

```bash
npm install
cp .env.example .env
```

Required environment variables:

- `GOOGLE_API_KEY`
- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_FILE` or `GOOGLE_SERVICE_ACCOUNT_JSON`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Optional environment variables:

- `PORT`, defaults to `3000`
- `GEMINI_CHAT_MODEL`, defaults to `gemini-2.5-flash`
- `GEMINI_EMBEDDING_MODEL`, defaults to `gemini-embedding-001`

If your existing `.env` still has `GEMINI_EMBEDDING_MODEL=text-embedding-004`
or `GEMINI_EMBEDDING_MODEL=gemini-embedding-2`, change it to
`gemini-embedding-001`.

Prepare the first row in Google Sheets:

```text
Timestamp, Discord, Script, Price, Details, Status
```

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## CLI

```bash
npm run caption -- --script "sundown_deleteobj" --price "1,200 บาท"
npm run agent
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
