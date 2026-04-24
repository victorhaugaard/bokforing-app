'use client';

import { useState, useEffect, useRef } from 'react';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import ExportSIE from './components/ExportSIE';
import RecurringTransactions from './components/RecurringTransactions';
import Statistics from './components/Statistics';
import Assets from './components/Assets';
import Notes from './components/Notes';
import StripeTransactions from './components/StripeTransactions';
import Invoices from './components/Invoices';
import BackupManager from './components/BackupManager';
import { useTheme } from './components/ThemeProvider';

// Logo Component
function Logo() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="text-current">
      <path d="M24 4L42.5 14V34L24 44L5.5 34V14L24 4Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
      <path d="M24 8L38.5 16V32L24 40L9.5 32V16L24 8Z" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.2" />
      <text x="24" y="31" textAnchor="middle" fontFamily="Georgia, serif" fontSize="22" fontWeight="400" fill="currentColor">B</text>
    </svg>
  );
}

// Theme Toggle Component
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      title={theme === 'dark' ? 'Byt till ljust läge' : 'Byt till mörkt läge'}
      aria-label="Växla tema"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

// Particle Component
function Particles() {
  return (
    <div className="particles">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  );
}

type TabType = 'transactions' | 'recurring' | 'assets' | 'statistics' | 'invoices' | 'notes' | 'stripe' | 'export';

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'transactions', label: 'Verifikationer', icon: '📋' },
  { id: 'recurring', label: 'Återkommande', icon: '🔄' },
  { id: 'assets', label: 'Inventarier', icon: '🏢' },
  { id: 'statistics', label: 'Statistik', icon: '📊' },
  { id: 'invoices', label: 'Fakturor', icon: '🧾' },
  { id: 'stripe', label: 'Stripe & OSS', icon: '💳' },
  { id: 'notes', label: 'Anteckningar', icon: '📝' },
  { id: 'export', label: 'Exportera', icon: '📤' },
];

export default function Home() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTransactions();
    // Auto-backup once per day
    const lastBackup = localStorage.getItem('lastAutoBackup');
    const today = new Date().toDateString();
    if (lastBackup !== today) {
      fetch('/api/backup', { method: 'POST' })
        .then(() => localStorage.setItem('lastAutoBackup', today))
        .catch(() => {});
    }
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Grain Overlay */}
      <div className="grain-overlay" />

      {/* Particles */}
      <Particles />

      {/* Header */}
      <header className="relative z-10 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo />
              <div>
                <h1 className="text-2xl font-serif tracking-tight">
                  Bokföra
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Professionell bokföring</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="badge">
                v3.0
              </span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="relative z-10 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? 'nav-tab-active' : 'nav-tab'}
              >
                <span className="mr-2">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'transactions' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div ref={formRef}>
              <TransactionForm
                onSuccess={() => {
                  fetchTransactions();
                  setEditingTransaction(null);
                }}
                editTransaction={editingTransaction}
                onCancelEdit={() => setEditingTransaction(null)}
              />
            </div>
            <div>
              {loading ? (
                <div className="glass-card p-8 text-center">
                  <div className="animate-pulse">
                    <div className="w-8 h-8 border-2 border-t-current rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--border-color-strong)', borderTopColor: 'var(--text-primary)' }}></div>
                    <p style={{ color: 'var(--text-muted)' }}>Laddar verifikationer...</p>
                  </div>
                </div>
              ) : (
                <TransactionList
                  transactions={transactions}
                  onDelete={fetchTransactions}
                  onEdit={(transaction) => {
                    setEditingTransaction(transaction);
                    setTimeout(() => {
                      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                />
              )}
            </div>
          </div>
        ) : activeTab === 'recurring' ? (
          <RecurringTransactions />
        ) : activeTab === 'assets' ? (
          <Assets />
        ) : activeTab === 'statistics' ? (
          <Statistics />
        ) : activeTab === 'invoices' ? (
          <Invoices />
        ) : activeTab === 'notes' ? (
          <Notes />
        ) : activeTab === 'stripe' ? (
          <StripeTransactions />
        ) : (
          <div className="max-w-2xl mx-auto space-y-8">
            <ExportSIE />
            <BackupManager />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-16 py-10 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Branding */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Logo />
                <span className="text-lg font-serif">Bokföra</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Enkel och professionell bokföring för svenska företag och enskilda firmor.
              </p>
            </div>

            {/* Features */}
            <div>
              <h4 className="font-medium text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Funktioner</h4>
              <ul className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <li>📋 BAS-kontoplan</li>
                <li>📤 SIE-export (typ 4)</li>
                <li>💳 Stripe & OSS-moms</li>
                <li>📦 Inventariehantering</li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-medium text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Utvecklat av</h4>
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Script Collective AB</strong>
              </p>
              <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                Specialiserade på mjukvarulösningar för företag
              </p>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>
              © {new Date().getFullYear()} Script Collective AB. Alla rättigheter förbehållna.
            </p>
            <div className="flex items-center gap-4">
              <span className="badge text-xs">v3.0</span>
              <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                Gjord med ❤️ i Sverige
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
