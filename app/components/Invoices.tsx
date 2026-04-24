'use client';

import { useState, useEffect, useRef } from 'react';
import CustomerForm from './CustomerForm';
import DocumentForm from './DocumentForm';
import InvoicePreviewPanel from './InvoicePreviewPanel';
import { type TemplateDoc } from './InvoiceTemplate';

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
  _count?: { invoices: number; quotes: number };
}

interface LineItem {
  id?: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  amount: number;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  customer: Customer;
  issueDate: string;
  dueDate: string;
  status: string;
  currency: string;
  vatRate: number;
  notes?: string;
  paymentTerms?: string;
  ourReference?: string;
  yourReference?: string;
  items: LineItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  createdAt: string;
}

interface Quote {
  id: number;
  quoteNumber: string;
  customer: Customer;
  issueDate: string;
  validUntil: string;
  status: string;
  currency: string;
  vatRate: number;
  notes?: string;
  ourReference?: string;
  yourReference?: string;
  items: LineItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  createdAt: string;
}

type SubTab = 'invoices' | 'quotes' | 'customers';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  SENT: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  PAID: 'bg-green-500/20 text-green-300 border-green-500/30',
  OVERDUE: 'bg-red-500/20 text-red-300 border-red-500/30',
  CANCELLED: 'bg-gray-600/20 text-gray-500 border-gray-600/30',
  ACCEPTED: 'bg-green-500/20 text-green-300 border-green-500/30',
  DECLINED: 'bg-red-500/20 text-red-300 border-red-500/30',
  EXPIRED: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Utkast', SENT: 'Skickad', PAID: 'Betald', OVERDUE: 'Förfallen',
  CANCELLED: 'Avbruten', ACCEPTED: 'Accepterad', DECLINED: 'Nekad', EXPIRED: 'Utgången',
};

function fmt(n: number) {
  return n.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('sv-SE');
}

function docToTemplate(doc: Invoice | Quote, type: 'invoice' | 'quote'): TemplateDoc {
  return {
    type,
    number: type === 'invoice' ? (doc as Invoice).invoiceNumber : (doc as Quote).quoteNumber,
    customerName: doc.customer.name,
    customerAddress: doc.customer.address,
    customerPostalCode: doc.customer.postalCode,
    customerCity: doc.customer.city,
    customerOrgNumber: doc.customer.orgNumber,
    issueDate: doc.issueDate,
    dueDate: type === 'invoice' ? (doc as Invoice).dueDate : undefined,
    validUntil: type === 'quote' ? (doc as Quote).validUntil : undefined,
    paymentTerms: type === 'invoice' ? (doc as Invoice).paymentTerms : undefined,
    ourReference: doc.ourReference,
    yourReference: doc.yourReference,
    notes: doc.notes,
    items: doc.items.map(it => ({
      description: it.description,
      unit: it.unit,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      vatRate: Number(it.vatRate),
      amount: Number(it.amount),
    })),
    subtotal: Number(doc.subtotal),
    vatAmount: Number(doc.vatAmount),
    vatRate: Number(doc.vatRate),
    totalAmount: Number(doc.totalAmount),
    currency: doc.currency,
  };
}

