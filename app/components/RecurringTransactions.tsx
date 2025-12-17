'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Account {
  id: number;
  number: number;
  name: string;
  type: string;
}

interface RecurringEntry {
  accountId: number;
  debit: number;
  credit: number;
  account?: Account;
}

interface RecurringTransaction {
  id: number;
  description: string;
  frequency: string;
  startDate: string;
  endDate: string | null;
  dayOfMonth: number;
  isActive: boolean;
  lastGenerated: string | null;
  entries: RecurringEntry[];
}

export default function RecurringTransactions() {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [entries, setEntries] = useState<RecurringEntry[]>([
    { accountId: 0, debit: 0, credit: 0 },
    { accountId: 0, debit: 0, credit: 0 },
  ]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recurringRes, accountsRes] = await Promise.all([
        fetch('/api/recurring'),
        fetch('/api/accounts'),
      ]);
      const recurringData = await recurringRes.json();
      const accountsData = await accountsRes.json();
      setRecurring(recurringData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addEntry = () => {
    setEntries([...entries, { accountId: 0, debit: 0, credit: 0 }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof RecurringEntry, value: any) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const calculateBalance = () => {
    const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    return { totalDebit, totalCredit, diff: totalDebit - totalCredit };
  };

  const resetForm = () => {
    setDescription('');
    setFrequency('MONTHLY');
    setStartDate(new Date().toISOString().split('T')[0]);
    setDayOfMonth(1);
    setEndDate('');
    setEntries([{ accountId: 0, debit: 0, credit: 0 }, { accountId: 0, debit: 0, credit: 0 }]);
    setEditingId(null);
    setError('');
  };

  const handleEdit = (item: RecurringTransaction) => {
    setEditingId(item.id);
    setDescription(item.description);
    setFrequency(item.frequency);
    setStartDate(new Date(item.startDate).toISOString().split('T')[0]);
    setEndDate(item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '');
    setDayOfMonth(item.dayOfMonth);
    setEntries(item.entries.map(e => ({
      accountId: e.account ? e.account.id : e.accountId,
      debit: e.debit,
      credit: e.credit,
    })));
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { diff } = calculateBalance();
    if (Math.abs(diff) > 0.01) {
      setError('Debet och kredit måste balansera!');
      return;
    }

    const validEntries = entries.filter(e => e.accountId > 0 && (e.debit > 0 || e.credit > 0));

    try {
      const res = await fetch('/api/recurring', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          description,
          frequency,
          startDate,
          endDate: endDate || null,
          dayOfMonth,
          entries: validEntries,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Något gick fel');
      }

      resetForm();
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    try {
      await fetch('/api/recurring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      fetchData();
    } catch (error) {
      console.error('Error toggling active:', error);
    }
  };

  const deleteRecurring = async (id: number) => {
    if (!confirm('Är du säker på att du vill ta bort denna återkommande betalning?')) return;
    try {
      await fetch(`/api/recurring?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const generateTransaction = async (id: number) => {
    setGenerating(id);
    try {
      const res = await fetch('/api/recurring/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || data.message || 'Kunde inte generera transaktion');
      } else {
        alert('Transaktion skapad!');
        fetchData();
      }
    } catch (error) {
      alert('Fel vid generering av transaktion');
    } finally {
      setGenerating(null);
    }
  };

  const { totalDebit, totalCredit, diff } = calculateBalance();

  const frequencyLabels: Record<string, string> = {
    MONTHLY: 'Månatlig',
    QUARTERLY: 'Kvartalsvis',
    YEARLY: 'Årlig',
  };

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--border-color-strong)', borderTopColor: 'var(--text-primary)' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Laddar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif" style={{ color: 'var(--text-primary)' }}>🔄 Återkommande betalningar</h2>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
              setShowForm(false);
            } else {
              setShowForm(true);
            }
          }}
          className="btn-primary"
        >
          {showForm ? 'Avbryt' : '+ Ny återkommande betalning'}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6">
          <h3 className="text-xl font-serif mb-4" style={{ color: 'var(--text-primary)' }}>
            {editingId ? 'Redigera återkommande betalning' : 'Skapa återkommande betalning'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Beskrivning</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                  placeholder="T.ex. 'Försäkring Folksam'"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Frekvens</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="select-field">
                  <option value="MONTHLY">Månatlig</option>
                  <option value="QUARTERLY">Kvartalsvis</option>
                  <option value="YEARLY">Årlig</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Startdatum</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Slutdatum (valfritt)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Dag i månaden</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Konteringar</h4>
                <button type="button" onClick={addEntry} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
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
                        className="select-field text-sm"
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
                        className="input-field text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.01"
                        value={entry.credit || ''}
                        onChange={(e) => updateEntry(index, 'credit', parseFloat(e.target.value) || 0)}
                        placeholder="Kredit"
                        className="input-field text-sm"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      {entries.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(index)}
                          className="text-red-500 hover:text-red-400"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>Total debet:</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{totalDebit.toFixed(2)} kr</span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>Total kredit:</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{totalCredit.toFixed(2)} kr</span>
                </div>
                <div className={`flex justify-between text-sm font-bold mt-2 pt-2 ${Math.abs(diff) < 0.01 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <span>Differens:</span>
                  <span>{diff.toFixed(2)} kr</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-300 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={Math.abs(diff) > 0.01}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? 'Uppdatera återkommande betalning' : 'Spara återkommande betalning'}
            </button>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        {recurring.length === 0 ? (
          <div className="p-6 text-center" style={{ color: 'var(--text-muted)' }}>
            Inga återkommande betalningar ännu. Skapa din första!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="table-header">Status</th>
                  <th className="table-header">Beskrivning</th>
                  <th className="table-header">Frekvens</th>
                  <th className="table-header">Dag</th>
                  <th className="table-header">Senast</th>
                  <th className="table-header">Belopp</th>
                  <th className="table-header text-right">Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {recurring.map((item) => {
                  const totalAmount = item.entries.reduce((sum, e) => sum + e.debit, 0);
                  return (
                    <tr key={item.id} className={`table-row ${!item.isActive ? 'opacity-50' : ''}`}>
                      <td className="table-cell">
                        <span className={`text-xs px-2 py-1 rounded-full ${item.isActive ? 'badge-success' : 'badge'}`}>
                          {item.isActive ? 'Aktiv' : 'Pausad'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.description}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Start: {format(new Date(item.startDate), 'yyyy-MM-dd')}
                          {item.endDate && ` | Slut: ${format(new Date(item.endDate), 'yyyy-MM-dd')}`}
                        </div>
                      </td>
                      <td className="table-cell" style={{ color: 'var(--text-secondary)' }}>{frequencyLabels[item.frequency]}</td>
                      <td className="table-cell" style={{ color: 'var(--text-secondary)' }}>Den {item.dayOfMonth}:e</td>
                      <td className="table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {item.lastGenerated ? format(new Date(item.lastGenerated), 'yyyy-MM-dd') : 'Aldrig'}
                      </td>
                      <td className="table-cell font-medium" style={{ color: 'var(--text-primary)' }}>{totalAmount.toFixed(2)} kr</td>
                      <td className="table-cell text-right space-x-2">
                        <button
                          onClick={() => generateTransaction(item.id)}
                          disabled={!item.isActive || generating === item.id}
                          className="transition-colors disabled:opacity-30"
                          style={{ color: 'var(--text-muted)' }}
                          title="Generera transaktion"
                        >
                          {generating === item.id ? '...' : '▶'}
                        </button>
                        <button onClick={() => handleEdit(item)} style={{ color: 'var(--text-muted)' }} title="Redigera">
                          ✏️
                        </button>
                        <button
                          onClick={() => toggleActive(item.id, item.isActive)}
                          className="hover:text-amber-500"
                          style={{ color: 'var(--text-muted)' }}
                          title={item.isActive ? 'Pausa' : 'Aktivera'}
                        >
                          {item.isActive ? '⏸' : '▶'}
                        </button>
                        <button onClick={() => deleteRecurring(item.id)} className="hover:text-red-500" style={{ color: 'var(--text-muted)' }} title="Ta bort">
                          🗑
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-card-solid p-4">
        <h3 className="font-serif mb-2" style={{ color: 'var(--text-primary)' }}>💡 Tips om återkommande betalningar</h3>
        <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <li>• Perfekt för försäkringar, hyror, prenumerationer och andra fasta kostnader</li>
          <li>• Tryck på ▶ för att manuellt generera en transaktion</li>
          <li>• Pausa en återkommande betalning med ⏸ om du tillfälligt inte vill använda den</li>
        </ul>
      </div>
    </div>
  );
}
