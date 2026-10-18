import React from 'react';

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: '20px 24px',
      ...style,
    }}>{children}</div>
  );
}

export function MetricCard({ label, value, color = '#1a1a2e', bg = '#f9fafb' }) {
  return (
    <div style={{
      background: bg,
      borderRadius: 10,
      padding: '14px 18px',
      border: '1px solid #e5e7eb',
    }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

export function Badge({ children, type = 'info' }) {
  const colors = {
    success: { bg: '#f0fdf4', color: '#16a34a' },
    warning: { bg: '#fffbeb', color: '#d97706' },
    danger:  { bg: '#fef2f2', color: '#dc2626' },
    info:    { bg: '#eff6ff', color: '#2563eb' },
    gray:    { bg: '#f3f4f6', color: '#6b7280' },
  };
  const c = colors[type] || colors.info;
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      fontSize: 11,
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 20,
      letterSpacing: '0.03em',
    }}>{children}</span>
  );
}

export function PrimaryButton({ children, onClick, loading, disabled, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: disabled || loading ? '#93c5fd' : '#2563eb',
        color: '#fff',
        border: 'none',
        padding: '12px 28px',
        fontWeight: 600,
        fontSize: 14,
        borderRadius: 10,
        width: '100%',
        opacity: disabled ? 0.7 : 1,
        ...style,
      }}
    >{loading ? 'Analysing… (first request can take ~30s on free hosting)' : children}</button>
  );
}

export function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #f3f4f6' }}>
      {children}
    </div>
  );
}

export function FormRow({ children }) {
  return (
    <div className="form-row" style={{ marginBottom: 16 }}>
      {children}
    </div>
  );
}

export function FormField({ label, hint, children }) {
  return (
    <div>
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function DemoButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#f3f4f6',
        border: '1px solid #e5e7eb',
        color: '#6b7280',
        padding: '8px 18px',
        fontSize: 12,
        borderRadius: 8,
      }}
    >Load demo data</button>
  );
}

export function ScoreRing({ score, size = 100 }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>{score}</text>
      <text x="50" y="60" textAnchor="middle" fontSize="10" fill="#9ca3af">/100</text>
    </svg>
  );
}

export function StatusDot({ status }) {
  const colors = {
    excellent: '#16a34a',
    good: '#22c55e',
    fair: '#d97706',
    poor: '#f97316',
    critical: '#dc2626',
  };
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: colors[status] || '#9ca3af',
      marginRight: 6,
    }} />
  );
}

export function fmt(n) {
  if (!n && n !== 0) return '—';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

// Turn an axios error into a safe, human-readable string.
export function apiError(e) {
  if (e.response?.status === 429) return 'Too many requests. Please wait a minute and try again.';
  const d = e.response?.data?.detail;
  if (Array.isArray(d)) return d.map(x => `${(x.loc || []).slice(1).join('.')}: ${x.msg}`).join('; ');
  if (typeof d === 'string') return d;
  if (e.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  return 'Could not reach the server. Is the backend running?';
}

export function Disclaimer({ text }) {
  return (
    <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 }}>
      {text || 'Educational estimates only, not tax or investment advice.'}
    </p>
  );
}

// Collapsible "how to use" guide. Open on first visit; remembers being closed.
export function HowToUse({ id, title, steps, note }) {
  const key = `howto-${id}`;
  const [open, setOpen] = React.useState(() => {
    try { return localStorage.getItem(key) !== 'closed'; } catch (e) { return true; }
  });
  function toggle() {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(key, next ? 'open' : 'closed'); } catch (e) { /* storage unavailable */ }
  }
  return (
    <div className="howto">
      <button className="howto-head" onClick={toggle} aria-expanded={open}>
        <span>💡 {title}</span><span>{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="howto-body">
          <ol>{steps.map((st, i) => <li key={i}>{st}</li>)}</ol>
          {note && <p className="howto-note">{note}</p>}
        </div>
      )}
    </div>
  );
}

// Plain-language glossary of the jargon used on the page.
export function Glossary({ items }) {
  return (
    <details className="glossary">
      <summary>What do these terms mean?</summary>
      <dl>
        {items.map(([term, def]) => (
          <div key={term}><dt>{term}</dt><dd>{def}</dd></div>
        ))}
      </dl>
    </details>
  );
}

export function Notice({ children, type = 'info' }) {
  const c = { info: ['#eff6ff', '#1e40af'], warn: ['#fffbeb', '#92400e'] }[type];
  return <div style={{ background: c[0], color: c[1], padding: '10px 14px', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>{children}</div>;
}
