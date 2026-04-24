'use client';

import { useState } from 'react';

interface Customer { id: number; name: string; email?: string; orgNumber?: string; }
interface LineItem { description: string; quantity: number; unit: string; unitPrice: number; vatRate: number; amount: number; }

interface Props {
  type: 'invoice' | 'quote';
  customers: Customer[];
  editing: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyItem = (): LineItem => ({ description: '', quantity: 1, unit: 'st', unitPrice: 0, vatRate: 25, amount: 0 });

export default function DocumentForm({ type, customers, editing, onClose, onSaved }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const in14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  const [customerId, setCustomerId] = useState<string>(editing?.customer?.id?.toString() ?? '');
  const [issueDate, setIssueDate] = useState(editing?.issueDate?.split('T')[0] ?? today);
  const [endDate, setEndDate] = useState(
    type === 'invoice'
      ? (editing?.dueDate?.split('T')[0] ?? in30)
      : (editing?.validUntil?.split('T')[0] ?? in14)
  );
  const [vatRate, setVatRate] = useState<number>(editing?.vatRate ?? 25);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [paymentTerms, setPaymentTerms] = useState(editing?.paymentTerms ?? '30 dagar netto');
  const [ourRef, setOurRef] = useState(editing?.ourReference ?? '');
  const [yourRef, setYourRef] = useState(editing?.yourReference ?? '');
  const [items, setItems] = useState<LineItem[]>(
    editing?.items?.length ? editing.items.map((i: any) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), amount: Number(i.quantity) * Number(i.unitPrice) })) : [emptyItem()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      updated.amount = Number(updated.quantity) * Number(updated.unitPrice);
      return updated;
    }));
  }

  function addItem() { setItems(prev => [...prev, emptyItem()]); }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }

  const subtotal = items.reduce((s, it) => s + it.amount, 0);
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) { setError('Välj en kund'); return; }
    if (items.some(it => !it.description)) { setError('Alla rader måste ha en beskrivning'); return; }
    setSaving(true); setError('');
    try {
      const endpoint = type === 'invoice' ? '/api/invoices' : '/api/quotes';
      const payload: any = {
        customerId, issueDate, vatRate, notes, ourReference: ourRef, yourReference: yourRef, items,
        ...(type === 'invoice' ? { dueDate: endDate, paymentTerms } : { validUntil: endDate }),
        ...(editing ? { id: editing.id, status: editing.status } : {}),
      };
      const res = await fetch(endpoint, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Fel'); return; }
      onSaved();
    } catch { setError('Nätverksfel'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="glass-card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-serif" style={{ color: 'var(--text-primary)' }}>
            {editing ? 'Redigera' : 'Ny'} {type === 'invoice' ? 'faktura' : 'offert'}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} className="text-xl hover:opacity-75">✕</button>
        </div>

        {error && <div className="p-3 rounded text-sm bg-red-500/20 text-red-300 border border-red-500/30">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer + dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Kund *</label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="select-field" required>
                <option value="">— Välj kund —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Momssats (%)</label>
              <select value={vatRate} onChange={e => setVatRate(Number(e.target.value))} className="select-field">
                <option value={25}>25%</option>
                <option value={12}>12%</option>
                <option value={6}>6%</option>
                <option value={0}>0% (Momsfri)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Utfärdad</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                {type === 'invoice' ? 'Förfallodatum' : 'Giltig t.o.m.'}
              </label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" required />
            </div>
            {type === 'invoice' && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Betalningsvillkor</label>
                <input type="text" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="input-field" placeholder="30 dagar netto" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Vår referens</label>
              <input type="text" value={ourRef} onChange={e => setOurRef(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Er referens</label>
              <input type="text" value={yourRef} onChange={e => setYourRef(e.target.value)} className="input-field" />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Rader</label>
              <button type="button" onClick={addItem} className="btn-secondary text-xs py-1">+ Lägg till rad</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
                  <div className="col-span-12 sm:col-span-5">
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Beskrivning</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => updateItem(i, 'description', e.target.value)}
                      className="input-field text-sm py-1.5"
                      placeholder="Tjänst / produkt"
                      required
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Antal</label>
                    <input
                      type="number"
                      value={item.quantity}
                      min={0}
                      step="any"
                      onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                      className="input-field text-sm py-1.5"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>À-pris (kr)</label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      min={0}
                      step="any"
                      onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="input-field text-sm py-1.5"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Summa</label>
                    <p className="text-sm font-medium py-1.5" style={{ color: 'var(--text-primary)' }}>
                      {item.amount.toLocaleString('sv-SE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300 text-lg leading-none">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg p-4 space-y-1" style={{ background: 'var(--bg-hover)' }}>
            <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
              <span>Netto</span><span>{subtotal.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
              <span>Moms ({vatRate}%)</span><span>{vatAmount.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
              <span>Totalt</span><span>{total.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Meddelande / notering</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-field" rows={3} placeholder="T.ex. tack för affären..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Sparar...' : (editing ? 'Uppdatera' : `Skapa ${type === 'invoice' ? 'faktura' : 'offert'}`)}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Avbryt</button>
          </div>
        </form>
      </div>
    </div>
  );
}
