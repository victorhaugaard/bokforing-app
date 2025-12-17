'use client';

import { useState, useEffect } from 'react';

interface StripeTransaction {
    id: number;
    stripeId: string;
    type: string;
    amount: number;
    currency: string;
    customerCountry?: string;
    vatRate?: number;
    vatAmount?: number;
    stripeFee?: number;
    netAmount?: number;
    status: string;
    description?: string;
    createdAt: string;
    processedAt?: string;
}

interface OSSCountrySummary {
    country: string;
    countryName: string;
    vatRate: number;
    totalTaxable: number;
    totalVat: number;
}

const EU_FLAGS: Record<string, string> = {
    AT: '🇦🇹', BE: '🇧🇪', BG: '🇧🇬', HR: '🇭🇷', CY: '🇨🇾', CZ: '🇨🇿',
    DK: '🇩🇰', EE: '🇪🇪', FI: '🇫🇮', FR: '🇫🇷', DE: '🇩🇪', GR: '🇬🇷',
    HU: '🇭🇺', IE: '🇮🇪', IT: '🇮🇹', LV: '🇱🇻', LT: '🇱🇹', LU: '🇱🇺',
    MT: '🇲🇹', NL: '🇳🇱', PL: '🇵🇱', PT: '🇵🇹', RO: '🇷🇴', SK: '🇸🇰',
    SI: '🇸🇮', ES: '🇪🇸', SE: '🇸🇪'
};

