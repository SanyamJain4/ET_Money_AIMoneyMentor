import pytest
from fastapi.testclient import TestClient

from app import tax_engine
from app.health_engine import compute
from app.llm import extract_json
from app.main import app
from app.schemas import HealthScoreInput, TaxInput


def tax(**kw):
    return tax_engine.calculate(TaxInput(**kw))


# ── Tax engine: hand-checked figures ─────────────────────────────────────────

def test_new_regime_rebate_makes_7l75k_tax_free():
    assert tax(gross_salary=775_000)["new_tax"] == 0  # 7.75L - 75k std = 7L -> 87A


def test_new_regime_12l():
    # taxable 11.25L: 20,000 + 30,000 + 18,750 = 68,750 + 4% cess
    assert tax(gross_salary=1_200_000)["new_tax"] == 71_500


def test_new_regime_25l():
    assert tax(gross_salary=2_500_000)["new_tax"] == 434_200


def test_old_regime_5l_rebate():
    assert tax(gross_salary=550_000)["old_tax"] == 0  # 5.5L - 50k = 5L -> 87A


def test_old_regime_with_deductions():
    r = tax(gross_salary=1_200_000, investments_80c=150_000, premium_80d_self=25_000)
    # taxable = 12L - 50k - 1.5L - 25k = 9.75L -> 12,500 + 20% of 4.75L = 107,500 + cess
    assert r["old_tax"] == round(107_500 * 1.04)


def test_80c_and_80d_are_capped():
    r = tax(gross_salary=1_200_000, investments_80c=900_000, premium_80d_self=90_000, premium_80d_parents=90_000)
    assert r["old_deductions"]["80C"] == 150_000
    assert r["old_deductions"]["80D"] == 50_000  # 25k self + 25k non-senior parents


def test_80d_senior_parents_get_higher_limit():
    r = tax(gross_salary=1_200_000, premium_80d_parents=90_000, parents_senior=True)
    assert r["old_deductions"]["80D"] == 50_000


def test_senior_citizen_basic_exemption():
    young = tax(gross_salary=700_000, age=30)["old_tax"]
    senior = tax(gross_salary=700_000, age=65)["old_tax"]
    assert senior < young


def test_super_senior_slab():
    assert tax(gross_salary=800_000, age=82)["old_tax"] < tax(gross_salary=800_000, age=65)["old_tax"]


def test_hra_exemption_uses_least_of_three():
    # basic 40% of 12L = 4.8L; rent-10% basic = 1.8L-48k = 1.32L; 50% basic = 2.4L; HRA 2.4L
    assert tax(gross_salary=1_200_000, hra_received=240_000, rent_paid=180_000)["hra_exemption"] == 132_000


def test_hra_zero_without_rent():
    assert tax(gross_salary=1_200_000, hra_received=240_000)["hra_exemption"] == 0


def test_surcharge_marginal_relief_never_exceeds_extra_income():
    just_over = tax(gross_salary=5_075_001)["new_tax"]
    at = tax(gross_salary=5_075_000)["new_tax"]
    assert just_over - at <= 1 * 1.04 + 1  # one extra rupee costs at most ~1 rupee


def test_high_income_pays_surcharge():
    assert tax(gross_salary=10_000_000)["new_tax"] > tax(gross_salary=5_000_000)["new_tax"] * 1.9


def test_employer_nps_reduces_new_regime_tax():
    assert tax(gross_salary=2_000_000, employer_nps_80ccd2=100_000)["new_tax"] < tax(gross_salary=2_000_000)["new_tax"]


def test_missing_deductions_listed_with_savings():
    r = tax(gross_salary=1_200_000, investments_80c=85_000)
    sec80c = next(m for m in r["missing_deductions"] if m["section"] == "80C")
    assert sec80c["gap_amount"] == 65_000 and sec80c["potential_saving"] > 0


@pytest.mark.parametrize("g", [100_000, 300_000, 700_000, 1_500_000, 3_000_000, 60_000_000])
def test_tax_is_monotonic_and_non_negative(g):
    a, b = tax(gross_salary=g), tax(gross_salary=g + 100_000)
    assert 0 <= a["new_tax"] <= b["new_tax"] and 0 <= a["old_tax"] <= b["old_tax"]


# ── Health engine ────────────────────────────────────────────────────────────

def health(**kw):
    base = dict(monthly_income=100_000, monthly_expenses=50_000)
    return compute(HealthScoreInput(**{**base, **kw}))


