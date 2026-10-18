"""Deterministic Money Health Score. Six dimensions, 0-100 each, explicit rubric."""
from .schemas import HealthScoreInput

WEIGHTS = {"emergency": 0.20, "insurance": 0.20, "investments": 0.20, "debt": 0.15, "tax": 0.10, "retirement": 0.15}
LABELS = {"emergency": "emergency fund", "insurance": "insurance cover", "investments": "investments",
          "debt": "debt", "tax": "tax efficiency", "retirement": "retirement planning"}


def _clamp(x: float) -> int:
    return int(round(max(0.0, min(100.0, x))))


def _status(score: int) -> str:
    return "excellent" if score >= 85 else "good" if score >= 70 else "fair" if score >= 50 else "poor" if score >= 30 else "critical"


def _grade(score: int) -> str:
    return "A" if score >= 85 else "B" if score >= 70 else "C" if score >= 55 else "D" if score >= 40 else "F"


def _inr(x: float) -> str:
    return f"₹{x:,.0f}"


def compute(d: HealthScoreInput) -> dict:
    income = d.monthly_income
    annual = income * 12
    savings = income - d.monthly_expenses - d.monthly_emi
    savings_rate = savings / income
    emi_ratio = d.monthly_emi / income
    cover_base = d.monthly_expenses + d.monthly_emi  # monthly outgo the fund must cover
    em_months = d.emergency_fund / cover_base if cover_base > 0 else (6.0 if d.emergency_fund > 0 else 0.0)

    dims: dict[str, dict] = {}

    # Emergency: 6 months of outgo = 100
    s = _clamp(em_months / 6 * 100)
    dims["emergency"] = dict(
        score=s, current=f"{em_months:.1f} months of expenses", target="6 months",
        action="Keep it up" if s >= 85 else
        f"Add {_inr(max(0, 6 * cover_base - d.emergency_fund))} to a liquid fund or sweep-in FD",
    )

    # Insurance: term cover >= 10x annual income (50 pts) + health cover target (50 pts)
    health_target = 1_000_000 if d.age > 45 else 500_000
    term_ratio = d.term_cover / annual if (d.has_term_insurance or d.term_cover > 0) else 0
    s = _clamp(min(1, term_ratio / 10) * 50 + min(1, d.health_insurance_cover / health_target) * 50)
    dims["insurance"] = dict(
        score=s, current=f"Term {_inr(d.term_cover)} · Health {_inr(d.health_insurance_cover)}",
        target=f"Term ≥ {_inr(10 * annual)} · Health ≥ {_inr(health_target)}",
        action="Cover looks adequate" if s >= 85 else
        "Buy a pure term plan" if term_ratio < 10 else "Top up health cover with a super top-up",
    )

    # Investments: savings rate (50 pts) + corpus vs age-based multiple of annual income (50 pts)
    corpus_target = annual * max(0.5, (d.age - 22) * 0.25)
    s = _clamp(min(1, max(0, savings_rate) / 0.20) * 50 + min(1, d.total_investments / corpus_target) * 50)
    dims["investments"] = dict(
        score=s, current=f"{savings_rate * 100:.0f}% savings rate · corpus {_inr(d.total_investments)}",
        target=f"20% savings rate · corpus {_inr(corpus_target)}",
        action="On track" if s >= 85 else
        (f"Start a SIP of {_inr(0.2 * income - savings)} more per month" if savings < 0.2 * income
         else "Keep your savings rate and put surplus into diversified SIPs to build the corpus"),
    )

    # Debt: EMI <= 20% of income is healthy, >= 50% is critical
    s = _clamp(100 - max(0, emi_ratio - 0.20) / 0.30 * 100)
    dims["debt"] = dict(
        score=s, current=f"EMIs are {emi_ratio * 100:.0f}% of income", target="Under 20% of income",
        action="No action needed" if s >= 85 else "Prepay the highest-interest loan first",
    )

    # Tax efficiency (proxy from available inputs): 80C-type corpus + a retirement account
    s = _clamp(min(1, d.total_investments / 150_000) * 60 + (40 if d.has_retirement_savings else 0))
    dims["tax"] = dict(
        score=s, current="Retirement account " + ("present" if d.has_retirement_savings else "missing"),
        target="Use the full ₹1.5L 80C and ₹50K NPS limits",
        action="Well optimised" if s >= 85 else "Run the Tax Wizard for exact savings",
    )

    # Retirement: has an account (40 pts) + corpus progress toward 10x annual income (60 pts)
    s = _clamp((40 if d.has_retirement_savings else 0) + min(1, d.total_investments / (annual * 10) / 0.5) * 60)
    dims["retirement"] = dict(
        score=s, current="EPF/NPS/PPF " + ("started" if d.has_retirement_savings else "not started"),
        target="Retirement corpus ≈ 10x annual income by 60",
        action="Increase contributions every year" if d.has_retirement_savings else
        "Open an NPS account and automate a monthly contribution",
    )

    for v in dims.values():
        v["status"] = _status(v["score"])

    overall = _clamp(sum(dims[k]["score"] * w for k, w in WEIGHTS.items()))
    worst = min(dims, key=lambda k: dims[k]["score"])

    return {
        "overall_score": overall,
        "grade": _grade(overall),
        "dimensions": dims,
        "weakest_dimension": worst,
        "summary": f"Your money health is {_status(overall)} ({overall}/100). Your weakest area is {LABELS[worst]}.",
        "top_priority": dims[worst]["action"],
        "monthly_action_plan": _action_plan(d, dims, savings, cover_base),
        "computed": {"monthly_savings": round(savings), "emergency_months": round(em_months, 1)},
    }


def _action_plan(d: HealthScoreInput, dims: dict, savings: float, cover_base: float) -> list[dict]:
    """Three months, weakest weighted dimension first, with a rupee amount where one applies."""
    order = sorted(dims, key=lambda k: dims[k]["score"] * (1 - WEIGHTS[k]))[:3]
    amounts = {
        "emergency": max(0, 6 * cover_base - d.emergency_fund) / 3,
        "investments": max(0, 0.2 * d.monthly_income - max(0, savings)),
        "tax": 12_500,
        "retirement": min(max(0, savings), 5_000),
    }
    return [{"month": i, "action": dims[k]["action"], "amount": round(amounts.get(k, 0))}
            for i, k in enumerate(order, start=1)]