export default function Invoices() {
  const [subTab, setSubTab] = useState<SubTab>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [showDocForm, setShowDocForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Invoice | Quote | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [docType, setDocType] = useState<'invoice' | 'quote'>('invoice');

  // Preview state
  const [previewDoc, setPreviewDoc] = useState<TemplateDoc | null>(null);
  const [previewType, setPreviewType] = useState<'invoice' | 'quote'>('invoice');

  // Logo
  const [logo, setLogo] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
    const saved = localStorage.getItem('invoiceLogo');
    if (saved) setLogo(saved);
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [inv, quo, cust] = await Promise.all([
        fetch('/api/invoices').then(r => r.json()),
        fetch('/api/quotes').then(r => r.json()),
        fetch('/api/customers').then(r => r.json()),
      ]);
      setInvoices(Array.isArray(inv) ? inv : []);
      setQuotes(Array.isArray(quo) ? quo : []);
      setCustomers(Array.isArray(cust) ? cust : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function openNewDoc(type: 'invoice' | 'quote') {
    setDocType(type); setEditingDoc(null); setShowDocForm(true);
    setSubTab(type === 'invoice' ? 'invoices' : 'quotes');
  }

  function openEditDoc(doc: Invoice | Quote, type: 'invoice' | 'quote') {
    setDocType(type); setEditingDoc(doc); setShowDocForm(true);
  }

  function openPreview(doc: Invoice | Quote, type: 'invoice' | 'quote') {
    setPreviewDoc(docToTemplate(doc, type));
    setPreviewType(type);
  }

  async function deleteDoc(id: number, type: 'invoice' | 'quote') {
    if (!confirm('Radera detta dokument?')) return;
    await fetch(`/api/${type === 'invoice' ? 'invoices' : 'quotes'}?id=${id}`, { method: 'DELETE' });
    if (previewDoc) setPreviewDoc(null);
    fetchAll();
  }

  async function updateStatus(id: number, type: 'invoice' | 'quote', status: string) {
    const doc = type === 'invoice' ? invoices.find(i => i.id === id) : quotes.find(q => q.id === id);
    if (!doc) return;
    const endpoint = type === 'invoice' ? '/api/invoices' : '/api/quotes';
    const dateField = type === 'invoice'
      ? { dueDate: (doc as Invoice).dueDate }
      : { validUntil: (doc as Quote).validUntil };
    await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, customerId: doc.customer.id, issueDate: doc.issueDate, ...dateField, vatRate: doc.vatRate, status, notes: doc.notes, items: doc.items }),
    });
    fetchAll();
  }

  async function deleteCustomer(id: number) {
    if (!confirm('Radera kunden?')) return;
    const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    fetchAll();
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const data = ev.target?.result as string;
      setLogo(data);
      localStorage.setItem('invoiceLogo', data);
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogo(null);
    localStorage.removeItem('invoiceLogo');
  }

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--border-color-strong)', borderTopColor: 'var(--text-primary)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Laddar...</p>
      </div>
    );
  }

  const listPanel = (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-serif" style={{ color: 'var(--text-primary)' }}>🧾 Fakturor &amp; Offerter</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openNewDoc('invoice')} className="btn-primary text-sm">+ Ny faktura</button>
          <button onClick={() => openNewDoc('quote')} className="btn-secondary text-sm">+ Ny offert</button>
          <button onClick={() => { setEditingCustomer(null); setShowCustomerForm(true); }} className="btn-secondary text-sm">👤 Ny kund</button>
          {/* Logo upload */}
          <div className="relative">
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            {logo ? (
              <div className="flex gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="Logo" className="h-8 object-contain rounded border" style={{ borderColor: 'var(--border-color)' }} />
                <button onClick={removeLogo} className="btn-secondary text-xs py-1 px-2 hover:text-red-400" title="Ta bort logo">✕</button>
              </div>
            ) : (
              <button onClick={() => logoInputRef.current?.click()} className="btn-secondary text-sm" title="Ladda upp logotyp">
                🖼 Logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {([
          ['invoices', `📋 Fakturor (${invoices.length})`],
          ['quotes', `📄 Offerter (${quotes.length})`],
          ['customers', `👥 Kunder (${customers.length})`],
        ] as [SubTab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)} className={subTab === id ? 'nav-tab-active' : 'nav-tab'}>
            {label}
          </button>
        ))}
      </div>

      {/* Invoices */}
      {subTab === 'invoices' && (
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p style={{ color: 'var(--text-muted)' }}>Inga fakturor ännu. Skapa din första!</p>
            </div>
          ) : invoices.map(inv => (
            <div key={inv.id} className={`glass-card p-5 transition-all cursor-pointer ${previewDoc && 'number' in previewDoc && previewDoc.number === inv.invoiceNumber ? 'ring-2 ring-blue-500/50' : ''}`}
              onClick={() => openPreview(inv, 'invoice')}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{inv.invoiceNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${statusColors[inv.status] ?? ''}`}>{statusLabels[inv.status] ?? inv.status}</span>
                  </div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{inv.customer.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Utfärdad: {fmtDate(inv.issueDate)} · Förfaller: {fmtDate(inv.dueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(inv.totalAmount)} kr</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>varav moms {fmt(inv.vatAmount)} kr</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}
                onClick={e => e.stopPropagation()}>
                <select value={inv.status} onChange={e => updateStatus(inv.id, 'invoice', e.target.value)}
                  className="select-field text-xs py-1" style={{ width: 'auto' }}>
                  {['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'].map(s => (
                    <option key={s} value={s}>{statusLabels[s]}</option>
                  ))}
                </select>
                <button onClick={() => openPreview(inv, 'invoice')} className="btn-secondary text-xs py-1">👁 Visa PDF</button>
                <button onClick={() => openEditDoc(inv, 'invoice')} className="btn-secondary text-xs py-1">✏️ Redigera</button>
                <button onClick={() => deleteDoc(inv.id, 'invoice')} className="btn-secondary text-xs py-1 hover:text-red-400">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quotes */}
      {subTab === 'quotes' && (
        <div className="space-y-3">
          {quotes.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p style={{ color: 'var(--text-muted)' }}>Inga offerter ännu. Skapa din första!</p>
            </div>
          ) : quotes.map(q => (
            <div key={q.id} className={`glass-card p-5 cursor-pointer transition-all ${previewDoc && 'number' in previewDoc && previewDoc.number === q.quoteNumber ? 'ring-2 ring-blue-500/50' : ''}`}
              onClick={() => openPreview(q, 'quote')}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{q.quoteNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${statusColors[q.status] ?? ''}`}>{statusLabels[q.status] ?? q.status}</span>
                  </div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{q.customer.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Utfärdad: {fmtDate(q.issueDate)} · Giltig t.o.m.: {fmtDate(q.validUntil)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(q.totalAmount)} kr</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>varav moms {fmt(q.vatAmount)} kr</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}
                onClick={e => e.stopPropagation()}>
                <select value={q.status} onChange={e => updateStatus(q.id, 'quote', e.target.value)}
                  className="select-field text-xs py-1" style={{ width: 'auto' }}>
                  {['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED'].map(s => (
                    <option key={s} value={s}>{statusLabels[s]}</option>
                  ))}
                </select>
                <button onClick={() => openPreview(q, 'quote')} className="btn-secondary text-xs py-1">👁 Visa PDF</button>
                <button onClick={() => openEditDoc(q, 'quote')} className="btn-secondary text-xs py-1">✏️ Redigera</button>
                <button onClick={() => deleteDoc(q.id, 'quote')} className="btn-secondary text-xs py-1 hover:text-red-400">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customers */}
      {subTab === 'customers' && (
        <div className="space-y-3">
          {customers.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p style={{ color: 'var(--text-muted)' }}>Inga kunder ännu.</p>
            </div>
          ) : customers.map(c => (
            <div key={c.id} className="glass-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-base" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                  {c.orgNumber && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Org.nr: {c.orgNumber}</p>}
                  <div className="flex flex-wrap gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {c.email && <span>✉️ {c.email}</span>}
                    {c.phone && <span>📞 {c.phone}</span>}
                    {c.city && <span>📍 {c.city}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                    <p>{c._count?.invoices ?? 0} faktura(or)</p>
                    <p>{c._count?.quotes ?? 0} offert(er)</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingCustomer(c); setShowCustomerForm(true); }} className="btn-secondary text-xs py-1">✏️</button>
                    <button onClick={() => deleteCustomer(c.id)} className="btn-secondary text-xs py-1 hover:text-red-400">🗑</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Modals */}
      {showDocForm && (
        <DocumentForm
          type={docType}
          customers={customers}
          editing={editingDoc}
          onClose={() => { setShowDocForm(false); setEditingDoc(null); }}
          onSaved={() => { setShowDocForm(false); setEditingDoc(null); fetchAll(); }}
        />
      )}
      {showCustomerForm && (
        <CustomerForm
          editing={editingCustomer}
          onClose={() => { setShowCustomerForm(false); setEditingCustomer(null); }}
          onSaved={() => { setShowCustomerForm(false); setEditingCustomer(null); fetchAll(); }}
        />
      )}

      {/* Split layout: list left, preview right */}
      {previewDoc ? (
        <div className="flex gap-6" style={{ minHeight: '80vh' }}>
          {/* List — fixed width */}
          <div style={{ width: '420px', flexShrink: 0 }}>
            {listPanel}
          </div>
          {/* Preview — fills rest */}
          <div className="flex-1 min-w-0 rounded-xl overflow-hidden border"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
            <InvoicePreviewPanel
              doc={previewDoc}
              logo={logo}
              onClose={() => setPreviewDoc(null)}
            />
          </div>
        </div>
      ) : (
        listPanel
      )}
    </div>
  );
}
