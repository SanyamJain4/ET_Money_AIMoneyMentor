import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from . import health_engine, tax_engine
from .config import settings
from .llm import narrate
from .schemas import HealthNarrative, HealthScoreInput, TaxInput, TaxNarrative

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("mentor")

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit])
app = FastAPI(title="AI Money Mentor API", version="2.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=False,
    allow_methods=["GET", "POST"], allow_headers=["Content-Type"],
)

DISCLAIMER = "Educational estimates for FY 2024-25. Not tax or investment advice; consult a qualified professional."

# Rule-based suggestions; the LLM may only personalise the "why" text.
INVESTMENTS = {
    "80C": dict(name="ELSS mutual fund", lock_in="3 years", liquidity="medium",
                why="Equity growth with the shortest 80C lock-in."),
    "80CCD(1B)": dict(name="NPS Tier-1", lock_in="Till age 60", liquidity="low",
                      why="Extra ₹50,000 deduction beyond 80C, built for retirement."),
    "80D": dict(name="Health insurance premium", lock_in="1 year (renewable)", liquidity="high",
                why="Protects savings from medical costs and cuts taxable income."),
}


def _top_investments(missing: list[dict]) -> list[dict]:
    out, seen = [], set()
    for m in missing:
        if m["section"] in seen or m["section"] not in INVESTMENTS:
            continue
        seen.add(m["section"])
        out.append({"rank": len(out) + 1, "section": m["section"],
                    "annual_saving": m["potential_saving"], **INVESTMENTS[m["section"]]})
    return out[:3]


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on our side. Please try again."})


@app.post("/tax-wizard")
@limiter.limit(settings.rate_limit)
def tax_wizard(request: Request, data: TaxInput):  # plain def: FastAPI runs it in a threadpool
    calc = tax_engine.calculate(data)
    better, saving = calc["better_regime"], calc["tax_saving_by_switching"]
    investments = _top_investments(calc["missing_deductions"])

    facts = {"age": data.age, "gross_salary": data.gross_salary, "investments": investments,
             **{k: calc[k] for k in ("old_tax", "new_tax", "better_regime",
                                     "tax_saving_by_switching", "missing_deductions")}}
    story = narrate(facts, TaxNarrative,
                    "Write a 2-sentence verdict for this taxpayer and up to 4 concise action items. "
                    "In investment_notes map each section to one personalised sentence.")

    if story:
        verdict, actions = story.verdict, story.action_items
        for inv in investments:
            inv["why"] = story.investment_notes.get(inv["section"], inv["why"])
    else:
        verdict = (f"The {better} regime is cheaper for you, saving ₹{saving:,.0f} a year."
                   if saving else "Both regimes cost you the same tax.")
        actions = [f"Choose the {better} regime when you declare to your employer."] + [
            f"Invest ₹{m['gap_amount']:,.0f} more under {m['section']} "
            f"(saves about ₹{m['potential_saving']:,.0f} in the old regime)."
            for m in calc["missing_deductions"][:3]]

    return {
        "recommended_regime": better, "tax_old": calc["old_tax"], "tax_new": calc["new_tax"], "tax_saving": saving,
        "verdict": verdict, "missing_deductions": calc["missing_deductions"], "top_investments": investments,
        "action_items": actions, "total_additional_saving_possible": calc["total_additional_saving_possible"],
        "calculations": calc, "ai_generated_text": story is not None, "disclaimer": DISCLAIMER,
    }


@app.post("/health-score")
@limiter.limit(settings.rate_limit)
def health_score(request: Request, data: HealthScoreInput):
    result = health_engine.compute(data)
    story = narrate({k: result[k] for k in ("overall_score", "grade", "dimensions", "weakest_dimension")},
                    HealthNarrative, "Write a 2-sentence encouraging summary and a one-sentence top priority.")
    if story:
        result["summary"], result["top_priority"] = story.summary, story.top_priority
    result["ai_generated_text"] = story is not None
    result["disclaimer"] = DISCLAIMER
    return result


@app.get("/")
@app.get("/health")
def root():
    return {"status": "ok", "llm_enabled": bool(settings.gemini_api_key),
            "endpoints": ["/tax-wizard", "/health-score"]}
