import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST - Skapa avskrivning och verifikation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assetId, year, amount, createTransaction } = body;

    // Hämta tillgången
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Tillgång hittades inte' }, { status: 404 });
    }

    // Kontrollera om avskrivning redan finns för detta år
    const existing = await prisma.depreciation.findFirst({
      where: {
        assetId,
        year,
      },
    });

    if (existing) {
      return NextResponse.json({
        error: `Avskrivning för år ${year} finns redan`
      }, { status: 400 });
    }

    let transactionId = null;

    // Skapa verifikation om önskat
    if (createTransaction) {
      // Hämta konto 7810 (Avskrivning inventarier)
      const depreciationAccount = await prisma.account.findFirst({
        where: { number: 7810 },
      });

      // Hämta konto 1229 (Ackumulerade avskrivningar)
      const accumulatedAccount = await prisma.account.findFirst({
        where: { number: 1229 },
      });

      if (!depreciationAccount || !accumulatedAccount) {
        return NextResponse.json({
          error: 'Avskrivningskonton saknas (7810 eller 1229)'
        }, { status: 400 });
      }

      const transaction = await prisma.transaction.create({
        data: {
          date: new Date(`${year}-12-31`),
          description: `Avskrivning ${asset.name} år ${year}`,
          entries: {
            create: [
              {
                accountId: depreciationAccount.id,
                debit: amount,
                credit: 0,
              },
              {
                accountId: accumulatedAccount.id,
                debit: 0,
                credit: amount,
              },
            ],
          },
        },
      });

      transactionId = transaction.id;
    }

    // Skapa avskrivning
    const depreciation = await prisma.depreciation.create({
      data: {
        assetId,
        year,
        amount,
        transactionId,
      },
    });

    // Uppdatera tillgångens värden
    const newTotalDepreciated = asset.totalDepreciated + amount;
    const newCurrentValue = asset.purchasePrice - newTotalDepreciated;
    const isFullyDepreciated = newCurrentValue <= 0;

    await prisma.asset.update({
      where: { id: assetId },
      data: {
        totalDepreciated: newTotalDepreciated,
        currentValue: Math.max(0, newCurrentValue),
        isFullyDepreciated,
      },
    });

    return NextResponse.json({
      depreciation,
      transactionId,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating depreciation:', error);
    return NextResponse.json({
      error: 'Kunde inte skapa avskrivning'
    }, { status: 500 });
  }
}
