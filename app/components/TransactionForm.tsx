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

interface Transaction {
  id: number;
  date: string;
  description: string;
  entries: Array<{
    accountId: number;
    debit: number;
    credit: number;
  }>;
  attachments?: Array<{
    id: number;
    filename: string;
    originalName: string;
  }>;
}

export default function TransactionForm({
  onSuccess,
  editTransaction,
  onCancelEdit
}: {
  onSuccess: () => void;
  editTransaction?: Transaction | null;
  onCancelEdit?: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState<Entry[]>([
    { accountId: 0, debit: 0, credit: 0 },
    { accountId: 0, debit: 0, credit: 0 },
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Array<{ id: number; filename: string; originalName: string }>>([]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (editTransaction) {
      setDate(editTransaction.date.split('T')[0]);
      setDescription(editTransaction.description);
      setEntries(editTransaction.entries.map(e => ({
        accountId: e.accountId,
        debit: e.debit,
        credit: e.credit
      })));
      setExistingAttachments(editTransaction.attachments || []);
      setSelectedFiles([]);
    }
  }, [editTransaction]);

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

  const getAccountIdByNumber = (accountNumber: number): number => {
    const account = accounts.find(acc => acc.number === accountNumber);
    return account ? account.id : 0;
  };

  const applyTemplate = (templateType: string) => {
    setSelectedTemplate(templateType);

    switch (templateType) {
      case 'income_25':
        setDescription('Försäljning tjänst');
        setEntries([
          { accountId: getAccountIdByNumber(1930), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(3000), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(2610), debit: 0, credit: 0 },
        ]);
        break;

      case 'income_invoice':
        setDescription('Faktura');
        setEntries([
          { accountId: getAccountIdByNumber(1510), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(3000), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(2610), debit: 0, credit: 0 },
        ]);
        break;

      case 'expense_inventory':
        setDescription('Inköp förbrukningsinventarier');
        setEntries([
          { accountId: getAccountIdByNumber(5400), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(2640), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(1930), debit: 0, credit: 0 },
        ]);
        break;

      case 'expense_equipment':
        setDescription('Inköp inventarier');
        setEntries([
          { accountId: getAccountIdByNumber(1220), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(2640), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(1930), debit: 0, credit: 0 },
        ]);
        break;

      case 'expense_subscription':
        setDescription('Prenumeration');
        setEntries([
          { accountId: getAccountIdByNumber(5410), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(2640), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(1930), debit: 0, credit: 0 },
        ]);
        break;

      case 'expense_insurance':
        setDescription('Försäkring');
        setEntries([
          { accountId: getAccountIdByNumber(6310), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(1930), debit: 0, credit: 0 },
        ]);
        break;

      case 'expense_rent':
        setDescription('Hyra utrustning');
        setEntries([
          { accountId: getAccountIdByNumber(6071), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(2640), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(1930), debit: 0, credit: 0 },
        ]);
        break;

      case 'owner_loan_in':
        setDescription('Ägarlån till företaget');
        setEntries([
          { accountId: getAccountIdByNumber(1930), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(2890), debit: 0, credit: 0 },
        ]);
        break;

      case 'owner_loan_out':
        setDescription('Återbetalning ägarlån');
        setEntries([
          { accountId: getAccountIdByNumber(2890), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(1930), debit: 0, credit: 0 },
        ]);
        break;

      case 'owner_expense':
        setDescription('Utlägg från privat');
        setEntries([
          { accountId: 0, debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(2640), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(2893), debit: 0, credit: 0 },
        ]);
        break;

      case 'owner_expense_repay':
        setDescription('Återbetalning utlägg');
        setEntries([
          { accountId: getAccountIdByNumber(2893), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(1930), debit: 0, credit: 0 },
        ]);
        break;

      case 'depreciation':
        setDescription('Avskrivning inventarier');
        setEntries([
          { accountId: getAccountIdByNumber(7810), debit: 0, credit: 0 },
          { accountId: getAccountIdByNumber(1229), debit: 0, credit: 0 },
        ]);
        break;

      default:
        setDescription('');
        setEntries([
          { accountId: 0, debit: 0, credit: 0 },
          { accountId: 0, debit: 0, credit: 0 },
        ]);
    }
  };

  const calculateBalance = () => {
    const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    return { totalDebit, totalCredit, diff: totalDebit - totalCredit };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles([...selectedFiles, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const deleteExistingAttachment = async (attachmentId: number) => {
    if (!confirm('Vill du radera denna bilaga?')) {
      return;
    }

    try {
      await fetch(`/api/upload?id=${attachmentId}`, {
        method: 'DELETE',
      });
      setExistingAttachments(existingAttachments.filter(a => a.id !== attachmentId));
    } catch (err) {
      alert('Kunde inte radera bilaga');
    }
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

    const validEntries = entries.filter(e => e.accountId > 0 && (e.debit > 0 || e.credit > 0));

    try {
      const isEdit = editTransaction !== null && editTransaction !== undefined;
      const res = await fetch('/api/transactions', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit && { id: editTransaction.id }),
          date,
          description,
          entries: validEntries,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Något gick fel');
      }

      const transaction = await res.json();

      if (selectedFiles.length > 0) {
        const transactionId = isEdit ? editTransaction.id : transaction.id;
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('transactionId', transactionId.toString());

          await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
        }
      }

      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setEntries([
        { accountId: 0, debit: 0, credit: 0 },
        { accountId: 0, debit: 0, credit: 0 },
      ]);
      setSelectedTemplate('');
      setSelectedFiles([]);
      setExistingAttachments([]);
      if (onCancelEdit) onCancelEdit();
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const { totalDebit, totalCredit, diff } = calculateBalance();

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif" style={{ color: 'var(--text-primary)' }}>
          {editTransaction ? 'Redigera verifikation' : 'Ny verifikation'}
        </h2>
        {editTransaction && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="btn-ghost text-sm"
          >
            Avbryt
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {!editTransaction && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Välj mall (valfritt)</label>
            <select
              value={selectedTemplate}
              onChange={(e) => applyTemplate(e.target.value)}
              className="select-field"
            >
              <option value="">-- Välj mall --</option>
              <optgroup label="📈 Intäkter">
                <option value="income_25">Försäljning tjänst (25% moms, betald)</option>
                <option value="income_invoice">Faktura skickad (ej betald)</option>
              </optgroup>
              <optgroup label="📉 Utgifter">
                <option value="expense_inventory">Inköp förbrukningsinventarier</option>
                <option value="expense_equipment">Inköp större utrustning</option>
                <option value="expense_subscription">Prenumeration</option>
                <option value="expense_insurance">Försäkring (ingen moms)</option>
                <option value="expense_rent">Hyra utrustning</option>
              </optgroup>
              <optgroup label="👤 Ägare">
                <option value="owner_loan_in">Ägarlån till företaget</option>
                <option value="owner_loan_out">Återbetalning ägarlån</option>
                <option value="owner_expense">Utlägg från privat konto</option>
                <option value="owner_expense_repay">Återbetalning utlägg</option>
              </optgroup>
              <optgroup label="📉 Avskrivningar">
                <option value="depreciation">Avskrivning inventarier</option>
              </optgroup>
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Beskrivning</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              placeholder="T.ex. 'Utlägg kamera Sony'"
              required
            />
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Konteringar</h3>
            <button
              type="button"
              onClick={addEntry}
              className="text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}
            >
              + Lägg till rad
            </button>
          </div>

          <div className="space-y-3">
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
                      className="text-red-500 hover:text-red-400 transition-colors"
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
            <div className={`flex justify-between text-sm font-bold mt-3 pt-3 ${Math.abs(diff) < 0.01 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} style={{ borderTop: '1px solid var(--border-color)' }}>
              <span>Differens:</span>
              <span>{diff.toFixed(2)} kr</span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Bifoga kvitton/fakturor</h3>

          {editTransaction && existingAttachments.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Befintliga bilagor:</p>
              {existingAttachments.map((att) => (
                <div key={att.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                  <a
                    href={`/uploads/${att.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm truncate hover:underline" style={{ color: 'var(--text-secondary)' }}
                  >
                    📎 {att.originalName}
                  </a>
                  <button
                    type="button"
                    onClick={() => deleteExistingAttachment(att.id)}
                    className="text-red-500 hover:text-red-400 ml-2"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            onChange={handleFileChange}
            className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
          />
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            PDF, JPG eller PNG. Max 10MB per fil.
          </p>

          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nya filer att bifoga:</p>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                  <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-400 ml-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || Math.abs(diff) > 0.01}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sparar...' : (editTransaction ? 'Uppdatera verifikation' : 'Spara verifikation')}
        </button>
      </form>
    </div>
  );
}