def test_health_has_all_six_dimensions_with_frontend_fields():
    r = health()
    assert set(r["dimensions"]) == {"emergency", "insurance", "investments", "debt", "tax", "retirement"}
    for v in r["dimensions"].values():
        assert {"score", "status", "current", "target", "action"} <= set(v)
        assert 0 <= v["score"] <= 100
    assert len(r["monthly_action_plan"]) == 3


def test_strong_profile_scores_higher_than_weak():
    strong = health(emergency_fund=600_000, term_cover=12_000_000, has_term_insurance=True,
                    health_insurance_cover=1_000_000, total_investments=3_000_000, has_retirement_savings=True)
    assert strong["overall_score"] > health()["overall_score"] + 30


def test_heavy_emi_hurts_debt_score():
    assert health(monthly_emi=60_000)["dimensions"]["debt"]["score"] == 0


def test_zero_expenses_does_not_crash():
    assert health(monthly_expenses=0)["overall_score"] >= 0


def test_health_score_is_deterministic():
    assert health() == health()


# ── API ──────────────────────────────────────────────────────────────────────

client = TestClient(app)


def test_api_tax_wizard_contract_without_llm():
    r = client.post("/tax-wizard", json={"gross_salary": 1_200_000, "investments_80c": 85_000})
    assert r.status_code == 200
    body = r.json()
    for key in ("recommended_regime", "tax_old", "tax_new", "tax_saving", "verdict", "missing_deductions",
                "top_investments", "action_items", "total_additional_saving_possible"):
        assert key in body
    assert body["ai_generated_text"] is False


def test_api_health_score_contract():
    r = client.post("/health-score", json={"monthly_income": 100_000, "monthly_expenses": 55_000})
    assert r.status_code == 200 and "overall_score" in r.json() and "grade" in r.json()


@pytest.mark.parametrize("path,payload", [
    ("/tax-wizard", {"gross_salary": -5}),
    ("/tax-wizard", {"gross_salary": 100, "age": 5}),
    ("/tax-wizard", {"gross_salary": 100, "basic_salary": 500}),
    ("/health-score", {"monthly_income": 0}),
    ("/health-score", {"monthly_income": 1000, "emergency_fund": -1}),
])
def test_api_rejects_invalid_input(path, payload):
    assert client.post(path, json=payload).status_code == 422


def test_cors_does_not_allow_arbitrary_origin():
    r = client.options("/tax-wizard", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in r.headers


# ── LLM helper ───────────────────────────────────────────────────────────────

def test_extract_json_tolerates_fences_and_prose():
    assert extract_json('Sure!\n```json\n{"a": 1}\n```\nHope that helps') == {"a": 1}


def test_extract_json_rejects_garbage():
    with pytest.raises(ValueError):
        extract_json("no json here")


# ── Gemini integration (mocked: no network, no key) ─────────────────────────

class _FakeModels:
    def __init__(self, text):
        self.text = text

    def generate_content(self, **kw):
        assert kw["config"].response_mime_type == "application/json"
        return type("R", (), {"text": self.text})()


def _fake_client(monkeypatch, text):
    from app import llm
    monkeypatch.setattr(llm, "_get_client", lambda: type("C", (), {"models": _FakeModels(text)})())


def test_llm_text_is_used_but_numbers_stay_from_engine(monkeypatch):
    _fake_client(monkeypatch, '```json\n{"verdict": "AI verdict", "action_items": ["a"], "investment_notes": {"80C": "AI why"}, "tax_old": 1}\n```')
    body = client.post("/tax-wizard", json={"gross_salary": 1_200_000, "investments_80c": 85_000}).json()
    assert body["verdict"] == "AI verdict" and body["ai_generated_text"] is True
    assert body["tax_new"] == 71_500  # never taken from the model
    assert next(i for i in body["top_investments"] if i["section"] == "80C")["why"] == "AI why"


def test_invalid_llm_reply_falls_back(monkeypatch):
    _fake_client(monkeypatch, "sorry, I cannot do that")
    r = client.post("/health-score", json={"monthly_income": 100_000, "monthly_expenses": 55_000})
    assert r.status_code == 200 and r.json()["ai_generated_text"] is False


def test_llm_exception_falls_back(monkeypatch):
    from app import llm

    class Boom:
        class models:
            @staticmethod
            def generate_content(**kw):
                raise RuntimeError("quota")
    monkeypatch.setattr(llm, "_get_client", lambda: Boom())
    assert client.post("/tax-wizard", json={"gross_salary": 900_000}).status_code == 200
