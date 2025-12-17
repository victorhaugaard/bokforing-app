import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        entries: {
          include: {
            account: true,
          },
        },
        attachments: true,
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json(
      { error: 'Kunde inte hämta transaktioner' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, description, entries } = body;

    // Validera att debet = kredit
    const totalDebit = entries.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: 'Debet och kredit måste balansera!' },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(date),
        description,
        entries: {
          create: entries.map((entry: any) => ({
            accountId: entry.accountId,
            debit: entry.debit || 0,
            credit: entry.credit || 0,
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

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Kunde inte skapa transaktion' },
      { status: 500 }
    );
  }
}

// PUT - Update a transaction
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, date, description, entries } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID krävs' }, { status: 400 });
    }

    // Validera att debet = kredit
    const totalDebit = entries.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: 'Debet och kredit måste balansera!' },
        { status: 400 }
      );
    }

    // Delete old entries and create new ones
    await prisma.entry.deleteMany({
      where: { transactionId: id },
    });

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        date: new Date(date),
        description,
        entries: {
          create: entries.map((entry: any) => ({
            accountId: entry.accountId,
            debit: entry.debit || 0,
            credit: entry.credit || 0,
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

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Kunde inte uppdatera transaktion' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a transaction
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID krävs' }, { status: 400 });
    }

    await prisma.transaction.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Transaktion raderad' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Kunde inte radera transaktion' },
      { status: 500 }
    );
  }
}