export default function StripeTransactions() {
    const [transactions, setTransactions] = useState<StripeTransaction[]>([]);
    const [ossSummary, setOssSummary] = useState<OSSCountrySummary[]>([]);
    const [totalOssVat, setTotalOssVat] = useState(0);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'processed' | 'oss' | 'add'>('pending');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [formData, setFormData] = useState({
        type: 'charge',
        amount: '',
        currency: 'EUR',
        customerCountry: '',
        vatRate: '',
        stripeFee: '',
        description: ''
    });

    useEffect(() => {
        fetchTransactions();
        fetchOSSSummary();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const [pendingRes, processedRes] = await Promise.all([
                fetch('/api/stripe?action=pending'),
                fetch('/api/stripe?action=processed')
            ]);
            const pendingData = await pendingRes.json();
            const processedData = await processedRes.json();
            setTransactions([
                ...(pendingData.transactions || []),
                ...(processedData.transactions || [])
            ]);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            showMessage('error', 'Kunde inte hämta transaktioner');
        } finally {
            setLoading(false);
        }
    };

    const fetchOSSSummary = async () => {
        try {
            const year = new Date().getFullYear();
            const res = await fetch(`/api/stripe?action=oss-summary&year=${year}`);
            const data = await res.json();
            setOssSummary(data.summary || []);
            setTotalOssVat(data.totalVat || 0);
        } catch (error) {
            console.error('Error fetching OSS summary:', error);
        }
    };

    const syncPayouts = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/stripe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync-payouts' })
            });
            const data = await res.json();
            if (res.ok) {
                showMessage('success', data.message);
                fetchTransactions();
            } else {
                showMessage('error', data.error || 'Synkronisering misslyckades');
            }
        } catch (error) {
            showMessage('error', 'Kunde inte synka med Stripe');
        } finally {
            setSyncing(false);
        }
    };

    const processTransaction = async (id: number) => {
        try {
            const res = await fetch('/api/stripe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'process', transactionId: id })
            });
            const data = await res.json();
            if (res.ok) {
                showMessage('success', 'Transaktion bokförd!');
                fetchTransactions();
                fetchOSSSummary();
            } else {
                showMessage('error', data.error || 'Bokföring misslyckades');
            }
        } catch (error) {
            showMessage('error', 'Kunde inte bokföra transaktion');
        }
    };

    const deleteTransaction = async (id: number) => {
        if (!confirm('Är du säker på att du vill ta bort denna transaktion?')) return;
        try {
            const res = await fetch(`/api/stripe?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                showMessage('success', 'Transaktion borttagen');
                fetchTransactions();
            } else {
                const data = await res.json();
                showMessage('error', data.error || 'Kunde inte ta bort');
            }
        } catch (error) {
            showMessage('error', 'Fel vid borttagning');
        }
    };

    const addManualTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/stripe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add-manual', ...formData })
            });
            if (res.ok) {
                showMessage('success', 'Transaktion tillagd');
                setFormData({ type: 'charge', amount: '', currency: 'EUR', customerCountry: '', vatRate: '', stripeFee: '', description: '' });
                fetchTransactions();
                setActiveTab('pending');
            } else {
                const data = await res.json();
                showMessage('error', data.error || 'Kunde inte lägga till');
            }
        } catch (error) {
            showMessage('error', 'Fel vid tillägg');
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const formatCurrency = (amount: number, currency: string = 'SEK') => {
        return new Intl.NumberFormat('sv-SE', { style: 'currency', currency }).format(amount);
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'payout': return '💸 Utbetalning';
            case 'charge': return '💳 Försäljning';
            case 'refund': return '↩️ Återbetalning';
            default: return type;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="badge-warning">Väntar</span>;
            case 'processed': return <span className="badge-success">Bokförd</span>;
            case 'failed': return <span className="badge-error">Misslyckad</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    const pendingTransactions = transactions.filter(t => t.status === 'pending');
    const processedTransactions = transactions.filter(t => t.status === 'processed');

    const tabs = [
        { id: 'pending', label: `Att bokföra (${pendingTransactions.length})` },
        { id: 'processed', label: `Bokförda (${processedTransactions.length})` },
        { id: 'oss', label: 'OSS-rapport' },
        { id: 'add', label: '+ Lägg till' },
    ];

    return (
        <div className="space-y-6">
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-serif" style={{ color: 'var(--text-primary)' }}>Stripe & OSS-moms</h2>
                        <p className="mt-1" style={{ color: 'var(--text-muted)' }}>Hantera utbetalningar och EU-momsredovisning</p>
                    </div>
                    <button
                        onClick={syncPayouts}
                        disabled={syncing}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                        {syncing ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Synkar...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Synka från Stripe
                            </>
                        )}
                    </button>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg mb-4 ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/20 text-red-700 dark:text-red-300'}`}>
                        {message.text}
                    </div>
                )}

                <div className="mb-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <nav className="flex gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={activeTab === tab.id ? 'nav-tab-active' : 'nav-tab'}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--border-color-strong)', borderTopColor: 'var(--text-primary)' }}></div>
                        <p style={{ color: 'var(--text-muted)' }}>Laddar...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'pending' && (
                            <div className="space-y-4">
                                {pendingTransactions.length === 0 ? (
                                    <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                                        <p>Inga transaktioner att bokföra</p>
                                        <p className="text-sm mt-2">Klicka på "Synka från Stripe" för att hämta nya</p>
                                    </div>
                                ) : (
                                    pendingTransactions.map((tx) => (
                                        <div key={tx.id} className="rounded-lg p-4 hover:opacity-90 transition-colors" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <span style={{ color: 'var(--text-primary)' }}>{getTypeLabel(tx.type)}</span>
                                                        {getStatusBadge(tx.status)}
                                                        {tx.customerCountry && (
                                                            <span className="text-lg">{EU_FLAGS[tx.customerCountry] || '🌍'}</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{tx.description || tx.stripeId}</p>
                                                    <p className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>{new Date(tx.createdAt).toLocaleDateString('sv-SE')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(tx.amount, tx.currency)}</p>
                                                    {tx.stripeFee && tx.stripeFee > 0 && (
                                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Avgift: {formatCurrency(tx.stripeFee, tx.currency)}</p>
                                                    )}
                                                    {tx.vatAmount && tx.vatAmount > 0 && (
                                                        <p className="text-sm text-emerald-600 dark:text-emerald-400">Moms: {formatCurrency(tx.vatAmount, tx.currency)} ({tx.vatRate}%)</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                <button onClick={() => processTransaction(tx.id)} className="btn-primary text-sm py-2">✓ Bokför</button>
                                                <button onClick={() => deleteTransaction(tx.id)} className="btn-secondary text-sm py-2">Ta bort</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'processed' && (
                            <div className="space-y-4">
                                {processedTransactions.length === 0 ? (
                                    <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Inga bokförda transaktioner ännu</div>
                                ) : (
                                    processedTransactions.map((tx) => (
                                        <div key={tx.id} className="rounded-lg p-4" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <span style={{ color: 'var(--text-secondary)' }}>{getTypeLabel(tx.type)}</span>
                                                        {getStatusBadge(tx.status)}
                                                        {tx.customerCountry && <span className="text-lg">{EU_FLAGS[tx.customerCountry] || '🌍'}</span>}
                                                    </div>
                                                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{tx.description || tx.stripeId}</p>
                                                    <p className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>Bokförd: {tx.processedAt && new Date(tx.processedAt).toLocaleDateString('sv-SE')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-bold" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(tx.amount, tx.currency)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'oss' && (
                            <div>
                                <div className="mb-6 p-6 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                                    <h3 className="text-lg font-serif" style={{ color: 'var(--text-primary)' }}>OSS-moms att redovisa {new Date().getFullYear()}</h3>
                                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{formatCurrency(totalOssVat, 'SEK')}</p>
                                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Totalt för alla EU-länder (exkl. Sverige)</p>
                                </div>

                                {ossSummary.length === 0 ? (
                                    <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Ingen OSS-försäljning registrerad ännu</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <th className="table-header">Land</th>
                                                    <th className="table-header text-right">Momssats</th>
                                                    <th className="table-header text-right">Beskattningsunderlag</th>
                                                    <th className="table-header text-right">Moms</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ossSummary.map((row) => (
                                                    <tr key={row.country} className="table-row">
                                                        <td className="table-cell">
                                                            <span className="text-lg mr-2">{EU_FLAGS[row.country] || '🌍'}</span>
                                                            {row.countryName}
                                                        </td>
                                                        <td className="table-cell text-right">{row.vatRate}%</td>
                                                        <td className="table-cell text-right">{formatCurrency(row.totalTaxable, 'SEK')}</td>
                                                        <td className="table-cell text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(row.totalVat, 'SEK')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ borderTop: '2px solid var(--border-color-strong)' }}>
                                                    <td colSpan={3} className="table-cell font-bold text-right">Totalt:</td>
                                                    <td className="table-cell text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalOssVat, 'SEK')}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'add' && (
                            <form onSubmit={addManualTransaction} className="space-y-4 max-w-lg">
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Typ</label>
                                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="select-field">
                                        <option value="charge">Försäljning (charge)</option>
                                        <option value="payout">Utbetalning (payout)</option>
                                        <option value="refund">Återbetalning (refund)</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Belopp</label>
                                        <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="input-field" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Valuta</label>
                                        <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="select-field">
                                            <option value="SEK">SEK</option>
                                            <option value="EUR">EUR</option>
                                            <option value="USD">USD</option>
                                            <option value="GBP">GBP</option>
                                        </select>
                                    </div>
                                </div>

                                {formData.type === 'charge' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Kundland (ISO)</label>
                                            <input type="text" maxLength={2} placeholder="t.ex. DE" value={formData.customerCountry} onChange={(e) => setFormData({ ...formData, customerCountry: e.target.value.toUpperCase() })} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Momssats (%)</label>
                                            <input type="number" step="0.1" placeholder="t.ex. 19" value={formData.vatRate} onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })} className="input-field" />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Stripe-avgift</label>
                                    <input type="number" step="0.01" value={formData.stripeFee} onChange={(e) => setFormData({ ...formData, stripeFee: e.target.value })} className="input-field" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Beskrivning</label>
                                    <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" placeholder="t.ex. Premium-abonnemang" />
                                </div>

                                <button type="submit" className="btn-primary w-full">Lägg till transaktion</button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
