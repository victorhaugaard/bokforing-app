'use client';

import { useState } from 'react';

interface Customer {
  id: number;
  name: string;
  orgNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  notes?: string;
}

interface Props {
  editing: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CustomerForm({ editing, onClose, onSaved }: Props) {
  const [name, setName] = useState(editing?.name ?? '');
  const [orgNumber, setOrgNumber] = useState(editing?.orgNumber ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [address, setAddress] = useState(editing?.address ?? '');
  const [postalCode, setPostalCode] = useState(editing?.postalCode ?? '');
  const [city, setCity] = useState(editing?.city ?? '');
  const [country, setCountry] = useState(editing?.country ?? 'Sverige');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Namn krävs'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/customers', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editing ? { id: editing.id } : {}),
          name, orgNumber, email, phone, address, postalCode, city, country, notes,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Fel'); return; }
      onSaved();
    } catch { setError('Nätverksfel'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="glass-card w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-serif" style={{ color: 'var(--text-primary)' }}>
            {editing ? 'Redigera kund' : 'Ny kund'}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} className="text-xl hover:opacity-75">✕</button>
        </div>

        {error && <div className="p-3 rounded text-sm bg-red-500/20 text-red-300 border border-red-500/30">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Namn / Företagsnamn *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Acme AB" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Org.nr / Personnr</label>
              <input type="text" value={orgNumber} onChange={e => setOrgNumber(e.target.value)} className="input-field" placeholder="556xxx-xxxx" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>E-post</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="faktura@example.se" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Telefon</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input-field" placeholder="08-123 456" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Adress</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="input-field" placeholder="Storgatan 1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Postnummer</label>
              <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} className="input-field" placeholder="123 45" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Stad</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} className="input-field" placeholder="Stockholm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Land</label>
              <input type="text" value={country} onChange={e => setCountry(e.target.value)} className="input-field" placeholder="Sverige" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Notering</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-field" rows={2} placeholder="Intern anteckning om kunden..." />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Sparar...' : (editing ? 'Uppdatera' : 'Skapa kund')}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Avbryt</button>
          </div>
        </form>
      </div>
    </div>
  );
}
