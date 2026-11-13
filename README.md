# GapWise

**Resume-Based Skill Gap Analyzer**

GapWise compares a candidate's resume with a selected software role or a custom job description. It identifies supported skills, distinguishes demonstrated evidence from partial or missing evidence, and presents an explainable coverage metric and an improvement roadmap.

## Features

- Extracts skills, projects, and experience from text-based PDF resumes
- Analyzes six predefined software roles or a custom job description
- Separates required and preferred requirements
- Classifies resume evidence as **Demonstrated**, **Partial**, or **Not demonstrated**
- Shows evidence coverage, skill gaps, and recommended next steps
- Provides optional Gemini-based roadmap suggestions for **fictional test profiles only**

## Tech Stack

- **Frontend:** React, Vite, Axios, Framer Motion
- **Backend:** Node.js, Express, Multer, `pdf-parse`
- **Analysis:** Rule-based skill normalization, requirement parsing, and contextual evidence matching
- **Optional AI:** Google Gemini API (server-side)

## Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) **22.12+** (or a compatible newer version) and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/gaurav-kalal18/GapWise.git
cd GapWise
```

### 2. Start the backend

Open a terminal in the project folder:

```bash
cd backend
npm ci
node server.js
```

The API runs at **http://localhost:5000**. Check **http://localhost:5000/api/health** to confirm it is running.

### 3. Start the frontend

Open **another terminal** in the project folder:

```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173** in your browser.

> Keep both terminals running. The frontend currently expects the backend at `http://localhost:5000/api`.

## How to Test

1. Upload a **text-based PDF resume** (maximum **5 MB**). Scanned/image-only PDFs may not be readable.
2. Select a predefined role **or** enter a custom job description.
3. Click to analyze and review evidence coverage, demonstrated/partial/missing requirements, and the roadmap.
4. You can test with a fictional resume; no external AI service is needed for the core workflow.

**Important:** The displayed percentage represents *required resume evidence coverage*, not the probability of getting hired. Unresolved requirements in custom JDs may prevent an overall score from being shown.

## Optional Gemini Roadmap (Synthetic Data Only)

The normal analysis works **without an API key**. Gemini personalization is an optional prototype and is disabled unless configured.

To test it with **fictional candidate data only**, create `backend/.env` with:

```dotenv
AI_ROADMAP_ENABLED=true
GEMINI_API_KEY=YOUR_OWN_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
```

Then restart the backend from the `backend` directory:

```bash
node --env-file=.env server.js
```

API access depends on the selected Gemini model and your Google project's quotas. **Never commit `.env` or submit real resumes/personal information to the free-tier AI prototype.** Leave the AI option disabled when testing real candidate documents.

## Tests

From the `backend` folder:

```bash
node --test
```

To check the frontend build, run from `frontend`:

```bash
npm run build
```

## Project Structure

```text
GapWise/
├── backend/
│   ├── data/           # Role and skill catalogs
│   ├── src/            # API routes, controllers, and analysis services
│   ├── tests/          # Regression tests
│   ├── validation/     # Validation scripts and cases
│   └── server.js
├── frontend/
│   └── src/            # Pages, shared context, and UI components
└── README.md
```

## Notes

- Uploaded PDFs are processed in memory; the application does not require a database for its current workflow.
- The assessment is an explainable, rule-based evaluation of **resume evidence**, not verification of actual skills or hiring readiness.
- The project is currently intended for local evaluation and demonstration; public deployment is not yet completed.
