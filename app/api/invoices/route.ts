import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to recalculate totals
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
      const invoice = await prisma.invoice.findUnique({
        where: { id: parseInt(id) },
        include: { customer: true, items: true },
      });
      if (!invoice) return NextResponse.json({ error: 'Faktura hittades inte' }, { status: 404 });
      return NextResponse.json(invoice);
    }

    const invoices = await prisma.invoice.findMany({
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(invoices);
  } catch (error) {
    return NextResponse.json({ error: 'Kunde inte hämta fakturor' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerId, issueDate, dueDate, vatRate, notes, paymentTerms, ourReference, yourReference, items } = body;

    if (!customerId || !issueDate || !dueDate || !items?.length)
      return NextResponse.json({ error: 'Obligatoriska fält saknas' }, { status: 400 });

    // Generate invoice number (F-YYYYMMDD-xxx)
    const count = await prisma.invoice.count();
    const invoiceNumber = `F-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const parsedItems = items.map((item: any) => ({
      description: item.description,
      quantity: parseFloat(item.quantity),
      unit: item.unit || 'st',
      unitPrice: parseFloat(item.unitPrice),
      vatRate: parseFloat(item.vatRate ?? vatRate ?? 25),
      amount: parseFloat(item.quantity) * parseFloat(item.unitPrice),
    }));

    const { subtotal, vatAmount, totalAmount } = calcTotals(parsedItems, vatRate ?? 25);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: parseInt(customerId),
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        vatRate: parseFloat(vatRate ?? 25),
        notes,
        paymentTerms: paymentTerms || '30 dagar netto',
        ourReference,
        yourReference,
        subtotal,
        vatAmount,
        totalAmount,
        items: { create: parsedItems },
      },
      include: { customer: true, items: true },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Kunde inte skapa faktura' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, customerId, issueDate, dueDate, vatRate, status, notes, paymentTerms, ourReference, yourReference, items } = body;

    if (!id) return NextResponse.json({ error: 'ID krävs' }, { status: 400 });

    // Delete old items
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

    const parsedItems = items.map((item: any) => ({
      description: item.description,
      quantity: parseFloat(item.quantity),
      unit: item.unit || 'st',
      unitPrice: parseFloat(item.unitPrice),
      vatRate: parseFloat(item.vatRate ?? vatRate ?? 25),
      amount: parseFloat(item.quantity) * parseFloat(item.unitPrice),
    }));

    const { subtotal, vatAmount, totalAmount } = calcTotals(parsedItems, vatRate ?? 25);

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        customerId: parseInt(customerId),
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        vatRate: parseFloat(vatRate ?? 25),
        status,
        notes,
        paymentTerms,
        ourReference,
        yourReference,
        subtotal,
        vatAmount,
        totalAmount,
        items: { create: parsedItems },
      },
      include: { customer: true, items: true },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Kunde inte uppdatera faktura' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID krävs' }, { status: 400 });

    await prisma.invoice.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: 'Faktura raderad' });
  } catch (error) {
    return NextResponse.json({ error: 'Kunde inte radera faktura' }, { status: 500 });
  }
}
