import React, { useState } from 'react';
import api from '../api';
import {
  Card, Badge, PrimaryButton, SectionTitle,
  FormRow, FormField, DemoButton, ScoreRing, StatusDot, fmt,
  apiError, Disclaimer, HowToUse, Glossary, Notice,
} from '../components/UI';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

const DEMO = {
  monthly_income: 100000,
  monthly_expenses: 55000,
  emergency_fund: 120000,
  has_term_insurance: false,
  term_cover: 0,
  health_insurance_cover: 300000,
  total_investments: 200000,
  monthly_emi: 15000,
  has_retirement_savings: false,
  age: 28,
};

const DEFAULT = {
  monthly_income: '', monthly_expenses: '', emergency_fund: '',
  has_term_insurance: false, term_cover: '', health_insurance_cover: '',
  total_investments: '', monthly_emi: '', has_retirement_savings: false, age: 28,
};

function n(v) { return v === '' ? 0 : Number(v); }

export default function HealthScore() {
  const [form, setForm] = useState(DEFAULT);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    if (!(n(form.monthly_income) > 0)) { setError('Please enter your monthly income.'); return; }
    if (Object.values(form).some(v => typeof v !== 'boolean' && Number(v) < 0)) { setError('Amounts cannot be negative.'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const payload = {
        monthly_income: n(form.monthly_income),
        monthly_expenses: n(form.monthly_expenses),
        emergency_fund: n(form.emergency_fund),
        has_term_insurance: form.has_term_insurance,
        term_cover: n(form.term_cover),
        health_insurance_cover: n(form.health_insurance_cover),
        total_investments: n(form.total_investments),
        monthly_emi: n(form.monthly_emi),
        has_retirement_savings: form.has_retirement_savings,
        age: n(form.age),
      };
      const { data } = await api.post('/health-score', payload);
      setResult(data);
    } catch (e) {
      setError(apiError(e));
    }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Money Health Score</h1>
        <p style={{ color: '#6b7280', fontSize: 13 }}>
          Get a comprehensive score across 6 dimensions of your financial life in under 2 minutes.
        </p>
      </div>

      {!result && (
        <HowToUse id="health" title="How to use the Money Health Score"
          steps={[
            'Click "Load demo data" to see an example, or enter your monthly figures.',
            'Fill income and expenses first. Everything else makes the score more accurate.',
            'Press "Calculate" to get a score out of 100 across six areas of your finances.',
            'Follow the 3-month plan, it starts with the area that needs the most help.',
          ]}
          note="Scores are rule-based and repeatable: the same answers always give the same score." />
      )}

      {!result ? (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <SectionTitle>Your financial profile</SectionTitle>
            <DemoButton onClick={() => setForm(DEMO)} />
          </div>

          <FormRow>
            <FormField label="Monthly income (₹)" hint="Take-home pay per month.">
              <input type="number" placeholder="100000" value={form.monthly_income}
                onChange={e => set('monthly_income', e.target.value)} />
            </FormField>
            <FormField label="Monthly expenses (₹)" hint="Rent, food, bills, travel, shopping, not EMIs.">
              <input type="number" placeholder="55000" value={form.monthly_expenses}
                onChange={e => set('monthly_expenses', e.target.value)} />
            </FormField>
          </FormRow>

          <FormRow>
            <FormField label="Monthly EMI total (₹)" hint="All loan repayments combined. Leave blank if none.">
              <input type="number" placeholder="Home + car + personal loans" value={form.monthly_emi}
                onChange={e => set('monthly_emi', e.target.value)} />
            </FormField>
            <FormField label="Age">
              <input type="number" placeholder="28" value={form.age}
                onChange={e => set('age', e.target.value)} />
            </FormField>
          </FormRow>

          <FormRow>
            <FormField label="Emergency fund (₹)" hint="Savings account + liquid funds you can use immediately.">
              <input type="number" placeholder="Savings account balance" value={form.emergency_fund}
                onChange={e => set('emergency_fund', e.target.value)} />
            </FormField>
            <FormField label="Total investments (₹)" hint="Current value of mutual funds, stocks, FDs, PPF, etc.">
              <input type="number" placeholder="MF + stocks + FD + PPF" value={form.total_investments}
                onChange={e => set('total_investments', e.target.value)} />
            </FormField>
          </FormRow>

          <FormRow>
            <FormField label="Health insurance cover (₹)" hint="Sum insured across personal and family policies. Do not count employer-only cover if you may switch jobs.">
              <input type="number" placeholder="e.g. 500000" value={form.health_insurance_cover}
                onChange={e => set('health_insurance_cover', e.target.value)} />
            </FormField>
            <FormField label="Term insurance cover (₹)" hint="Sum assured of pure term life policies.">
              <input type="number" placeholder="e.g. 10000000" value={form.term_cover}
                onChange={e => set('term_cover', e.target.value)} />
            </FormField>
          </FormRow>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <FormField label="Do you have term insurance?">
              <select value={form.has_term_insurance ? 'yes' : 'no'}
                onChange={e => set('has_term_insurance', e.target.value === 'yes')}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </FormField>
            <FormField label="Do you have retirement savings? (EPF / NPS / PPF)">
              <select value={form.has_retirement_savings ? 'yes' : 'no'}
                onChange={e => set('has_retirement_savings', e.target.value === 'yes')}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </FormField>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <PrimaryButton onClick={submit} loading={loading}>
            Calculate my money health score
          </PrimaryButton>
        </Card>
      ) : (
        <HealthResults result={result} onReset={() => setResult(null)} />
      )}
      <Glossary items={[
        ['Emergency fund', 'Money you can reach quickly (savings, liquid funds). Aim for 6 months of expenses.'],
        ['Term insurance', 'Pure life cover that pays your family if you die. Aim for about 10× your yearly income.'],
        ['Savings rate', 'The share of income left after expenses and EMIs. 20% or more is healthy.'],
        ['EMI', 'Monthly loan repayment. Keep total EMIs under 20% of income.'],
        ['EPF / NPS / PPF', 'Government-backed retirement savings schemes.'],
      ]} />
    </div>
  );
}

