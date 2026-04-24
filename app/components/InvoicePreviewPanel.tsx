'use client';

import { useState, useRef, useEffect } from 'react';
import InvoiceTemplate, { TemplateDoc } from './InvoiceTemplate';

interface Props {
  doc: TemplateDoc | null;
  logo: string | null;
  onClose: () => void;
}

export default function InvoicePreviewPanel({ doc, logo, onClose }: Props) {
  const [exporting, setExporting] = useState(false);
  const [isEnglish, setIsEnglish] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scale the 794px template to fit the panel
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    function recalc() {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth - 32; // padding
        setScale(Math.min(w / 794, 1));
      }
    }
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);

  // Convert a URL to base64 so html2canvas can embed it cross-origin
  async function toBase64(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function downloadPDF() {
    if (!doc) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      const el = document.getElementById('invoice-template');
      if (!el) return;

      // Pre-convert all <img> src to base64 so html2canvas can render them
      const imgs = Array.from(el.querySelectorAll('img')) as HTMLImageElement[];
      const origSrcs: string[] = [];
      await Promise.all(
        imgs.map(async (img, i) => {
          origSrcs[i] = img.src;
          try {
            img.src = await toBase64(img.src);
          } catch { /* keep original */ }
        })
      );

      // Capture at scale=1
      const originalTransform = (el as HTMLElement).style.transform;
      (el as HTMLElement).style.transform = 'scale(1)';

      const canvas = await html2canvas(el as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Restore
      (el as HTMLElement).style.transform = originalTransform;
      imgs.forEach((img, i) => { img.src = origSrcs[i]; });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let y = 0;
      let remaining = imgH;
      let first = true;
      while (remaining > 1) { // >1mm threshold to prevent empty pages from rounding errors
        if (!first) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH);
        y += pageH;
        remaining -= Math.min(remaining, pageH);
        first = false;
      }

      const filename = `${doc.type === 'invoice' ? 'Faktura' : 'Offert'}-${doc.number}.pdf`;
      pdf.save(filename);
    } catch (e) {
      console.error('PDF-fel:', e);
      alert('Kunde inte generera PDF. Försök igen.');
    } finally {
      setExporting(false);
    }
  }

  if (!doc) return null;

  return (
    <div className="flex flex-col h-full" style={{ minWidth: 0 }}>
      {/* Panel toolbar */}
      <div className="flex items-center justify-between gap-3 p-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Förhandsvisning
          </span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
            {doc.type === 'invoice' ? doc.number : doc.number}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          {doc.type === 'quote' && (
            <label className="flex items-center gap-1 text-xs mr-2" style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isEnglish}
                onChange={(e) => setIsEnglish(e.target.checked)}
              />
              🇬🇧 English (EUR)
            </label>
          )}
          <button
            onClick={downloadPDF}
            disabled={exporting}
            className="btn-primary text-xs py-1.5 px-3"
          >
            {exporting ? '⏳ Genererar...' : '⬇️ Ladda ner PDF'}
          </button>
          <button
            onClick={onClose}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            ✕ Stäng
          </button>
        </div>
      </div>

      {/* Scrollable preview */}
      <div className="flex-1 overflow-auto p-4" style={{ background: '#e5e7eb' }} ref={containerRef}>
        <div
          style={{
            width: `${794 * scale}px`,
            height: `${1123 * scale}px`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <InvoiceTemplate doc={doc} logo={logo} scale={scale} isEnglish={isEnglish} />
        </div>
      </div>
    </div>
  );
}
