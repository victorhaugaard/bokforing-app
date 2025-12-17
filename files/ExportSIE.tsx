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
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Exportera SIE-fil</h2>
      
      <form onSubmit={handleExport} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Företagsnamn</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Mitt Film AB"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Organisationsnummer</label>
          <input
            type="text"
            value={orgNumber}
            onChange={(e) => setOrgNumber(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="XXXXXX-XXXX"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Räkenskapsår start</label>
            <input
              type="date"
              value={fiscalYearStart}
              onChange={(e) => setFiscalYearStart(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Räkenskapsår slut</label>
            <input
              type="date"
              value={fiscalYearEnd}
              onChange={(e) => setFiscalYearEnd(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Genererar...' : 'Ladda ner SIE-fil'}
        </button>
      </form>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-sm">
        <p className="font-medium mb-1">💡 Tips</p>
        <p className="text-gray-700">
          SIE-filen kan importeras i de flesta bokföringsprogram och lämnas till din revisor.
          Filen följer SIE typ 4 standarden.
        </p>
      </div>
    </div>
  );
}
