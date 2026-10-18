import React, { useState } from 'react';
import TaxWizard from './pages/TaxWizard';
import HealthScore from './pages/HealthScore';

const NAV = [
  { id: 'tax', label: 'Tax Wizard' },
  { id: 'health', label: 'Money Health Score' },
];

export default function App() {
  const [page, setPage] = useState('tax');

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa' }}>
      {/* Header */}
      <div className="app-header" style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 600, fontSize: 15,
          }}>₹</div>
          <span style={{ fontWeight: 600, fontSize: 15 }}>AI Money Mentor</span>
        </div>

        <nav style={{ display: 'flex', gap: 4 }}>
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              style={{
                padding: '6px 16px',
                border: 'none',
                borderRadius: 8,
                background: page === n.id ? '#eff6ff' : 'transparent',
                color: page === n.id ? '#2563eb' : '#6b7280',
                fontWeight: page === n.id ? 600 : 400,
              }}
            >{n.label}</button>
          ))}
        </nav>

        <div className="tagline" style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
          ET AI Hackathon 2026 · PS9
        </div>
      </div>

      {/* Page */}
      <div className="page" style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
        {page === 'tax' ? <TaxWizard /> : <HealthScore />}
      </div>
    </div>
  );
}
