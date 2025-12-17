import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    stripe,
    getPayouts,
    getPayoutDetails,
    getChargeDetails,
    isEUCountry,
    getVATRate,
    EU_VAT_RATES,
    convertToSEK,
    getAccountsForTransaction
} from '@/lib/stripe';

// GET - Hämta Stripe-transaktioner och utbetalningar
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    try {
        switch (action) {
            case 'payouts': {
                // Hämta senaste utbetalningar från Stripe
                if (!stripe) {
                    return NextResponse.json({ error: 'Stripe ej konfigurerad' }, { status: 500 });
                }

                const payouts = await getPayouts(20);
                return NextResponse.json({ payouts });
            }

            case 'pending': {
                // Hämta pending Stripe-transaktioner från databasen
                const pending = await prisma.stripeTransaction.findMany({
                    where: { status: 'pending' },
                    orderBy: { createdAt: 'desc' }
                });
                return NextResponse.json({ transactions: pending });
            }

            case 'processed': {
                // Hämta behandlade transaktioner
                const processed = await prisma.stripeTransaction.findMany({
                    where: { status: 'processed' },
                    orderBy: { processedAt: 'desc' },
                    take: 50
                });
                return NextResponse.json({ transactions: processed });
            }

            case 'oss-summary': {
                // OSS-momssammanställning
                const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
                const quarter = searchParams.get('quarter') ? parseInt(searchParams.get('quarter')!) : null;

                const where: any = { year };
                if (quarter) where.quarter = quarter;

                const reports = await prisma.oSSReport.findMany({
                    where,
                    orderBy: [{ quarter: 'asc' }, { country: 'asc' }]
                });

                // Gruppera per land
                const byCountry = reports.reduce((acc: Record<string, any>, report: any) => {
                    if (!acc[report.country]) {
                        acc[report.country] = {
                            country: report.country,
                            countryName: report.countryName || EU_VAT_RATES[report.country]?.name || report.country,
                            vatRate: report.vatRate,
                            totalTaxable: 0,
                            totalVat: 0
                        };
                    }
                    acc[report.country].totalTaxable += report.taxableAmount;
                    acc[report.country].totalVat += report.vatAmount;
                    return acc;
                }, {} as Record<string, any>);

                return NextResponse.json({
                    year,
                    quarter,
                    summary: Object.values(byCountry),
                    totalVat: Object.values(byCountry).reduce((sum: number, c: any) => sum + c.totalVat, 0)
                });
            }

            default: {
                // Lista alla Stripe-transaktioner
                const transactions = await prisma.stripeTransaction.findMany({
                    orderBy: { createdAt: 'desc' },
                    take: 100
                });
                return NextResponse.json({ transactions });
            }
        }
    } catch (error) {
        console.error('Stripe API error:', error);
        return NextResponse.json({ error: 'Serverfel' }, { status: 500 });
    }
}

