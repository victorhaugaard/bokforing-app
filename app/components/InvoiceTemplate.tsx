'use client';

import React from 'react';

// ── Company constants ──────────────────────────────────────────────
export const COMPANY = {
  name: 'Script Collective AB',
  address: 'Prästgårdsängen 4, lgh 433',
  postalCity: '41271 GÖTEBORG',
  orgNumber: '5595472647',
  vatNumber: 'SE559547264701',
  email: 'hello@scriptcollective.com',
  bankgiro: '5093-8695',
  fSkatt: true,
};

// ── Helpers ────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('sv-SE');
}

// ── Types ──────────────────────────────────────────────────────────
export interface TemplateDoc {
  type: 'invoice' | 'quote';
  number: string;
  customerId?: number;
  customerName: string;
  customerAddress?: string;
  customerPostalCode?: string;
  customerCity?: string;
  customerOrgNumber?: string;
  issueDate: string;
  dueDate?: string;          // invoice only
  validUntil?: string;       // quote only
  paymentTerms?: string;
  ourReference?: string;
  yourReference?: string;
  notes?: string;
  items: { description: string; unit?: string; quantity: number; unitPrice: number; vatRate: number; amount: number }[];
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  totalAmount: number;
  currency: string;
}

interface Props {
  doc: TemplateDoc;
  logo?: string | null; // base64 data URL
  scale?: number;
  isEnglish?: boolean;
}

