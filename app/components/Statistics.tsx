'use client';

import { useState, useEffect } from 'react';

interface StatisticsData {
  summary: {
    income: number;
    expenses: number;
    profit: number;
    profitMargin: string;
    assets: number;
    liabilities: number;
    equity: number;
    netWorth: number;
  };
  monthly: Array<{
    month: string;
    income: number;
    expenses: number;
    profit: number;
  }>;
  topExpenses: Array<{
    name: string;
    number: number;
    total: number;
  }>;
  totalTransactions: number;
  assetsSummary: {
    totalPurchasePrice: number;
    totalCurrentValue: number;
    totalDepreciated: number;
    depreciationThisYear: number;
    numberOfAssets: number;
  };
}

export default function Statistics() {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/statistics');
      if (!res.ok) throw new Error('Kunde inte hämta statistik');
      const statsData = await res.json();
      setData(statsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--border-color-strong)', borderTopColor: 'var(--text-primary)' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Laddar statistik...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/20 border border-red-500/30 p-6 rounded-lg">
        <p className="text-red-600 dark:text-red-300">{error || 'Kunde inte ladda statistik'}</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif" style={{ color: 'var(--text-primary)' }}>Ekonomisk översikt</h2>
        <button
          onClick={fetchStatistics}
          className="btn-ghost text-sm"
        >
          🔄 Uppdatera
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-6">
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Totala intäkter</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(data.summary.income)}
          </p>
        </div>

        <div className="glass-card p-6">
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Totala kostnader</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(data.summary.expenses)}
          </p>
        </div>

        <div className="glass-card p-6">
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Resultat</p>
          <p className={`text-2xl font-bold ${data.summary.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(data.summary.profit)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>
            Marginal: {data.summary.profitMargin}%
          </p>
        </div>

        <div className="glass-card p-6">
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Antal verifikationer</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {data.totalTransactions}
          </p>
        </div>
      </div>

      {/* Balance Sheet Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-6">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Tillgångar</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(data.summary.assets)}
          </p>
        </div>

        <div className="glass-card p-6">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Skulder</p>
          <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
            {formatCurrency(data.summary.liabilities)}
          </p>
        </div>

        <div className="glass-card p-6">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Eget kapital</p>
          <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(data.summary.equity)}
          </p>
        </div>
      </div>

      {/* Assets and Depreciation Summary */}
      {data.assetsSummary.numberOfAssets > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-xl font-serif mb-4" style={{ color: 'var(--text-primary)' }}>📦 Inventarier & Avskrivningar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Antal inventarier</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data.assetsSummary.numberOfAssets} st
              </p>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Inköpspris totalt</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(data.assetsSummary.totalPurchasePrice)}
              </p>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg">
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Bokföringsvärde</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(data.assetsSummary.totalCurrentValue)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>(Återstående värde)</p>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg">
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Totalt avskrivet</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(data.assetsSummary.totalDepreciated)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>
                {data.assetsSummary.totalPurchasePrice > 0
                  ? `(${((data.assetsSummary.totalDepreciated / data.assetsSummary.totalPurchasePrice) * 100).toFixed(0)}%)`
                  : ''}
              </p>
            </div>
          </div>

          {data.assetsSummary.depreciationThisYear > 0 && (
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                💡 Avskrivning innevarande år ({new Date().getFullYear()}):{' '}
                <span className="font-bold">
                  {formatCurrency(data.assetsSummary.depreciationThisYear)}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Monthly Breakdown */}
      {data.monthly.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-xl font-serif mb-4" style={{ color: 'var(--text-primary)' }}>Månatlig utveckling</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="table-header">Månad</th>
                  <th className="table-header text-right">Intäkter</th>
                  <th className="table-header text-right">Kostnader</th>
                  <th className="table-header text-right">Resultat</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly.map((month) => (
                  <tr key={month.month} className="table-row">
                    <td className="table-cell font-medium" style={{ color: 'var(--text-primary)' }}>{month.month}</td>
                    <td className="table-cell text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(month.income)}</td>
                    <td className="table-cell text-right text-red-600 dark:text-red-400">{formatCurrency(month.expenses)}</td>
                    <td className={`table-cell text-right font-medium ${month.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(month.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-color-strong)' }}>
                  <td className="table-cell font-bold" style={{ color: 'var(--text-primary)' }}>Totalt</td>
                  <td className="table-cell text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data.summary.income)}</td>
                  <td className="table-cell text-right font-bold text-red-600 dark:text-red-400">{formatCurrency(data.summary.expenses)}</td>
                  <td className={`table-cell text-right font-bold ${data.summary.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(data.summary.profit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Top Expenses */}
      {data.topExpenses.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-xl font-serif mb-4" style={{ color: 'var(--text-primary)' }}>Största kostnadsposter</h3>
          <div className="space-y-3">
            {data.topExpenses.map((expense, index) => (
              <div key={expense.number} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold" style={{ color: 'var(--text-disabled)' }}>#{index + 1}</span>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {expense.number} - {expense.name}
                  </p>
                </div>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(expense.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Summary */}
      <div className="glass-card-solid p-6">
        <h3 className="font-serif mb-3" style={{ color: 'var(--text-primary)' }}>📊 Sammanfattning</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div>
            <p className="mb-2">
              <span className="font-semibold">Lönsamhet:</span>{' '}
              {data.summary.profit >= 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400">✓ Vinst på {formatCurrency(data.summary.profit)}</span>
              ) : (
                <span className="text-red-600 dark:text-red-400">✗ Förlust på {formatCurrency(Math.abs(data.summary.profit))}</span>
              )}
            </p>
            <p className="mb-2">
              <span className="font-semibold">Vinstmarginal:</span> {data.summary.profitMargin}%
              {parseFloat(data.summary.profitMargin) > 20 && ' (Mycket bra!)'}
              {parseFloat(data.summary.profitMargin) > 10 && parseFloat(data.summary.profitMargin) <= 20 && ' (Bra)'}
              {parseFloat(data.summary.profitMargin) <= 10 && parseFloat(data.summary.profitMargin) > 0 && ' (Acceptabelt)'}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-semibold">Soliditet:</span>{' '}
              {data.summary.assets > 0
                ? `${((data.summary.equity / data.summary.assets) * 100).toFixed(1)}%`
                : '0%'}
            </p>
            <p className="mb-2">
              <span className="font-semibold">Totala verifikationer:</span> {data.totalTransactions} st
            </p>
          </div>
        </div>
      </div>

      {data.totalTransactions === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6 text-center">
          <p className="text-amber-700 dark:text-amber-300">
            Ingen data att visa ännu. Börja genom att lägga till verifikationer!
          </p>
        </div>
      )}
    </div>
  );
}
