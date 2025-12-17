import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Hämta alla tillgångar
export async function GET() {
  try {
    const assets = await prisma.asset.findMany({
      include: {
        depreciations: {
          orderBy: { year: 'desc' },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });
    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json({
      error: 'Kunde inte hämta tillgångar'
    }, { status: 500 });
  }
}

// POST - Skapa ny tillgång
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      purchaseDate,
      purchasePrice,
      depreciationRate,
      depreciationMethod,
      accountId,
      notes
    } = body;

    const asset = await prisma.asset.create({
      data: {
        name,
        purchaseDate: new Date(purchaseDate),
        purchasePrice,
        depreciationRate,
        depreciationMethod: depreciationMethod || 'LINEAR',
        accountId,
        currentValue: purchasePrice,
        notes: notes || null,
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json({
      error: 'Kunde inte skapa tillgång'
    }, { status: 500 });
  }
}

// PUT - Uppdatera tillgång
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, purchasePrice, depreciationRate, notes } = body;

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        name,
        purchasePrice,
        depreciationRate,
        currentValue: purchasePrice,
        notes,
      },
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json({
      error: 'Kunde inte uppdatera tillgång'
    }, { status: 500 });
  }
}

// DELETE - Radera tillgång
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID saknas' }, { status: 400 });
    }

    await prisma.asset.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json({
      error: 'Kunde inte radera tillgång'
    }, { status: 500 });
  }
}
