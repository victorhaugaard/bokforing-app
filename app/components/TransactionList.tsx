'use client';

import { format } from 'date-fns';
import { useState, useMemo } from 'react';

interface Transaction {
  id: number;
  date: string;
  description: string;
  entries: Array<{
    id: number;
    debit: number;
    credit: number;
    account: {
      number: number;
      name: string;
    };
  }>;
  attachments?: Array<{
    id: number;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
  }>;
}

type TransactionCategory = 'income' | 'expense' | 'asset' | 'owner' | 'bank' | 'other';

export default function TransactionList({
  transactions,
  onDelete,
  onEdit
}: {
  transactions: Transaction[];
  onDelete?: () => void;
  onEdit?: (transaction: Transaction) => void;
}) {
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<TransactionCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const categorizeTransaction = (transaction: Transaction): TransactionCategory => {
    const accountNumbers = transaction.entries.map(e => e.account.number);

    if (accountNumbers.some(n => n >= 3000 && n < 4000)) {
      return 'income';
    }
    if (accountNumbers.some(n => n >= 1200 && n < 1300)) {
      return 'asset';
    }
    if (accountNumbers.includes(2893)) {
      return 'owner';
    }
    if (accountNumbers.some(n => n >= 1900 && n < 2000)) {
      return 'bank';
    }
    if (accountNumbers.some(n => n >= 4000 && n < 9000)) {
      return 'expense';
    }
    return 'other';
  };

  const getCategoryBadge = (category: TransactionCategory) => {
    const badges = {
      income: 'badge-success',
      expense: 'bg-red-500/20 text-red-600 dark:text-red-300',
      asset: 'bg-purple-500/20 text-purple-600 dark:text-purple-300',
      owner: 'bg-blue-500/20 text-blue-600 dark:text-blue-300',
      bank: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300',
      other: 'badge',
    };
    return badges[category];
  };

  const getCategoryLabel = (category: TransactionCategory) => {
    const labels = {
      income: '💰 Intäkt',
      expense: '💸 Kostnad',
      asset: '📦 Inventarie',
      owner: '👤 Utlägg',
      bank: '🏦 Bank',
      other: '📋 Övrigt',
    };
    return labels[category];
  };

  const getTransactionTotal = (transaction: Transaction): number => {
    return transaction.entries.reduce((sum, entry) => sum + Math.max(entry.debit, entry.credit), 0) / 2;
  };

  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    if (filterCategory !== 'all') {
      result = result.filter(t => categorizeTransaction(t) === filterCategory);
    }

    if (searchTerm) {
      result = result.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.entries.some(e =>
          e.account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.account.number.toString().includes(searchTerm)
        )
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount-desc':
          return getTransactionTotal(b) - getTransactionTotal(a);
        case 'amount-asc':
          return getTransactionTotal(a) - getTransactionTotal(b);
        default:
          return 0;
      }
    });

    return result;
  }, [transactions, filterCategory, searchTerm, sortBy]);

  const handleDelete = async (id: number) => {
    if (!confirm('Är du säker på att du vill radera denna verifikation?')) {
      return;
    }

    setDeleting(id);
    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Kunde inte radera verifikation');
      }

      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Kunde inte radera verifikation');
    } finally {
      setDeleting(null);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p style={{ color: 'var(--text-muted)' }}>Inga verifikationer ännu. Skapa din första!</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <h2 className="text-xl font-serif mb-4" style={{ color: 'var(--text-primary)' }}>Verifikationer</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Kategori</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as TransactionCategory | 'all')}
              className="select-field text-sm"
            >
              <option value="all">🔍 Alla kategorier</option>
              <option value="income">💰 Intäkter</option>
              <option value="expense">💸 Kostnader</option>
              <option value="asset">📦 Inventarier</option>
              <option value="owner">👤 Utlägg/Ägare</option>
              <option value="bank">🏦 Bank</option>
              <option value="other">📋 Övrigt</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Sök</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Beskrivning eller konto..."
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Sortering</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="select-field text-sm"
            >
              <option value="date-desc">📅 Datum (nyast)</option>
              <option value="date-asc">📅 Datum (äldst)</option>
              <option value="amount-desc">💵 Belopp (högst)</option>
              <option value="amount-asc">💵 Belopp (lägst)</option>
            </select>
          </div>
        </div>

        <p className="text-xs mt-3" style={{ color: 'var(--text-disabled)' }}>
          Visar {filteredAndSortedTransactions.length} av {transactions.length} verifikationer
        </p>
      </div>

      <div>
        {filteredAndSortedTransactions.length === 0 ? (
          <div className="p-6 text-center" style={{ color: 'var(--text-muted)' }}>
            Inga verifikationer matchade dina filter.
          </div>
        ) : (
          filteredAndSortedTransactions.map((transaction) => {
            const category = categorizeTransaction(transaction);
            const categoryBadge = getCategoryBadge(category);
            const categoryLabel = getCategoryLabel(category);

            return (
              <div key={transaction.id} className="p-4 transition-colors" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Ver #{transaction.id}</span>
                    <span style={{ color: 'var(--text-disabled)' }}>•</span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {format(new Date(transaction.date), 'yyyy-MM-dd')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${categoryBadge}`}>
                      {categoryLabel}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(transaction)}
                        className="text-sm transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        title="Redigera"
                      >
                        ✏️
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      disabled={deleting === transaction.id}
                      className="text-sm transition-colors hover:text-red-500 disabled:opacity-50"
                      style={{ color: 'var(--text-muted)' }}
                      title="Radera"
                    >
                      {deleting === transaction.id ? '...' : '🗑'}
                    </button>
                  </div>
                </div>

                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>{transaction.description}</p>

                <div className="space-y-1">
                  {transaction.entries.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-12 text-sm">
                      <div className="col-span-6" style={{ color: 'var(--text-muted)' }}>
                        {entry.account.number} - {entry.account.name}
                      </div>
                      <div className="col-span-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {entry.debit > 0 && `${entry.debit.toFixed(2)} kr`}
                      </div>
                      <div className="col-span-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {entry.credit > 0 && `${entry.credit.toFixed(2)} kr`}
                      </div>
                    </div>
                  ))}
                </div>

                {transaction.attachments && transaction.attachments.length > 0 && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>📎 Bifogade filer:</p>
                    <div className="flex flex-wrap gap-2">
                      {transaction.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={`/uploads/${att.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs px-2 py-1 rounded transition-colors"
                          style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                          title={att.originalName}
                        >
                          {att.originalName.length > 20 ? att.originalName.substring(0, 20) + '...' : att.originalName}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
