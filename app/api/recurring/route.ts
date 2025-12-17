import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { startOfMonth, addMonths, addDays, isBefore, isAfter } from 'date-fns';

const prisma = new PrismaClient();

// GET - Fetch all recurring transactions
export async function GET() {
  try {
    const recurring = await prisma.recurringTransaction.findMany({
      include: {
        entries: {
          include: {
            account: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(recurring);
  } catch (error) {
    console.error('Error fetching recurring transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring transactions' }, { status: 500 });
  }
}

// POST - Create new recurring transaction
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { description, frequency, startDate, endDate, dayOfMonth, entries } = body;

    // Validate entries balance
    const totalDebit = entries.reduce((sum: number, e: any) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum: number, e: any) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: 'Debet och kredit måste balansera' }, { status: 400 });
    }

    const recurring = await prisma.recurringTransaction.create({
      data: {
        description,
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        dayOfMonth,
        isActive: true,
        entries: {
          create: entries.map((e: any) => ({
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

    return NextResponse.json(recurring, { status: 201 });
  } catch (error) {
    console.error('Error creating recurring transaction:', error);
    return NextResponse.json({ error: 'Failed to create recurring transaction' }, { status: 500 });
  }
}

// DELETE - Delete a recurring transaction
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await prisma.recurringTransaction.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting recurring transaction:', error);
    return NextResponse.json({ error: 'Failed to delete recurring transaction' }, { status: 500 });
  }
}

// PUT - Update a recurring transaction
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, description, frequency, startDate, endDate, dayOfMonth, entries } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID krävs' }, { status: 400 });
    }

    // Validate entries balance
    const totalDebit = entries.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: 'Debet och kredit måste balansera' }, { status: 400 });
    }

    // Delete old entries and create new ones
    await prisma.recurringEntry.deleteMany({
      where: { recurringTransactionId: id },
    });

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        description,
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        dayOfMonth,
        entries: {
          create: entries.map((e: any) => ({
            accountId: e.accountId,
            debit: e.debit || 0,
            credit: e.credit || 0,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating recurring transaction:', error);
    return NextResponse.json({ error: 'Kunde inte uppdatera återkommande betalning' }, { status: 500 });
  }
}

// PATCH - Toggle active status
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive } = body;

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: { isActive },
      include: {
        entries: {
          include: {
            account: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating recurring transaction:', error);
    return NextResponse.json({ error: 'Failed to update recurring transaction' }, { status: 500 });
  }
}
