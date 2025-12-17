'use client';

import { useState } from 'react';

export default function ExportSIE() {
  const [companyName, setCompanyName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [fiscalYearStart, setFiscalYearStart] = useState('2025-01-01');
  const [fiscalYearEnd, setFiscalYearEnd] = useState('2025-12-31');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          orgNumber,
          fiscalYearStart,
          fiscalYearEnd,
        }),
      });

      if (!res.ok) {
        throw new Error('Kunde inte generera SIE-fil');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bokforing_${new Date().toISOString().split('T')[0]}.se`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <h2 className="text-2xl font-serif mb-6" style={{ color: 'var(--text-primary)' }}>Exportera SIE-fil</h2>

      <form onSubmit={handleExport} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Företagsnamn</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="input-field"
            placeholder="Mitt Film AB"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Organisationsnummer</label>
          <input
            type="text"
            value={orgNumber}
            onChange={(e) => setOrgNumber(e.target.value)}
            className="input-field"
            placeholder="XXXXXX-XXXX"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Räkenskapsår start</label>
            <input
              type="date"
              value={fiscalYearStart}
              onChange={(e) => setFiscalYearStart(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Räkenskapsår slut</label>
            <input
              type="date"
              value={fiscalYearEnd}
              onChange={(e) => setFiscalYearEnd(e.target.value)}
              className="input-field"
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? 'Genererar...' : 'Ladda ner SIE-fil'}
        </button>
      </form>

      <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
        <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>💡 Tips</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          SIE-filen kan importeras i de flesta bokföringsprogram och lämnas till din revisor.
          Filen följer SIE typ 4 standarden.
        </p>
      </div>
    </div>
  );
}
