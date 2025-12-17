import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { number: 'asc' },
    });
    return NextResponse.json(accounts);
  } catch (error) {
    return NextResponse.json(
      { error: 'Kunde inte hämta konton' },
      { status: 500 }
    );
  }
}
