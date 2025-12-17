'use client';

import { useState, useEffect } from 'react';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import ExportSIE from './components/ExportSIE';

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'export'>('transactions');

  useEffect(() => {
    fetchTransactions();
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            📊 Bokföring - Film & Produktionsbolag
          </h1>
          <p className="text-gray-600 mt-1">Enkel bokföring med SIE-export</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Verifikationer
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'export'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Exportera SIE
            </button>
          </nav>
        </div>

        {activeTab === 'transactions' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <TransactionForm onSuccess={fetchTransactions} />
            </div>
            <div>
              {loading ? (
                <div className="bg-white p-6 rounded-lg shadow text-center">
                  <p className="text-gray-500">Laddar...</p>
                </div>
              ) : (
                <TransactionList transactions={transactions} />
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <ExportSIE />
          </div>
        )}
      </main>

      <footer className="mt-12 py-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Bokföring App v1.0 - Skapat för ditt film- och produktionsbolag</p>
          <p className="mt-1">BAS-kontoplan • SIE typ 4 • Momsberäkning</p>
        </div>
      </footer>
    </div>
  );
}