// ── Template ───────────────────────────────────────────────────────
export default function InvoiceTemplate({ doc, logo, scale = 1, isEnglish = false }: Props) {
  const isInvoice = doc.type === 'invoice';
  
  const t = isEnglish ? {
    INVOICE: 'INVOICE',
    QUOTE: 'QUOTE',
    invoiceNumber: 'Invoice nr',
    quoteNumber: 'Quote nr',
    customerNr: 'Customer nr',
    invoiceDate: 'Invoice Date',
    quoteDate: 'Quote Date',
    paymentTerms: 'Payment Terms',
    dueDate: 'Due Date',
    validUntil: 'Valid Until',
    yourReference: 'Your Reference',
    ourReference: 'Our Reference',
    interestNote: 'Penalty interest applies after the due date according to the Swedish Interest Act',
    billingAddress: 'Billing Address',
    productService: 'Product / Service',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    amount: 'Amount',
    net: 'Net',
    vat: 'VAT',
    calculatedOn: 'calculated on',
    totalToPay: 'Total to pay',
    additionalDescription: 'Additional Description',
    address: 'Address',
    orgNr: 'Company Reg. No.',
    vatRegNr: 'VAT Reg. No.',
    companyEmail: 'Company Email',
    bankgiro: 'Bankgiro',
    fSkatt: 'Approved for F-tax',
    currency: 'EUR',
  } : {
    INVOICE: 'FAKTURA',
    QUOTE: 'OFFERT',
    invoiceNumber: 'Fakturanr',
    quoteNumber: 'Offertnr',
    customerNr: 'Kundnr',
    invoiceDate: 'Fakturadatum',
    quoteDate: 'Offertdatum',
    paymentTerms: 'Betalningsvillkor',
    dueDate: 'Förfallodatum',
    validUntil: 'Giltig t.o.m.',
    yourReference: 'Er referens',
    ourReference: 'Vår referens',
    interestNote: 'Efter förfallodagen debiteras ränta enligt räntelagen',
    billingAddress: 'Faktureringsadress',
    productService: 'Produkt / tjänst',
    quantity: 'Antal',
    unitPrice: 'À-pris',
    amount: 'Belopp',
    net: 'Netto',
    vat: 'Moms',
    calculatedOn: 'beräknad på',
    totalToPay: 'Summa att betala',
    additionalDescription: 'Ytterligare beskrivning',
    address: 'Adress',
    orgNr: 'Org.nr.',
    vatRegNr: 'Momsreg.nr.',
    companyEmail: 'Företagets e-post',
    bankgiro: 'Bankgiro',
    fSkatt: 'Godkänd för F-skatt',
    currency: 'kr',
  };

  const docLabel = isInvoice ? t.INVOICE : t.QUOTE;

  const styles: Record<string, React.CSSProperties> = {
    page: {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '10px',
      color: '#222',
      background: '#fff',
      width: '794px',       // A4 @ 96dpi
      minHeight: '1123px',
      padding: '48px',
      boxSizing: 'border-box',
      position: 'relative',
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '28px',
    },
    companyName: {
      fontStyle: 'italic',
      fontSize: '26px',
      color: '#555',
      fontFamily: 'Georgia, serif',
      lineHeight: 1,
    },
    docLabel: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#888',
      letterSpacing: '4px',
      border: '2px solid #bbb',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: 'normal',
    },
    infoGrid: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
    },
    infoBox: {
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '12px 14px',
      flex: 1,
    },
    infoRow: {
      display: 'flex',
      gap: '8px',
      marginBottom: '3px',
      fontSize: '10px',
      lineHeight: '1.5',
    },
    infoLabel: { fontWeight: 'bold', minWidth: '110px', color: '#333' },
    infoValue: { color: '#333' },
    addressBox: {
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '12px 14px',
      minWidth: '200px',
    },
    addressHeader: {
      background: '#aaa',
      color: '#fff',
      fontSize: '10px',
      fontWeight: 'bold',
      padding: '3px 8px',
      borderRadius: '3px',
      marginBottom: '8px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginBottom: '16px',
    },
    thead: {
      background: '#aaa',
    },
    th: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '10px',
      padding: '6px 8px',
      textAlign: 'left' as const,
    },
    thRight: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '10px',
      padding: '6px 8px',
      textAlign: 'right' as const,
    },
    td: {
      fontSize: '10px',
      padding: '5px 8px',
      borderBottom: '1px solid #eee',
      color: '#333',
    },
    tdRight: {
      fontSize: '10px',
      padding: '5px 8px',
      borderBottom: '1px solid #eee',
      textAlign: 'right' as const,
      color: '#333',
    },
    totalsSection: {
      marginLeft: 'auto',
      width: '280px',
      marginBottom: '8px',
    },
    totalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '10px',
      color: '#555',
      padding: '2px 0',
    },
    totalSumRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTop: '2px solid #bbb',
      paddingTop: '8px',
      marginTop: '4px',
    },
    totalSumLabel: {
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#222',
    },
    totalSumValue: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#222',
    },
    footer: {
      position: 'absolute' as const,
      bottom: '0',
      left: '0',
      right: '0',
      border: '1px solid #ddd',
      borderRadius: '8px',
      margin: '0 48px 32px',
      padding: '14px 18px',
      display: 'flex',
      justifyContent: 'space-between',
      gap: '24px',
      fontSize: '9px',
      color: '#444',
    },
    footerCol: { flex: 1 },
    footerLabel: { fontWeight: 'bold', marginBottom: '3px', fontSize: '9px', color: '#222' },
    notes: {
      fontSize: '9px',
      color: '#666',
      marginBottom: '10px',
    },
    interestNote: {
      fontSize: '9px',
      color: '#8B0000',
      marginTop: '6px',
    },
  };

  const fullAddress = [
    doc.customerAddress,
    [doc.customerPostalCode, doc.customerCity].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ');

  // Use user-uploaded logo if provided, otherwise fall back to the public logo file
  const logoSrc = logo ?? '/logo/logo.png';

  return (
    <div style={styles.page} id="invoice-template">
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt="Script Collective AB"
            style={{ maxHeight: '64px', maxWidth: '240px', objectFit: 'contain', display: 'block' }}
          />
        </div>
        <div style={styles.docLabel}>{docLabel}</div>
      </div>

      {/* ── Info grid ── */}
      <div style={styles.infoGrid}>
        {/* Left: doc meta */}
        <div style={styles.infoBox}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>{isInvoice ? t.invoiceNumber : t.quoteNumber}</span>
            <span style={styles.infoValue}>{doc.number}</span>
          </div>
          {doc.customerOrgNumber && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>{t.customerNr}</span>
              <span style={styles.infoValue}>{doc.customerOrgNumber}</span>
            </div>
          )}
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>{isInvoice ? t.invoiceDate : t.quoteDate}</span>
            <span style={styles.infoValue}>{fmtDate(doc.issueDate)}</span>
          </div>
          {isInvoice && doc.paymentTerms && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>{t.paymentTerms}</span>
              <span style={styles.infoValue}>{doc.paymentTerms}</span>
            </div>
          )}
          <div style={styles.infoRow}>
            <span style={{ ...styles.infoLabel, fontWeight: 'bold' }}>
              {isInvoice ? t.dueDate : t.validUntil}
            </span>
            <span style={{ ...styles.infoValue, fontWeight: 'bold' }}>
              {isInvoice ? fmtDate(doc.dueDate!) : fmtDate(doc.validUntil!)}
            </span>
          </div>
          {doc.yourReference && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>{t.yourReference}</span>
              <span style={styles.infoValue}>{doc.yourReference}</span>
            </div>
          )}
          {doc.ourReference && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>{t.ourReference}</span>
              <span style={styles.infoValue}>{doc.ourReference}</span>
            </div>
          )}
          {isInvoice && (
            <div style={styles.interestNote}>
              {t.interestNote}
            </div>
          )}
        </div>

        {/* Right: billing address */}
        <div style={styles.addressBox}>
          <div style={styles.addressHeader}>{t.billingAddress}</div>
          <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>{doc.customerName}</div>
          {fullAddress && <div style={{ fontSize: '10px', color: '#444' }}>{fullAddress}</div>}
        </div>
      </div>

      {/* ── Line items table ── */}
      <table style={styles.table}>
        <thead style={styles.thead}>
          <tr>
            <th style={styles.th}>{t.productService}</th>
            <th style={styles.th}></th>
            <th style={{ ...styles.thRight }}>{t.quantity}</th>
            <th style={{ ...styles.thRight }}>{t.unitPrice}</th>
            <th style={{ ...styles.thRight }}>{t.amount}</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, i) => (
            <tr key={i}>
              <td style={styles.td}>{item.description}</td>
              <td style={styles.td}>{item.unit && item.unit !== 'st' ? item.unit : ''}</td>
              <td style={styles.tdRight}>{fmt(item.quantity)}</td>
              <td style={styles.tdRight}>{fmt(item.unitPrice)}</td>
              <td style={styles.tdRight}>{fmt(item.amount)}</td>
            </tr>
          ))}
          {/* padding rows so footer doesn't overlap content */}
          {Array.from({ length: Math.max(0, 8 - doc.items.length) }).map((_, i) => (
            <tr key={`pad-${i}`}>
              <td style={{ ...styles.td, borderBottom: 'none' }}>&nbsp;</td>
              <td style={{ ...styles.td, borderBottom: 'none' }}></td>
              <td style={{ ...styles.tdRight, borderBottom: 'none' }}></td>
              <td style={{ ...styles.tdRight, borderBottom: 'none' }}></td>
              <td style={{ ...styles.tdRight, borderBottom: 'none' }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals ── */}
      <div style={{ borderTop: '1px dashed #ccc', paddingTop: '10px', marginBottom: '80px' }}>
        <div style={styles.totalsSection}>
          <div style={styles.totalRow}>
            <span>{t.net}:</span>
            <span>{fmt(doc.subtotal)} {t.currency}</span>
          </div>
          <div style={styles.totalRow}>
            <span>{t.vat} {doc.vatRate}% ({t.calculatedOn} {fmt(doc.subtotal)} {t.currency}):</span>
            <span>{fmt(doc.vatAmount)} {t.currency}</span>
          </div>
          <div style={styles.totalSumRow}>
            <span style={styles.totalSumLabel}>{t.totalToPay}:</span>
            <span style={styles.totalSumValue}>{fmt(doc.totalAmount)} {t.currency}</span>
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      {doc.notes && (
        <div style={{ ...styles.notes, marginBottom: '90px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{t.additionalDescription}</div>
          <div style={{ fontStyle: 'italic' }}>{doc.notes}</div>
        </div>
      )}

      {/* ── Footer (always at bottom) ── */}
      <div style={styles.footer}>
        <div style={{ ...styles.footerCol, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/icon.png"
            alt=""
            style={{ width: '20px', height: '20px', objectFit: 'contain', marginBottom: '4px' }}
          />
          <div style={styles.footerLabel}>{t.address}</div>
          <div>{COMPANY.name}</div>
          <div>{COMPANY.address}</div>
          <div>{COMPANY.postalCity}</div>
        </div>
        <div style={styles.footerCol}>
          <div style={styles.footerLabel}>{t.orgNr}</div>
          <div>{COMPANY.orgNumber}</div>
          <div style={{ marginTop: '6px' }}>
            <div style={styles.footerLabel}>{t.vatRegNr}</div>
            <div>{COMPANY.vatNumber}</div>
          </div>
        </div>
        <div style={styles.footerCol}>
          <div style={styles.footerLabel}>{t.companyEmail}</div>
          <div>{COMPANY.email}</div>
        </div>
        <div style={styles.footerCol}>
          <div style={styles.footerLabel}>{t.bankgiro}</div>
          <div>{COMPANY.bankgiro}</div>
          {COMPANY.fSkatt && (
            <div style={{ fontStyle: 'italic', marginTop: '6px' }}>
              {t.fSkatt}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
