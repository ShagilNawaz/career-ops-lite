# Career Ops Lite v2 — Setup Guide

## Prerequisites

- **Node.js 18+** — check with `node -v`
- **Ollama** running locally — https://ollama.ai
- **llama3 model pulled** — run `ollama pull llama3`

---

## Installation

```bash
# 1. Navigate into the project folder
cd career-ops-lite

# 2. Install dependencies
npm install

# 3. Start the server
npm start

Open your browser at **http://localhost:3000**

---

**Step 1 — Find your Chrome profile path:**

| OS | Path |
|---|---|
| Windows | `C:\Users\YourName\AppData\Local\Google\Chrome\User Data` |
| Mac | `/Users/YourName/Library/Application Support/Google/Chrome` |

**Step 2 — Add to `.env`:**
```
CHROME_PROFILE_PATH=C:\Users\YourName\AppData\Local\Google\Chrome\User Data
```

**Step 3 — Make sure you're logged into LinkedIn in that Chrome profile.**

> Close Chrome before running LinkedIn scrapes — Chrome and Puppeteer cannot share the profile simultaneously.

---

## Features Quick Reference

| Tab | What it does |
|---|---|
| **Jobs** | Fetch jobs by URL or portal search. Add manually. AI score & rank. |
| **Resumes** | Generate tailored ATS/Modern/Compact resume as PDF + DOCX. |
| **Profile** | Save your profile once — reused for every generation. |
| **History** | All generated resumes, re-downloadable anytime. |
| **Tracker** | Application status: Not Applied → Applied → Interview → Offer/Rejected. |
| **Skill Gap** | AI analysis of what you're missing and what to learn. |

---

## Switching AI Model

Edit `.env`:
```
MODEL=llama3.2
```
or any model you've pulled with `ollama pull <model>`.

---

## Folder Structure

```
career-ops-lite/
├── server.js          ← Entry point
├── .env               ← Your config
├── routes/            ← API route handlers
├── services/          ← AI, scraping, PDF, DOCX logic
├── data/              ← profile.json, jobs.json, history.json (auto-created)
├── outputs/           ← Generated PDFs and DOCX files
└── public/            ← Frontend dashboard
```

---

## Troubleshooting

**Ollama not connected (red dot in UI)**
→ Run `ollama serve` in a terminal. Keep it running while using the app.

**Puppeteer/Chrome error on Windows**
→ Try adding `--no-sandbox` — already included. If Chrome opens but crashes, check that your `CHROME_PROFILE_PATH` is correct.

**`npm install` is slow**
→ Puppeteer is downloading Chromium. Wait for it to finish. Only happens once.

**JSON parse error from AI**
→ The model returned malformed JSON. Try a larger/smarter model: `ollama pull llama3.2` then set `MODEL=llama3.2` in `.env`.
