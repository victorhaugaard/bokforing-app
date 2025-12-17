'use client';

import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface Transaction {
  id: number;
  date: string;
  description: string;
  entries: Array<{
    id: number;
    debit: number;
    credit: number;
    account: {
      number: number;
      name: string;
    };
  }>;
}

export default function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
        Inga verifikationer ännu. Skapa din första!
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50">
        <h2 className="text-xl font-bold">Verifikationer</h2>
      </div>
      
      <div className="divide-y">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-medium">Ver #{transaction.id}</span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-gray-600">
                  {format(new Date(transaction.date), 'PPP', { locale: sv })}
                </span>
              </div>
            </div>
            
            <p className="text-sm text-gray-700 mb-3">{transaction.description}</p>
            
            <div className="space-y-1">
              {transaction.entries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-12 text-sm">
                  <div className="col-span-6 text-gray-600">
                    {entry.account.number} - {entry.account.name}
                  </div>
                  <div className="col-span-3 text-right">
                    {entry.debit > 0 && `${entry.debit.toFixed(2)} kr`}
                  </div>
                  <div className="col-span-3 text-right">
                    {entry.credit > 0 && `${entry.credit.toFixed(2)} kr`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
