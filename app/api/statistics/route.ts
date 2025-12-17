import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all transactions with entries
    const transactions = await prisma.transaction.findMany({
      include: {
        entries: {
          include: {
            account: true,
          },
        },
      },
    });

    // Calculate totals by account type
    const accountTotals: Record<string, { debit: number; credit: number }> = {};

    transactions.forEach(transaction => {
      transaction.entries.forEach(entry => {
        const accountType = entry.account.type;
        if (!accountTotals[accountType]) {
          accountTotals[accountType] = { debit: 0, credit: 0 };
        }
        accountTotals[accountType].debit += entry.debit;
        accountTotals[accountType].credit += entry.credit;
      });
    });

    // Calculate income and expenses
    const income = accountTotals['INTÄKT']?.credit || 0;
    const expenses = accountTotals['KOSTNAD']?.debit || 0;
    const profit = income - expenses;

    // Assets and liabilities
    const assets = (accountTotals['TILLGÅNG']?.debit || 0) - (accountTotals['TILLGÅNG']?.credit || 0);
    const liabilities = (accountTotals['SKULD']?.credit || 0) - (accountTotals['SKULD']?.debit || 0);
    const equity = (accountTotals['EGET_KAPITAL']?.credit || 0) - (accountTotals['EGET_KAPITAL']?.debit || 0);

    // Monthly breakdown
    const monthlyData: Record<string, { income: number; expenses: number }> = {};

    transactions.forEach(transaction => {
      const month = transaction.date.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0 };
      }

      transaction.entries.forEach(entry => {
        if (entry.account.type === 'INTÄKT') {
          monthlyData[month].income += entry.credit;
        } else if (entry.account.type === 'KOSTNAD') {
          monthlyData[month].expenses += entry.debit;
        }
      });
    });

    // Sort monthly data
    const sortedMonthly = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        profit: data.income - data.expenses,
      }));

    // Top expense accounts
    const accountSummary: Record<number, { name: string; number: number; total: number }> = {};

    transactions.forEach(transaction => {
      transaction.entries.forEach(entry => {
        if (entry.account.type === 'KOSTNAD' && entry.debit > 0) {
          if (!accountSummary[entry.account.id]) {
            accountSummary[entry.account.id] = {
              name: entry.account.name,
              number: entry.account.number,
              total: 0,
            };
          }
          accountSummary[entry.account.id].total += entry.debit;
        }
      });
    });

    const topExpenses = Object.values(accountSummary)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // VAT summary
    const vatSummary = {
      outgoing: (accountTotals['SKULD']?.credit || 0), // Simplified - should filter VAT accounts
      incoming: 0, // Would need to calculate from specific VAT accounts
    };

    // Assets and Depreciation data
    const assetsData = await prisma.asset.findMany({
      include: {
        depreciations: true,
      },
    });

    const totalPurchasePrice = assetsData.reduce((sum, asset) => sum + asset.purchasePrice, 0);
    const totalCurrentValue = assetsData.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalDepreciated = assetsData.reduce((sum, asset) => sum + asset.totalDepreciated, 0);

    // Get depreciation for current year from transactions
    const currentYear = new Date().getFullYear();
    const depreciationsThisYear = await prisma.depreciation.findMany({
      where: { year: currentYear },
    });
    const depreciationThisYear = depreciationsThisYear.reduce((sum, dep) => sum + dep.amount, 0);

    return NextResponse.json({
      summary: {
        income,
        expenses,
        profit,
        profitMargin: income > 0 ? ((profit / income) * 100).toFixed(1) : '0',
        assets,
        liabilities,
        equity,
        netWorth: assets - liabilities + equity,
      },
      monthly: sortedMonthly,
      topExpenses,
      vatSummary,
      totalTransactions: transactions.length,
      assetsSummary: {
        totalPurchasePrice,
        totalCurrentValue,
        totalDepreciated,
        depreciationThisYear,
        numberOfAssets: assetsData.length,
      },
    });
  } catch (error) {
    console.error('Error calculating statistics:', error);
    return NextResponse.json(
      { error: 'Kunde inte hämta statistik' },
      { status: 500 }
    );
  }
}
