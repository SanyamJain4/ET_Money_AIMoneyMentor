import React, { useState } from 'react';
import api from '../api';
import {
  Card, MetricCard, Badge, PrimaryButton, SectionTitle,
  FormRow, FormField, DemoButton, fmt,
  apiError, Disclaimer, HowToUse, Glossary, Notice,
} from '../components/UI';

const DEMO = {
  gross_salary: 1200000,
  hra_received: 240000,
  rent_paid: 180000,
  is_metro: true,
  parents_senior: false,
  employer_nps_80ccd2: 0,
  investments_80c: 85000,
  premium_80d_self: 12000,
  premium_80d_parents: 0,
  nps_80ccd: 0,
  home_loan_interest: 0,
  other_deductions: 0,
  age: 28,
};

const DEFAULT = {
  gross_salary: '', parents_senior: false, employer_nps_80ccd2: '', hra_received: '', rent_paid: '', is_metro: true,
  investments_80c: '', premium_80d_self: '', premium_80d_parents: '',
  nps_80ccd: '', home_loan_interest: '', other_deductions: '', age: 28,
};

function n(v) { return v === '' ? 0 : Number(v); }

export default function TaxWizard() {
  const [form, setForm] = useState(DEFAULT);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    if (!(n(form.gross_salary) > 0)) { setError('Please enter your gross salary.'); return; }
    if (Object.values(form).some(v => typeof v !== 'boolean' && Number(v) < 0)) { setError('Amounts cannot be negative.'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const payload = {
        gross_salary: n(form.gross_salary),
        hra_received: n(form.hra_received),
        rent_paid: n(form.rent_paid),
        is_metro: form.is_metro,
        parents_senior: form.parents_senior,
        employer_nps_80ccd2: n(form.employer_nps_80ccd2),
        investments_80c: n(form.investments_80c),
        premium_80d_self: n(form.premium_80d_self),
        premium_80d_parents: n(form.premium_80d_parents),
        nps_80ccd: n(form.nps_80ccd),
        home_loan_interest: n(form.home_loan_interest),
        other_deductions: n(form.other_deductions),
        age: n(form.age),
      };
      const { data } = await api.post('/tax-wizard', payload);
      setResult(data);
    } catch (e) {
      setError(apiError(e));
    }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Tax Wizard</h1>
        <p style={{ color: '#6b7280', fontSize: 13 }}>
          Find out which tax regime saves you more — and every deduction you're missing.
        </p>
      </div>

      {!result && (
        <HowToUse id="tax" title="How to use the Tax Wizard"
          steps={[
            'Click "Load demo data" to see an example, or enter your own yearly figures (from your payslip / Form 16).',
            'Only gross salary is required. Leave anything you do not have blank, it counts as ₹0.',
            'Press "Analyse my taxes" to compare the old and new regime side by side.',
            'Read the result: pick the cheaper regime, then see which deductions you could still use.',
          ]}
          note="Your numbers are used only to calculate your result and are not stored." />
      )}

      {!result ? (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <SectionTitle>Your salary & investments</SectionTitle>
            <DemoButton onClick={() => setForm(DEMO)} />
          </div>

          <FormRow>
            <FormField label="Gross annual salary (₹)" hint="Total yearly pay before tax, see Form 16 or your payslip × 12.">
              <input type="number" placeholder="e.g. 1200000" value={form.gross_salary}
                onChange={e => set('gross_salary', e.target.value)} />
            </FormField>
            <FormField label="Age" hint="Seniors (60+) get a higher tax-free limit in the old regime.">
              <input type="number" placeholder="28" value={form.age}
                onChange={e => set('age', e.target.value)} />
            </FormField>
          </FormRow>

          <FormRow>
            <FormField label="HRA received annually (₹)" hint="Leave blank if your salary has no HRA.">
              <input type="number" placeholder="e.g. 240000" value={form.hra_received}
                onChange={e => set('hra_received', e.target.value)} />
            </FormField>
            <FormField label="Annual rent paid (₹)" hint="Total rent paid in the year. Needed to compute your HRA exemption.">
              <input type="number" placeholder="e.g. 180000" value={form.rent_paid}
                onChange={e => set('rent_paid', e.target.value)} />
            </FormField>
          </FormRow>

          <div style={{ marginBottom: 16 }}>
            <FormField label="City type">
              <select value={form.is_metro ? 'metro' : 'nonmetro'}
                onChange={e => set('is_metro', e.target.value === 'metro')}>
                <option value="metro">Metro (Delhi, Mumbai, Kolkata, Chennai)</option>
                <option value="nonmetro">Non-metro</option>
              </select>
            </FormField>
          </div>

          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginBottom: 16 }}>
            <SectionTitle>Investments & deductions</SectionTitle>
          </div>

          <FormRow>
            <FormField label="Section 80C investments (₹) — Max 1,50,000" hint="PF + PPF + ELSS + life insurance + tuition fees.">
              <input type="number" placeholder="PF + ELSS + LIC + PPF" value={form.investments_80c}
                onChange={e => set('investments_80c', e.target.value)} />
            </FormField>
            <FormField label="NPS 80CCD(1B) (₹) — Max 50,000" hint="Your own extra NPS contribution.">
              <input type="number" placeholder="Additional NPS contribution" value={form.nps_80ccd}
                onChange={e => set('nps_80ccd', e.target.value)} />
            </FormField>
          </FormRow>

          <FormRow>
            <FormField label="Health insurance 80D — self (₹)" hint="Premium for you, spouse and children (max ₹25,000, or ₹50,000 if 60+).">
              <input type="number" placeholder="Your own premium" value={form.premium_80d_self}
                onChange={e => set('premium_80d_self', e.target.value)} />
            </FormField>
            <FormField label="Health insurance 80D — parents (₹)" hint="Max ₹25,000, or ₹50,000 if your parents are 60+.">
              <input type="number" placeholder="Parents' premium" value={form.premium_80d_parents}
                onChange={e => set('premium_80d_parents', e.target.value)} />
            </FormField>
          </FormRow>

          <FormRow>
            <FormField label="Employer NPS 80CCD(2) (₹) — optional">
              <input type="number" placeholder="Employer contribution to NPS" value={form.employer_nps_80ccd2}
                onChange={e => set('employer_nps_80ccd2', e.target.value)} />
            </FormField>
            <FormField label="Are your parents 60 or older?">
              <select value={form.parents_senior ? 'yes' : 'no'}
                onChange={e => set('parents_senior', e.target.value === 'yes')}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </FormField>
          </FormRow>

          <FormRow>
            <FormField label="Home loan interest — Section 24(b) (₹)" hint="Interest only, not the principal. Max ₹2,00,000.">
              <input type="number" placeholder="Annual interest paid" value={form.home_loan_interest}
                onChange={e => set('home_loan_interest', e.target.value)} />
            </FormField>
            <FormField label="Other deductions (₹)" hint="Donations (80G), education-loan interest (80E), etc.">
              <input type="number" placeholder="80G, 80E, etc." value={form.other_deductions}
                onChange={e => set('other_deductions', e.target.value)} />
            </FormField>
          </FormRow>

          {error && (
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <PrimaryButton onClick={submit} loading={loading}>
            Analyse my taxes
          </PrimaryButton>
        </Card>
      ) : (
        <TaxResults result={result} onReset={() => setResult(null)} />
      )}
      <Glossary items={[
        ['Old vs new regime', 'Two ways to calculate income tax. The old regime allows deductions (80C, HRA, etc.) but has higher rates; the new regime has lower rates and almost no deductions.'],
        ['80C', 'Up to ₹1.5 lakh a year deducted for PF, PPF, ELSS funds, life insurance and tuition fees.'],
        ['80CCD(1B)', 'An extra ₹50,000 deduction for your own NPS (National Pension System) contribution.'],
        ['80CCD(2)', 'Your employer’s NPS contribution, deductible even in the new regime.'],
        ['80D', 'Deduction for health insurance premiums for you and your parents.'],
        ['HRA', 'House Rent Allowance. Part of it is tax free if you pay rent.'],
        ['Section 24(b)', 'Up to ₹2 lakh of home-loan interest is deductible in the old regime.'],
        ['87A rebate', 'Tax is zero if taxable income is up to ₹7 lakh (new regime) or ₹5 lakh (old regime).'],
      ]} />
    </div>
  );
}

