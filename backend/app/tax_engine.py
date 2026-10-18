"""Deterministic Indian income-tax engine (salaried, FY 2024-25 / AY 2025-26).

All rupee figures shown to the user come from here, never from the LLM.
Rates live in the tables below so a new financial year is a data change.
"""
from dataclasses import dataclass

from .schemas import TaxInput

INF = float("inf")
CESS = 0.04

# (upper bound of band, rate)
NEW_SLABS = [(300_000, 0.0), (700_000, 0.05), (1_000_000, 0.10), (1_200_000, 0.15), (1_500_000, 0.20), (INF, 0.30)]
OLD_SLABS = {
    "regular": [(250_000, 0.0), (500_000, 0.05), (1_000_000, 0.20), (INF, 0.30)],
    "senior": [(300_000, 0.0), (500_000, 0.05), (1_000_000, 0.20), (INF, 0.30)],  # 60-79
    "super_senior": [(500_000, 0.0), (1_000_000, 0.20), (INF, 0.30)],  # 80+
}
STD_DEDUCTION_NEW = 75_000
STD_DEDUCTION_OLD = 50_000
REBATE_87A = {"new": (700_000, 25_000), "old": (500_000, 12_500)}  # (income limit, max rebate)
# (income above which it applies, rate); new regime surcharge is capped at 25%
SURCHARGE = [(20_000_000, 0.25), (10_000_000, 0.15), (5_000_000, 0.10)]
SURCHARGE_OLD_EXTRA = [(50_000_000, 0.37)]

LIMIT_80C = 150_000
LIMIT_80CCD1B = 50_000
LIMIT_HOME_LOAN = 200_000
LIMIT_80D_SELF = (25_000, 50_000)  # (non-senior, senior)
LIMIT_80D_PARENTS = (25_000, 50_000)
LIMIT_80CCD2_PCT_OLD = 0.10  # of basic
LIMIT_80CCD2_PCT_NEW = 0.14


def _slab_tax(income: float, slabs: list[tuple[float, float]]) -> float:
    tax, lower = 0.0, 0.0
    for upper, rate in slabs:
        if income <= lower:
            break
        tax += (min(income, upper) - lower) * rate
        lower = upper
    return tax


def _surcharge_table(regime: str) -> list[tuple[float, float]]:
    return (SURCHARGE_OLD_EXTRA if regime == "old" else []) + SURCHARGE


def _surcharge_rate(income: float, regime: str) -> float:
    for threshold, rate in _surcharge_table(regime):
        if income > threshold:
            return rate
    return 0.0


def _tax_before_cess(taxable: float, slabs, regime: str, with_surcharge: bool = True) -> float:
    """Slab tax -> 87A rebate/marginal relief -> surcharge (with marginal relief)."""
    base = _slab_tax(taxable, slabs)
    limit, max_rebate = REBATE_87A[regime]
    if taxable <= limit:
        base = max(0.0, base - max_rebate)
    elif regime == "new":
        base = min(base, taxable - limit)  # rebate marginal relief

    rate = _surcharge_rate(taxable, regime) if with_surcharge else 0.0
    if not rate:
        return base
    threshold = next(t for t, r in _surcharge_table(regime) if r == rate)
    # Tax (incl. any lower surcharge) due at the threshold; extra tax above it
    # can never exceed the extra income above it.
    at_threshold = _tax_before_cess(threshold, slabs, regime)
    surcharge = min(base * rate, max(0.0, at_threshold + (taxable - threshold) - base))
    return base + surcharge


def _total_tax(taxable: float, slabs, regime: str) -> float:
    return _tax_before_cess(taxable, slabs, regime) * (1 + CESS)


@dataclass
class OldRegimeBreakdown:
    hra_exemption: float
    deductions: dict
    taxable_income: float


def hra_exemption(d: TaxInput) -> float:
    if d.rent_paid <= 0 or d.hra_received <= 0:
        return 0.0
    basic = d.basic_salary if d.basic_salary is not None else d.gross_salary * 0.4
    metro_pct = 0.50 if d.is_metro else 0.40
    return max(0.0, min(d.hra_received, d.rent_paid - 0.10 * basic, metro_pct * basic))


def _basic(d: TaxInput) -> float:
    return d.basic_salary if d.basic_salary is not None else d.gross_salary * 0.4


