"""Request and response models. Validation lives here, not in the routes."""
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

Money = Field(default=0, ge=0, le=10_000_000_000)


class TaxInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    gross_salary: float = Field(gt=0, le=10_000_000_000)
    basic_salary: Optional[float] = Field(default=None, ge=0, le=10_000_000_000)  # defaults to 40% of gross
    hra_received: float = Money
    rent_paid: float = Money
    is_metro: bool = True
    investments_80c: float = Money
    premium_80d_self: float = Money
    premium_80d_parents: float = Money
    parents_senior: bool = False
    nps_80ccd: float = Money  # own contribution, 80CCD(1B)
    employer_nps_80ccd2: float = Money
    home_loan_interest: float = Money
    other_deductions: float = Money
    age: int = Field(default=30, ge=18, le=110)

    @model_validator(mode="after")
    def basic_not_above_gross(self):
        if self.basic_salary is not None and self.basic_salary > self.gross_salary:
            raise ValueError("basic_salary cannot exceed gross_salary")
        return self


class HealthScoreInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    monthly_income: float = Field(gt=0, le=1_000_000_000)
    monthly_expenses: float = Field(default=0, ge=0, le=1_000_000_000)
    emergency_fund: float = Money
    has_term_insurance: bool = False
    term_cover: float = Money
    health_insurance_cover: float = Money
    total_investments: float = Money
    monthly_emi: float = Money
    has_retirement_savings: bool = False
    age: int = Field(default=30, ge=18, le=110)


# ── LLM output (narrative only; every number is computed in Python) ─────────

class TaxNarrative(BaseModel):
    verdict: str
    action_items: list[str] = []
    investment_notes: dict[str, str] = {}  # section -> why it suits this user


class HealthNarrative(BaseModel):
    summary: str
    top_priority: str