const DIM_LABELS = {
  emergency: 'Emergency fund',
  insurance: 'Insurance',
  investments: 'Investments',
  debt: 'Debt',
  tax: 'Tax efficiency',
  retirement: 'Retirement',
};

const STATUS_BADGE = {
  excellent: 'success',
  good: 'success',
  fair: 'warning',
  poor: 'warning',
  critical: 'danger',
};

function HealthResults({ result, onReset }) {
  const dims = result.dimensions || {};
  const radarData = Object.entries(dims).map(([key, val]) => ({
    dimension: DIM_LABELS[key] || key,
    score: val.score,
  }));

  const gradeColor = {
    A: '#16a34a', B: '#22c55e', C: '#d97706', D: '#f97316', F: '#dc2626',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Overall score */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <ScoreRing score={result.overall_score} size={110} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: gradeColor[result.grade] || '#2563eb' }}>
                Grade {result.grade}
              </span>
              <Badge type={result.overall_score >= 75 ? 'success' : result.overall_score >= 50 ? 'warning' : 'danger'}>
                {result.overall_score >= 75 ? 'Healthy' : result.overall_score >= 50 ? 'Needs attention' : 'Critical'}
              </Badge>
            </div>
            <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7, marginBottom: 10 }}>{result.summary}</p>
            <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
              <strong>Top priority:</strong> {result.top_priority}
            </div>
          </div>
        </div>
      </Card>

      {/* Radar chart */}
      <Card>
        <SectionTitle>Score breakdown</SectionTitle>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f3f4f6" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Radar name="Score" dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} />
              <Tooltip formatter={(v) => [v + '/100', 'Score']} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Dimension cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {Object.entries(dims).map(([key, val]) => (
          <div key={key} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{DIM_LABELS[key]}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{val.score}</span>
                <Badge type={STATUS_BADGE[val.status] || 'gray'}>{val.status}</Badge>
              </div>
            </div>
            {/* Score bar */}
            <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, marginBottom: 8 }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${val.score}%`,
                background: val.score >= 75 ? '#16a34a' : val.score >= 50 ? '#d97706' : '#dc2626',
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
              <StatusDot status={val.status} />
              Current: {val.current}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>Target: {val.target}</div>
            <div style={{
              fontSize: 11, background: '#f9fafb', borderRadius: 6,
              padding: '6px 8px', color: '#374151', lineHeight: 1.5,
            }}>{val.action}</div>
          </div>
        ))}
      </div>

      {/* 3-month action plan */}
      {result.monthly_action_plan?.length > 0 && (
        <Card>
          <SectionTitle>Your 3-month action plan</SectionTitle>
          <div style={{ display: 'flex', gap: 12 }}>
            {result.monthly_action_plan.map((m, i) => (
              <div key={i} style={{
                flex: 1, background: '#f9fafb', borderRadius: 8, padding: '14px',
                borderTop: `3px solid ${['#2563eb', '#7c3aed', '#16a34a'][i]}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>
                  MONTH {m.month}
                </div>
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 8, lineHeight: 1.5 }}>{m.action}</div>
                {m.amount > 0 && (
                  <div style={{ fontWeight: 600, color: '#2563eb', fontSize: 13 }}>{fmt(m.amount)}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <button
        onClick={onReset}
        style={{
          background: 'none', border: '1px solid #e5e7eb',
          color: '#6b7280', padding: '10px', borderRadius: 10, fontSize: 13,
        }}
      >Recalculate with different numbers</button>
      <Disclaimer text={result.disclaimer} />
    </div>
  );
}
