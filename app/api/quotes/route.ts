import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function calcTotals(items: any[], vatRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = subtotal * (vatRate / 100);
  return { subtotal, vatAmount, totalAmount: subtotal + vatAmount };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const quote = await prisma.quote.findUnique({
        where: { id: parseInt(id) },
        include: { customer: true, items: true },
      });
      if (!quote) return NextResponse.json({ error: 'Offert hittades inte' }, { status: 404 });
      return NextResponse.json(quote);
    }

    const quotes = await prisma.quote.findMany({
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(quotes);
  } catch (error) {
    return NextResponse.json({ error: 'Kunde inte hämta offerter' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerId, issueDate, validUntil, vatRate, notes, ourReference, yourReference, items } = body;

    if (!customerId || !issueDate || !validUntil || !items?.length)
      return NextResponse.json({ error: 'Obligatoriska fält saknas' }, { status: 400 });

    const count = await prisma.quote.count();
    const quoteNumber = `O-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const parsedItems = items.map((item: any) => ({
      description: item.description,
      quantity: parseFloat(item.quantity),
      unit: item.unit || 'st',
      unitPrice: parseFloat(item.unitPrice),
      vatRate: parseFloat(item.vatRate ?? vatRate ?? 25),
      amount: parseFloat(item.quantity) * parseFloat(item.unitPrice),
    }));

    const { subtotal, vatAmount, totalAmount } = calcTotals(parsedItems, vatRate ?? 25);

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        customerId: parseInt(customerId),
        issueDate: new Date(issueDate),
        validUntil: new Date(validUntil),
        vatRate: parseFloat(vatRate ?? 25),
        notes,
        ourReference,
        yourReference,
        subtotal,
        vatAmount,
        totalAmount,
        items: { create: parsedItems },
      },
      include: { customer: true, items: true },
    });

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json({ error: 'Kunde inte skapa offert' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, customerId, issueDate, validUntil, vatRate, status, notes, ourReference, yourReference, items } = body;

    if (!id) return NextResponse.json({ error: 'ID krävs' }, { status: 400 });

    await prisma.quoteItem.deleteMany({ where: { quoteId: id } });

    const parsedItems = items.map((item: any) => ({
      description: item.description,
      quantity: parseFloat(item.quantity),
      unit: item.unit || 'st',
      unitPrice: parseFloat(item.unitPrice),
      vatRate: parseFloat(item.vatRate ?? vatRate ?? 25),
      amount: parseFloat(item.quantity) * parseFloat(item.unitPrice),
    }));

    const { subtotal, vatAmount, totalAmount } = calcTotals(parsedItems, vatRate ?? 25);

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        customerId: parseInt(customerId),
        issueDate: new Date(issueDate),
        validUntil: new Date(validUntil),
        vatRate: parseFloat(vatRate ?? 25),
        status,
        notes,
        ourReference,
        yourReference,
        subtotal,
        vatAmount,
        totalAmount,
        items: { create: parsedItems },
      },
      include: { customer: true, items: true },
    });

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Kunde inte uppdatera offert' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID krävs' }, { status: 400 });

    await prisma.quote.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: 'Offert raderad' });
  } catch (error) {
    return NextResponse.json({ error: 'Kunde inte radera offert' }, { status: 500 });
  }
}