// POST - Synka eller bokför Stripe-transaktioner
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'sync-payouts': {
                // Synka utbetalningar från Stripe till databasen
                if (!stripe) {
                    return NextResponse.json({ error: 'Stripe ej konfigurerad' }, { status: 500 });
                }

                const payouts = await getPayouts(20);
                if (!payouts) {
                    return NextResponse.json({ error: 'Kunde inte hämta utbetalningar' }, { status: 500 });
                }

                const synced = [];

                for (const payout of payouts) {
                    // Kolla om redan finns
                    const existing = await prisma.stripeTransaction.findUnique({
                        where: { stripeId: payout.id }
                    });

                    if (!existing) {
                        // Hämta detaljer om utbetalningen
                        const details = await getPayoutDetails(payout.id);

                        const transaction = await prisma.stripeTransaction.create({
                            data: {
                                stripeId: payout.id,
                                type: 'payout',
                                amount: payout.amount / 100,
                                currency: payout.currency.toUpperCase(),
                                netAmount: payout.amount / 100,
                                status: 'pending',
                                description: `Stripe utbetalning ${payout.id}`,
                                rawData: JSON.stringify({ payout, details })
                            }
                        });
                        synced.push(transaction);
                    }
                }

                return NextResponse.json({
                    message: `${synced.length} nya utbetalningar synkade`,
                    synced
                });
            }

            case 'process': {
                // Bokför en Stripe-transaktion
                const { transactionId } = body;

                const stripeTransaction = await prisma.stripeTransaction.findUnique({
                    where: { id: transactionId }
                });

                if (!stripeTransaction) {
                    return NextResponse.json({ error: 'Transaktion hittades inte' }, { status: 404 });
                }

                if (stripeTransaction.status === 'processed') {
                    return NextResponse.json({ error: 'Redan bokförd' }, { status: 400 });
                }

                // Skapa verifikation baserat på transaktionstyp
                const amountSEK = convertToSEK(stripeTransaction.amount, stripeTransaction.currency);
                const feeSEK = stripeTransaction.stripeFee
                    ? convertToSEK(stripeTransaction.stripeFee, stripeTransaction.currency)
                    : 0;

                let entries: { accountId: number; debit: number; credit: number }[] = [];

                if (stripeTransaction.type === 'payout') {
                    // Utbetalning: 1930 Företagskonto debit, 1580 Fordran Stripe kredit
                    const stripeAccount = await prisma.account.findUnique({ where: { number: 1580 } });
                    const bankAccount = await prisma.account.findUnique({ where: { number: 1930 } });
                    const feeAccount = await prisma.account.findUnique({ where: { number: 6530 } });

                    if (!stripeAccount || !bankAccount) {
                        return NextResponse.json({ error: 'Konton saknas' }, { status: 400 });
                    }

                    entries = [
                        { accountId: bankAccount.id, debit: amountSEK, credit: 0 },
                        { accountId: stripeAccount.id, debit: 0, credit: amountSEK + feeSEK }
                    ];

                    if (feeSEK > 0 && feeAccount) {
                        entries.push({ accountId: feeAccount.id, debit: feeSEK, credit: 0 });
                    }
                } else if (stripeTransaction.type === 'charge') {
                    // Försäljning: Bestäm konton baserat på kundland
                    const accounts = getAccountsForTransaction(
                        stripeTransaction.customerCountry || undefined,
                        amountSEK,
                        stripeTransaction.vatRate || 0
                    );

                    const stripeAccount = await prisma.account.findUnique({ where: { number: 1580 } });
                    const revenueAccount = await prisma.account.findUnique({ where: { number: accounts.revenueAccount } });
                    const feeAccount = await prisma.account.findUnique({ where: { number: 6530 } });

                    if (!stripeAccount || !revenueAccount) {
                        return NextResponse.json({ error: 'Konton saknas' }, { status: 400 });
                    }

                    entries = [
                        { accountId: stripeAccount.id, debit: amountSEK - feeSEK, credit: 0 }
                    ];

                    if (feeSEK > 0 && feeAccount) {
                        entries.push({ accountId: feeAccount.id, debit: feeSEK, credit: 0 });
                    }

                    entries.push({ accountId: revenueAccount.id, debit: 0, credit: accounts.netAmount });

                    if (accounts.vatAccount && accounts.vatAmount > 0) {
                        const vatAccount = await prisma.account.findUnique({ where: { number: accounts.vatAccount } });
                        if (vatAccount) {
                            entries.push({ accountId: vatAccount.id, debit: 0, credit: accounts.vatAmount });

                            // Spara OSS-rapport om det är EU-försäljning (ej Sverige)
                            if (stripeTransaction.customerCountry &&
                                isEUCountry(stripeTransaction.customerCountry) &&
                                stripeTransaction.customerCountry !== 'SE') {
                                const date = new Date();
                                const quarter = Math.ceil((date.getMonth() + 1) / 3);

                                await prisma.oSSReport.create({
                                    data: {
                                        quarter,
                                        year: date.getFullYear(),
                                        country: stripeTransaction.customerCountry,
                                        countryName: EU_VAT_RATES[stripeTransaction.customerCountry]?.name,
                                        vatRate: accounts.vatAmount > 0 ? (stripeTransaction.vatRate || getVATRate(stripeTransaction.customerCountry)) : 0,
                                        taxableAmount: accounts.netAmount,
                                        vatAmount: accounts.vatAmount
                                    }
                                });
                            }
                        }
                    }
                }

                // Skapa verifikation
                const transaction = await prisma.transaction.create({
                    data: {
                        date: new Date(),
                        description: stripeTransaction.description || `Stripe ${stripeTransaction.type} ${stripeTransaction.stripeId}`,
                        entries: {
                            create: entries
                        }
                    }
                });

                // Uppdatera Stripe-transaktion
                await prisma.stripeTransaction.update({
                    where: { id: transactionId },
                    data: {
                        status: 'processed',
                        transactionId: transaction.id,
                        processedAt: new Date()
                    }
                });

                return NextResponse.json({
                    message: 'Transaktion bokförd',
                    transactionId: transaction.id
                });
            }

            case 'add-manual': {
                // Lägg till manuell Stripe-transaktion
                const { type, amount, currency, customerCountry, vatRate, stripeFee, description } = body;

                const transaction = await prisma.stripeTransaction.create({
                    data: {
                        stripeId: `manual_${Date.now()}`,
                        type,
                        amount: parseFloat(amount),
                        currency: currency || 'SEK',
                        customerCountry,
                        vatRate: vatRate ? parseFloat(vatRate) : null,
                        stripeFee: stripeFee ? parseFloat(stripeFee) : null,
                        netAmount: parseFloat(amount) - (stripeFee ? parseFloat(stripeFee) : 0),
                        status: 'pending',
                        description
                    }
                });

                return NextResponse.json({ transaction });
            }

            default:
                return NextResponse.json({ error: 'Ogiltig action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Stripe POST error:', error);
        return NextResponse.json({ error: 'Serverfel' }, { status: 500 });
    }
}

// DELETE - Ta bort pending transaktion
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID saknas' }, { status: 400 });
        }

        const transaction = await prisma.stripeTransaction.findUnique({
            where: { id: parseInt(id) }
        });

        if (!transaction) {
            return NextResponse.json({ error: 'Hittades inte' }, { status: 404 });
        }

        if (transaction.status === 'processed') {
            return NextResponse.json({ error: 'Kan inte ta bort bokförd transaktion' }, { status: 400 });
        }

        await prisma.stripeTransaction.delete({
            where: { id: parseInt(id) }
        });

        return NextResponse.json({ message: 'Borttagen' });
    } catch (error) {
        console.error('Stripe DELETE error:', error);
        return NextResponse.json({ error: 'Serverfel' }, { status: 500 });
    }
}
