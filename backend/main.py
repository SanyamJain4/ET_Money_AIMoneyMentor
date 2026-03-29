from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

# Load environment variables (Make sure GOOGLE_API_KEY is in your .env)
load_dotenv()

app = FastAPI(title="AI Money Mentor API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the new Google Gen AI Client
# Model ID "gemini-3-flash-preview" is the standard for 2026 free-tier use
client = genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_ID = "gemini-3-flash-preview"

# ─── Models ───────────────────────────────────────────────────────────────────

class TaxInput(BaseModel):
    gross_salary: float
    hra_received: float = 0
    rent_paid: float = 0
    is_metro: bool = True
    investments_80c: float = 0
    premium_80d_self: float = 0
    premium_80d_parents: float = 0
    nps_80ccd: float = 0
    home_loan_interest: float = 0
    other_deductions: float = 0
    age: int = 30

class HealthScoreInput(BaseModel):
    monthly_income: float
    monthly_expenses: float
    emergency_fund: float
    has_term_insurance: bool = False
    term_cover: float = 0
    health_insurance_cover: float = 0
    total_investments: float = 0
    monthly_emi: float = 0
    has_retirement_savings: bool = False
    age: int = 30

# ─── Tax Calculation Engine (Internal Logic) ─────────────────────────────

def calculate_taxes(data: TaxInput) -> dict:
    gross = data.gross_salary

    # New Regime Calculation
    new_income = max(0, gross - 75000)
    def new_slab(income):
        tax = 0
        slabs = [(300000, 0.0), (300000, 0.05), (300000, 0.10), (300000, 0.15), (300000, 0.20), (float("inf"), 0.30)]
        for limit, rate in slabs:
            if income <= 0: break
            taxable = min(income, limit)
            tax += taxable * rate
            income -= taxable
        return tax
    new_tax = new_slab(new_income)
    new_tax += new_tax * 0.04

    # Old Regime Calculation
    hra_exemption = 0
    if data.rent_paid > 0 and data.hra_received > 0:
        basic_estimate = gross * 0.4
        metro_pct = 0.50 if data.is_metro else 0.40
        hra_exemption = max(0, min(data.hra_received, data.rent_paid - 0.10 * basic_estimate, metro_pct * basic_estimate))

    old_income = max(0, gross - 50000 - hra_exemption - min(data.investments_80c, 150000) - 
                    min(data.premium_80d_self + data.premium_80d_parents, 50000) - 
                    min(data.nps_80ccd, 50000) - min(data.home_loan_interest, 200000) - data.other_deductions)
    
    threshold = 300000 if data.age >= 60 else 250000
    def old_slab(income, thresh):
        rem = income - thresh
        if rem <= 0: return 0
        brackets = [(250000, 0.05), (500000, 0.20), (float("inf"), 0.30)]
        tax = 0
        for limit, rate in brackets:
            if rem <= 0: break
            taxable = min(rem, limit)
            tax += taxable * rate
            rem -= taxable
        return tax
    old_tax = old_slab(old_income, threshold)
    old_tax += old_tax * 0.04

    better = "new" if new_tax <= old_tax else "old"
    
    gaps = {}
    if data.investments_80c < 150000: gaps["80C"] = round(150000 - data.investments_80c)
    if data.nps_80ccd < 50000: gaps["80CCD(1B)"] = round(50000 - data.nps_80ccd)

    return {
        "old_tax": round(old_tax), "new_tax": round(new_tax), "better_regime": better,
        "tax_saving_by_switching": abs(round(old_tax) - round(new_tax)),
        "hra_exemption": round(hra_exemption), "deduction_gaps": gaps
    }

# ─── API Routes ───────────────────────────────────────────────────────────────

@app.post("/tax-wizard")
async def tax_wizard(data: TaxInput):
    try:
        calc = calculate_taxes(data)

        prompt = f"""You are an expert Indian CA. Based on the following tax calculation, provide a personalized advice JSON.
        CALCULATION DATA: {json.dumps(calc)}
        USER DATA: Salary ₹{data.gross_salary}, Age {data.age}.
        
        Respond ONLY with valid JSON in this format:
        {{
          "recommended_regime": "{calc['better_regime']}",
          "tax_old": {calc['old_tax']},
          "tax_new": {calc['new_tax']},
          "tax_saving": {calc['tax_saving_by_switching']},
          "verdict": "string",
          "missing_deductions": [{{ "section": "string", "name": "string", "description": "string", "gap_amount": 0, "potential_saving": 0 }}],
          "top_investments": [{{ "rank": 1, "name": "string", "section": "string", "why": "string", "annual_saving": 0, "liquidity": "high", "lock_in": "string" }}],
          "action_items": ["string"],
          "total_additional_saving_possible": 0
        }}"""

        # Using the new google-genai SDK syntax
        response = genai.GenerativeModel("gemini-pro").generate_content(prompt)

        # Handle formatting and parse JSON
        raw_text = response.text.strip().replace('```json', '').replace('```', '')
        result = json.loads(raw_text)
        result["calculations"] = calc
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini AI Error: {str(e)}")

@app.post("/health-score")
async def health_score(data: HealthScoreInput):
    try:
        monthly_savings = data.monthly_income - data.monthly_expenses - data.monthly_emi
        emergency_months = data.emergency_fund / data.monthly_expenses if data.monthly_expenses > 0 else 0
        
        prompt = f"Financial Wellness Expert. Respond ONLY with valid JSON score report for: Income {data.monthly_income}, Expenses {data.monthly_expenses}, Emergency Fund {data.emergency_fund}."

        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt
        )
        
        raw_text = response.text.strip().replace('```json', '').replace('```', '')
        result = json.loads(raw_text)
        result["computed"] = {"monthly_savings": round(monthly_savings), "emergency_months": round(emergency_months, 1)}
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {"status": "AI Money Mentor API running on Gemini 3", "endpoints": ["/tax-wizard", "/health-score"]}