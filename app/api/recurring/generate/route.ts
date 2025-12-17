import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { addMonths, addQuarters, addYears, startOfDay, isBefore, isAfter, setDate } from 'date-fns';

const prisma = new PrismaClient();

// POST - Generate transactions from a recurring transaction
export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();

    const recurring = await prisma.recurringTransaction.findUnique({
      where: { id },
      include: {
        entries: true,
      },
    });

    if (!recurring || !recurring.isActive) {
      return NextResponse.json({ error: 'Recurring transaction not found or inactive' }, { status: 404 });
    }

    const today = startOfDay(new Date());

    // Calculate next date based on last generated or start date
    let generationDate: Date;

    if (recurring.lastGenerated) {
      const lastGen = startOfDay(new Date(recurring.lastGenerated));
      generationDate = getNextDate(lastGen, recurring.frequency, recurring.dayOfMonth);
    } else {
      // First time generating - use start date with the specified day of month
      const startDate = startOfDay(new Date(recurring.startDate));
      generationDate = setDate(startDate, recurring.dayOfMonth);
    }

    // Check if we've passed the end date
    if (recurring.endDate && isAfter(generationDate, new Date(recurring.endDate))) {
      return NextResponse.json({
        error: 'Slutdatum har passerats',
      }, { status: 400 });
    }

    // Create the transaction
    const transaction = await prisma.transaction.create({
      data: {
        date: generationDate,
        description: recurring.description,
        entries: {
          create: recurring.entries.map(e => ({
            accountId: e.accountId,
            debit: e.debit,
            credit: e.credit,
          })),
        },
      },
      include: {
        entries: {
          include: {
            account: true,
          },
        },
      },
    });

    // Update last generated date
    await prisma.recurringTransaction.update({
      where: { id },
      data: { lastGenerated: generationDate },
    });

    return NextResponse.json({
      transaction,
      message: 'Transaktion skapad'
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating transaction:', error);
    return NextResponse.json({ error: 'Failed to generate transaction' }, { status: 500 });
  }
}

function getNextDate(currentDate: Date, frequency: string, dayOfMonth: number): Date {
  let next: Date;

  switch (frequency) {
    case 'MONTHLY':
      next = addMonths(currentDate, 1);
      break;
    case 'QUARTERLY':
      next = addMonths(currentDate, 3);
      break;
    case 'YEARLY':
      next = addYears(currentDate, 1);
      break;
    default:
      next = addMonths(currentDate, 1);
  }

  return setDate(next, dayOfMonth);
}
