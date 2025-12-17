'use client';

import { useState, useEffect } from 'react';

interface Asset {
  id: number;
  name: string;
  purchaseDate: string;
  purchasePrice: number;
  depreciationRate: number;
  depreciationMethod: string;
  currentValue: number;
  totalDepreciated: number;
  isFullyDepreciated: boolean;
  notes: string | null;
  depreciations: Depreciation[];
}

interface Depreciation {
  id: number;
  year: number;
  amount: number;
  transactionId: number | null;
}

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [depreciationRate, setDepreciationRate] = useState(20);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets');
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      console.error('Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const accountRes = await fetch('/api/accounts');
    const accounts = await accountRes.json();
    const account1220 = accounts.find((acc: any) => acc.number === 1220);

    if (!account1220) {
      setError('Konto 1220 (Inventarier) saknas');
      return;
    }

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          purchaseDate,
          purchasePrice,
          depreciationRate,
          depreciationMethod: 'LINEAR',
          accountId: account1220.id,
          notes,
        }),
      });

      if (!res.ok) throw new Error('Kunde inte skapa tillgång');

      setName('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setPurchasePrice(0);
      setDepreciationRate(20);
      setNotes('');
      setShowForm(false);
      fetchAssets();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDepreciate = async (assetId: number, year: number) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    const amount = (asset.purchasePrice * asset.depreciationRate) / 100;

    if (!confirm(`Skapa avskrivning för ${asset.name} år ${year}?\nBelopp: ${amount.toFixed(2)} kr`)) return;

    try {
      const res = await fetch('/api/assets/depreciate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, year, amount, createTransaction: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kunde inte skapa avskrivning');
      }

      alert(`Avskrivning skapad! Verifikation har lagts till automatiskt.`);
      fetchAssets();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Är du säker på att du vill radera denna tillgång?')) return;
    try {
      await fetch(`/api/assets?id=${id}`, { method: 'DELETE' });
      fetchAssets();
    } catch (err) {
      alert('Kunde inte radera tillgång');
    }
  };

  const calculateYearsRemaining = (asset: Asset) => {
    const totalYears = 100 / asset.depreciationRate;
    const depreciatedYears = asset.depreciations.length;
    return Math.max(0, totalYears - depreciatedYears);
  };

  const getNextDepreciationYear = (asset: Asset) => {
    if (asset.depreciations.length === 0) {
      return new Date(asset.purchaseDate).getFullYear();
    }
    const latestYear = Math.max(...asset.depreciations.map(d => d.year));
    return latestYear + 1;
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
        <h2 className="text-2xl font-serif" style={{ color: 'var(--text-primary)' }}>📦 Inventarieregister</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Stäng' : '+ Lägg till tillgång'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-serif" style={{ color: 'var(--text-primary)' }}>Ny tillgång</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Namn</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="T.ex. Sony kamera"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Inköpsdatum</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Inköpspris (kr)</label>
              <input
                type="number"
                step="0.01"
                value={purchasePrice || ''}
                onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Avskrivning (%/år)</label>
              <select
                value={depreciationRate}
                onChange={(e) => setDepreciationRate(parseInt(e.target.value))}
                className="select-field"
              >
                <option value={20}>20% (5 år)</option>
                <option value={25}>25% (4 år)</option>
                <option value={33}>33% (3 år)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Anteckningar (valfritt)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              rows={2}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full">
            Skapa tillgång
          </button>
        </form>
      )}

      {assets.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p style={{ color: 'var(--text-muted)' }}>Inga tillgångar ännu. Lägg till din första!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assets.map((asset) => (
            <div key={asset.id} className="glass-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-serif" style={{ color: 'var(--text-primary)' }}>{asset.name}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Inköpt: {new Date(asset.purchaseDate).toLocaleDateString('sv-SE')} • {asset.depreciationRate}% per år
                  </p>
                </div>
                <button onClick={() => handleDelete(asset.id)} className="text-sm hover:text-red-500" style={{ color: 'var(--text-muted)' }}>
                  🗑 Radera
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Inköpspris</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{asset.purchasePrice.toLocaleString('sv-SE')} kr</p>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Totalt avskrivet</p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{asset.totalDepreciated.toLocaleString('sv-SE')} kr</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bokföringsvärde</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{asset.currentValue.toLocaleString('sv-SE')} kr</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>År kvar</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{calculateYearsRemaining(asset)} år</p>
                </div>
              </div>

              {asset.notes && (
                <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Anteckningar:</strong> {asset.notes}
                </p>
              )}

              {asset.depreciations.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Avskrivningar:</p>
                  <div className="space-y-1">
                    {asset.depreciations.map((dep) => (
                      <div key={dep.id} className="flex justify-between text-sm p-2 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>År {dep.year}</span>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{dep.amount.toLocaleString('sv-SE')} kr</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!asset.isFullyDepreciated ? (
                <button
                  onClick={() => handleDepreciate(asset.id, getNextDepreciationYear(asset))}
                  className="btn-primary w-full"
                >
                  Skapa avskrivning för år {getNextDepreciationYear(asset)}
                </button>
              ) : (
                <div className="p-3 rounded-lg text-center" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  ✓ Fullständigt avskriven
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
