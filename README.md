# AI Money Mentor — ET AI Hackathon 2026 (PS9)

> 95% of Indians have no financial plan. CA fees start at ₹25,000/year. This app is free.

AI Money Mentor gives every Indian salaried professional:
1. **Tax Wizard** — old vs new regime comparison + every deduction they're missing
2. **Money Health Score** — financial wellness score across 6 dimensions with a 3-month action plan

---

## What it does

### Tax Wizard
- Enter salary, HRA, investments (80C, 80D, NPS, home loan)
- Computes old vs new regime tax using accurate FY 2024-25 slabs
- LLM identifies missing deductions with rupee-level savings
- Recommends top 3 tax-saving investments ranked by your profile

### Money Health Score
- 10 inputs covering income, savings, insurance, debt, investments
- Scores across 6 dimensions: Emergency, Insurance, Investments, Debt, Tax, Retirement
- Radar chart visualization + dimension-by-dimension breakdown
- 3-month personalized action plan

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Recharts |
| Backend | FastAPI (Python) |
| AI | Anthropic Claude API (claude-sonnet-4) |
| Tax engine | Pure Python (no external API) |

---

## Prerequisites

Make sure you have installed:
- **Python 3.9+** → https://www.python.org/downloads/
- **Node.js 18+** → https://nodejs.org/
- **Anthropic API key** → https://console.anthropic.com/

---

## Setup & Run (Step by Step)

### Step 1 — Get your Anthropic API key

1. Go to https://console.anthropic.com/
2. Sign up / log in
3. Click "API Keys" → "Create Key"
4. Copy the key (starts with `sk-ant-...`)

---

### Step 2 — Start the Backend

Open a terminal and run:

```bash
# Go into the backend folder
cd backend

# (Recommended) Create a virtual environment
python -m venv venv

# Activate it:
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set your API key (replace with your actual key)
# On Windows:
set ANTHROPIC_API_KEY=sk-ant-your-key-here
# On Mac/Linux:
export ANTHROPIC_API_KEY=sk-ant-your-key-here

# Start the server
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

To verify it's working, open: http://localhost:8000
You should see: `{"status": "AI Money Mentor API running"}`

---

### Step 3 — Start the Frontend

Open a **new terminal** (keep the backend running) and run:

```bash
# Go into the frontend folder
cd frontend

# Install dependencies (takes ~1-2 minutes first time)
npm install

# Start the app
npm start
```

Your browser will automatically open: **http://localhost:3000**

---

## Using the App

### Tax Wizard demo
1. Click **"Load demo data"** to pre-fill a sample profile (₹12L salary, 28 years old)
2. Click **"Analyse my taxes"**
3. See: regime comparison, missing deductions, top investments, action checklist

### Health Score demo
1. Switch to **"Money Health Score"** tab
2. Click **"Load demo data"**
3. Click **"Calculate my money health score"**
4. See: overall score, radar chart, 6-dimension breakdown, 3-month plan

---

## Project Structure

```
ai_money_mentor/
├── backend/
│   ├── main.py              # FastAPI app — all routes + tax engine
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js           # Navigation + layout
│       ├── index.js         # React entry point
│       ├── index.css        # Global styles
│       ├── components/
│       │   └── UI.js        # Reusable components (Card, Badge, ScoreRing...)
│       └── pages/
│           ├── TaxWizard.js    # Tax form + results
│           └── HealthScore.js  # Health score form + results
│
└── README.md
```

---

## API Endpoints

### POST /tax-wizard
```json
{
  "gross_salary": 1200000,
  "hra_received": 240000,
  "rent_paid": 180000,
  "is_metro": true,
  "investments_80c": 85000,
  "premium_80d_self": 12000,
  "premium_80d_parents": 0,
  "nps_80ccd": 0,
  "home_loan_interest": 0,
  "age": 28
}
```

### POST /health-score
```json
{
  "monthly_income": 100000,
  "monthly_expenses": 55000,
  "emergency_fund": 120000,
  "has_term_insurance": false,
  "term_cover": 0,
  "health_insurance_cover": 300000,
  "total_investments": 200000,
  "monthly_emi": 15000,
  "has_retirement_savings": false,
  "age": 28
}
```

---

## Architecture

```
User → React Frontend → FastAPI Backend → Tax Engine (Python)
                                       ↓
                              Anthropic Claude API
                                       ↓
                         JSON response → Frontend renders
```

**Key design choice:** Tax calculations are done in pure Python (deterministic, fast, auditable). The LLM is only used for the *explanation layer* — generating plain-English advice, identifying specific gaps, and ranking recommendations. This means the math is always correct even if the LLM fails.

---

## Impact Model (for submission)

- India has ~5 crore salaried taxpayers
- Average CA fee for tax planning: ₹5,000–₹25,000/year
- Average tax saving from proper deduction optimization: ₹20,000–₹60,000/year
- **Conservative estimate:** If this tool helps 1% of salaried taxpayers save ₹20,000 each:
  - Users helped: 5,00,000
  - Total tax saved: ₹1,000 crore/year
  - CA fees saved: ₹250 crore/year

---

## Troubleshooting

**Backend won't start?**
- Make sure Python 3.9+ is installed: `python --version`
- Make sure the API key is set: `echo $ANTHROPIC_API_KEY` (Mac/Linux)
- Try `pip install -r requirements.txt` again

**Frontend shows "Something went wrong"?**
- Make sure the backend is running on port 8000
- Check the backend terminal for error messages
- Make sure `"proxy": "http://localhost:8000"` is in frontend/package.json

**npm install fails?**
- Make sure Node 18+ is installed: `node --version`
- Try deleting `node_modules` folder and running `npm install` again

---

## Hackathon Notes

Built for ET AI Hackathon 2026 — Problem Statement 9 (AI Money Mentor).

The demo flow for the 3-minute pitch video:
1. Open Tax Wizard → Load demo data → Analyse → Show ₹43,680 saving highlighted
2. Switch to Health Score → Load demo data → Calculate → Show radar chart + top priority action
3. Narrate impact: "This took 90 seconds. A CA would charge ₹5,000 and take a week."
