'use client';

import { useState, useEffect } from 'react';

interface Account {
  id: number;
  number: number;
  name: string;
  type: string;
}

interface Entry {
  accountId: number;
  debit: number;
  credit: number;
}

export default function TransactionForm({ onSuccess }: { onSuccess: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState<Entry[]>([
    { accountId: 0, debit: 0, credit: 0 },
    { accountId: 0, debit: 0, credit: 0 },
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    setAccounts(data);
  };

  const addEntry = () => {
    setEntries([...entries, { accountId: 0, debit: 0, credit: 0 }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof Entry, value: any) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const calculateBalance = () => {
    const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    return { totalDebit, totalCredit, diff: totalDebit - totalCredit };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { diff } = calculateBalance();
    if (Math.abs(diff) > 0.01) {
      setError('Debet och kredit måste balansera!');
      setLoading(false);
      return;
    }

    // Filtrera bort tomma rader
    const validEntries = entries.filter(e => e.accountId > 0 && (e.debit > 0 || e.credit > 0));

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          description,
          entries: validEntries,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Något gick fel');
      }

      // Reset form
      setDescription('');
      setEntries([
        { accountId: 0, debit: 0, credit: 0 },
        { accountId: 0, debit: 0, credit: 0 },
      ]);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const { totalDebit, totalCredit, diff } = calculateBalance();

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Ny verifikation</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Beskrivning</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="T.ex. 'Utlägg kamera Sony'"
              required
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Konteringar</h3>
            <button
              type="button"
              onClick={addEntry}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Lägg till rad
            </button>
          </div>

          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <select
                    value={entry.accountId}
                    onChange={(e) => updateEntry(index, 'accountId', parseInt(e.target.value))}
                    className="w-full px-2 py-2 border rounded text-sm"
                    required
                  >
                    <option value={0}>Välj konto...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.number} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    step="0.01"
                    value={entry.debit || ''}
                    onChange={(e) => updateEntry(index, 'debit', parseFloat(e.target.value) || 0)}
                    placeholder="Debet"
                    className="w-full px-2 py-2 border rounded text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    step="0.01"
                    value={entry.credit || ''}
                    onChange={(e) => updateEntry(index, 'credit', parseFloat(e.target.value) || 0)}
                    placeholder="Kredit"
                    className="w-full px-2 py-2 border rounded text-sm"
                  />
                </div>
                <div className="col-span-1">
                  {entries.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded">
            <div className="flex justify-between text-sm">
              <span>Total debet:</span>
              <span className="font-medium">{totalDebit.toFixed(2)} kr</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total kredit:</span>
              <span className="font-medium">{totalCredit.toFixed(2)} kr</span>
            </div>
            <div className={`flex justify-between text-sm font-bold mt-2 pt-2 border-t ${Math.abs(diff) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
              <span>Differens:</span>
              <span>{diff.toFixed(2)} kr</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || Math.abs(diff) > 0.01}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Sparar...' : 'Spara verifikation'}
        </button>
      </form>
    </div>
  );
}