function TaxResults({ result, onReset }) {
  const isNew = result.recommended_regime === 'new';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Metric row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <MetricCard label="Old regime tax" value={fmt(result.tax_old)} />
        <MetricCard label="New regime tax" value={fmt(result.tax_new)} />
        <MetricCard
          label="You save by choosing correctly"
          value={fmt(result.tax_saving)}
          color="#16a34a"
          bg="#f0fdf4"
        />
      </div>

      {/* Verdict */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Badge type="success">Recommended</Badge>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            Switch to {isNew ? 'New' : 'Old'} Regime
          </span>
        </div>
        <p style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.7 }}>{result.verdict}</p>
      </Card>

      {/* Missing deductions */}
      {result.missing_deductions?.length > 0 && (
        <Card>
          <SectionTitle>Deductions you're not using</SectionTitle>
          <div style={{ marginBottom: 12 }}>
            <Notice type={isNew ? 'warn' : 'info'}>
              {isNew
                ? 'These deductions only reduce tax under the old regime. Right now the new regime is still cheaper for you, so use them only if you would switch to the old regime.'
                : 'These savings apply because you are on the old regime. Filling the gaps lowers your tax further.'}
            </Notice>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {result.missing_deductions.map((d, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '12px 14px', background: '#f9fafb', borderRadius: 8,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>
                    {d.name} — <span style={{ color: '#6b7280' }}>Section {d.section}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{d.description}</div>
                  {d.gap_amount > 0 && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      Gap: {fmt(d.gap_amount)}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 600, color: '#16a34a', fontSize: 13, whiteSpace: 'nowrap', marginLeft: 16 }}>
                  Save {fmt(d.potential_saving)}
                </div>
              </div>
            ))}
          </div>
          {result.total_additional_saving_possible > 0 && (
            <div style={{
              marginTop: 12, padding: '10px 14px', background: '#f0fdf4',
              borderRadius: 8, fontWeight: 600, color: '#16a34a', fontSize: 13,
            }}>
              Total additional saving possible: {fmt(result.total_additional_saving_possible)}
            </div>
          )}
        </Card>
      )}

      {/* Top investments */}
      {result.top_investments?.length > 0 && (
        <Card>
          <SectionTitle>Best tax-saving investments for you</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.top_investments.map((inv, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: '#eff6ff', color: '#2563eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{inv.name}</span>
                    <Badge type={inv.liquidity === 'high' ? 'success' : inv.liquidity === 'medium' ? 'warning' : 'gray'}>
                      {inv.liquidity} liquidity
                    </Badge>
                    {inv.lock_in && <Badge type="gray">{inv.lock_in}</Badge>}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{inv.why}</div>
                </div>
                <div style={{ fontWeight: 600, color: '#16a34a', fontSize: 13, whiteSpace: 'nowrap' }}>
                  {fmt(inv.annual_saving)}/yr
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Action items */}
      {result.action_items?.length > 0 && (
        <Card>
          <SectionTitle>Your action checklist</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.action_items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 20, height: 20, border: '2px solid #e5e7eb',
                  borderRadius: 5, flexShrink: 0, marginTop: 1,
                }} />
                <span style={{ fontSize: 13, color: '#374151' }}>{item}</span>
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
      >Start over with different numbers</button>
      <Disclaimer text={result.disclaimer} />
    </div>
  );
}
