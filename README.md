# AI Money Mentor

Free tax and financial-health guidance for Indian salaried professionals (ET AI Hackathon 2026, PS 9).

* **Tax Wizard** – old vs new regime (FY 2024-25), missing deductions with rupee savings, top tax-saving investments.
* **Money Health Score** – six dimensions (Emergency, Insurance, Investments, Debt, Tax, Retirement), radar chart, 3-month plan.

## Architecture

```
React (CRA proxy)  ──►  FastAPI  ──►  app/schemas.py        validation (Pydantic, bounds, 422 on bad input)
 TaxWizard                            app/tax_engine.py     slabs, 87A, surcharge + relief, HRA, 80C/80D/NPS caps
 HealthScore                          app/health_engine.py  explicit rubric + weights -> score, grade, plan
                                      app/llm.py            Gemini writes prose only; output schema-validated
                                      app/main.py           routes, CORS allow-list, rate limit, error handler
```

**Principle:** every number comes from deterministic Python. The LLM (optional) only rewrites
the verdict, summary and action text, and its reply is validated against a Pydantic schema.
No API key, a timeout, quota error or malformed reply all fall back to rule-based text
(`ai_generated_text: false` in the response), so the app never fails because of the model.

## Run

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                               # GEMINI_API_KEY is optional
uvicorn app.main:app --reload --port 8000          # `uvicorn main:app` also works

cd ../frontend && npm install && npm start         # http://localhost:3000
```

Or `docker compose up --build` for the backend. Tests: `cd backend && python -m pytest`.

## API

`POST /tax-wizard` – `gross_salary` (required), optional `basic_salary`, `hra_received`, `rent_paid`, `is_metro`,
`investments_80c`, `premium_80d_self`, `premium_80d_parents`, `parents_senior`, `nps_80ccd`,
`employer_nps_80ccd2`, `home_loan_interest`, `other_deductions`, `age`.

`POST /health-score` – `monthly_income` (required), `monthly_expenses`, `emergency_fund`, `monthly_emi`,
`has_term_insurance`, `term_cover`, `health_insurance_cover`, `total_investments`, `has_retirement_savings`, `age`.

`GET /health` – status and whether the LLM is enabled. Invalid input returns 422; limits return 429.

## Assumptions and limits

* Rates are FY 2024-25 and live in tables at the top of `tax_engine.py`; update them each Budget.
* Basic salary defaults to 40% of gross for HRA and 80CCD(2) unless provided.
* Covers salaried income only (no capital gains, business income, or Section 87A on special-rate income).
* The tax-efficiency score is a proxy; use the Tax Wizard for exact figures.
* Educational estimates, not tax or investment advice.

## Deploy free (Render: one platform for both parts)

1. Push this repo to GitHub. Never commit `backend/.env` (it is git-ignored).
2. On [render.com](https://render.com): **New + > Blueprint**, pick the repo. `render.yaml` creates:
   * `ai-money-mentor-api` (Docker web service, free plan)
   * `ai-money-mentor` (static React site, free plan)
3. In the dashboard set the three values marked `sync: false`:
   * API service: `GEMINI_API_KEY` (from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)) and `CORS_ORIGINS` (the frontend URL, no trailing slash)
   * Static site: `REACT_APP_API_URL` (the API service URL, no trailing slash)
4. Redeploy the static site once after setting `REACT_APP_API_URL` (it is baked in at build time).

Free-tier notes: the API sleeps after ~15 minutes idle, so the first request can take ~30s (the UI says so).
Alternatives: frontend on Vercel/Netlify/GitHub Pages (set `REACT_APP_API_URL` at build time) and backend on
Render, Railway, Fly.io or Hugging Face Spaces (Docker). Without `GEMINI_API_KEY` the app still works with rule-based text.
