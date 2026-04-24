import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: { select: { invoices: true, quotes: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: 'Kunde inte hämta kunder' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, orgNumber, email, phone, address, postalCode, city, country, notes } = body;

    if (!name) return NextResponse.json({ error: 'Namn krävs' }, { status: 400 });

    const customer = await prisma.customer.create({
      data: { name, orgNumber, email, phone, address, postalCode, city, country: country || 'Sverige', notes },
    });
    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: 'Kunde inte skapa kund' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, orgNumber, email, phone, address, postalCode, city, country, notes } = body;

    if (!id) return NextResponse.json({ error: 'ID krävs' }, { status: 400 });

    const customer = await prisma.customer.update({
      where: { id },
      data: { name, orgNumber, email, phone, address, postalCode, city, country, notes },
    });
    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: 'Kunde inte uppdatera kund' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID krävs' }, { status: 400 });

    await prisma.customer.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: 'Kund raderad' });
  } catch (error) {
    return NextResponse.json({ error: 'Kunde inte radera kund' }, { status: 500 });
  }
}