def old_regime(d: TaxInput) -> tuple[float, OldRegimeBreakdown]:
    senior = d.age >= 60
    d80_self = min(d.premium_80d_self, LIMIT_80D_SELF[1 if senior else 0])
    d80_par = min(d.premium_80d_parents, LIMIT_80D_PARENTS[1 if d.parents_senior else 0])
    hra = hra_exemption(d)
    deductions = {
        "standard": STD_DEDUCTION_OLD,
        "hra": hra,
        "80C": min(d.investments_80c, LIMIT_80C),
        "80D": d80_self + d80_par,
        "80CCD(1B)": min(d.nps_80ccd, LIMIT_80CCD1B),
        "80CCD(2)": min(d.employer_nps_80ccd2, LIMIT_80CCD2_PCT_OLD * _basic(d)),
        "24(b)": min(d.home_loan_interest, LIMIT_HOME_LOAN),
        "other": d.other_deductions,
    }
    taxable = max(0.0, d.gross_salary - sum(deductions.values()))
    slabs = OLD_SLABS["super_senior" if d.age >= 80 else "senior" if senior else "regular"]
    return _total_tax(taxable, slabs, "old"), OldRegimeBreakdown(hra, deductions, taxable)


def new_regime(d: TaxInput) -> tuple[float, float]:
    employer_nps = min(d.employer_nps_80ccd2, LIMIT_80CCD2_PCT_NEW * _basic(d))
    taxable = max(0.0, d.gross_salary - STD_DEDUCTION_NEW - employer_nps)
    return _total_tax(taxable, NEW_SLABS, "new"), taxable


# Catalogue used for ranking suggestions. `headroom` = unused limit for this user.
def _headroom(d: TaxInput) -> dict[str, float]:
    senior = d.age >= 60
    return {
        "80C": max(0.0, LIMIT_80C - d.investments_80c),
        "80CCD(1B)": max(0.0, LIMIT_80CCD1B - d.nps_80ccd),
        "80D-self": max(0.0, LIMIT_80D_SELF[1 if senior else 0] - d.premium_80d_self),
        "80D-parents": max(0.0, LIMIT_80D_PARENTS[1 if d.parents_senior else 0] - d.premium_80d_parents),
    }


def _marginal_rate(d: TaxInput) -> float:
    _, b = old_regime(d)
    slabs = OLD_SLABS["super_senior" if d.age >= 80 else "senior" if d.age >= 60 else "regular"]
    rate = 0.0
    lower = 0.0
    for upper, r in slabs:
        if b.taxable_income > lower:
            rate = r
        lower = upper
    return rate * (1 + CESS)


def calculate(d: TaxInput) -> dict:
    old_tax, ob = old_regime(d)
    new_tax, new_taxable = new_regime(d)
    old_tax, new_tax = round(old_tax), round(new_tax)
    better = "new" if new_tax <= old_tax else "old"

    rate = _marginal_rate(d)
    head = _headroom(d)
    meta = {
        "80C": ("80C", "Tax-saving investments (PPF, ELSS, EPF)", "EPF, PPF, ELSS, life insurance, tuition fees (limit ₹1.5L)"),
        "80CCD(1B)": ("80CCD(1B)", "NPS additional contribution", "Extra ₹50,000 over and above 80C"),
        "80D-self": ("80D", "Health insurance (self/family)", "Premium for self, spouse and children"),
        "80D-parents": ("80D", "Health insurance (parents)", "Premium for parents"),
    }
    missing = []
    for key, gap in sorted(head.items(), key=lambda kv: -kv[1]):
        if gap <= 0:
            continue
        sec, name, desc = meta[key]
        missing.append({
            "section": sec, "name": name, "description": desc,
            "gap_amount": round(gap), "potential_saving": round(gap * rate),
        })
    total_extra = sum(m["potential_saving"] for m in missing)

    return {
        "old_tax": old_tax,
        "new_tax": new_tax,
        "better_regime": better,
        "tax_saving_by_switching": abs(old_tax - new_tax),
        "hra_exemption": round(ob.hra_exemption),
        "old_taxable_income": round(ob.taxable_income),
        "new_taxable_income": round(new_taxable),
        "old_deductions": {k: round(v) for k, v in ob.deductions.items()},
        "marginal_rate_old": round(rate, 4),
        "missing_deductions": missing,
        "total_additional_saving_possible": total_extra,
        "deduction_gaps": {m["section"]: m["gap_amount"] for m in missing},
    }
