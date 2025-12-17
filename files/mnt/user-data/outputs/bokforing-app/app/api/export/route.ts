import { NextResponse } from 'next/server';
import { generateSIE } from '@/lib/sie';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, orgNumber, fiscalYearStart, fiscalYearEnd } = body;

    const sie = await generateSIE({
      companyName,
      orgNumber,
      fiscalYearStart: new Date(fiscalYearStart),
      fiscalYearEnd: new Date(fiscalYearEnd),
    });

    return new NextResponse(sie, {
      headers: {
        'Content-Type': 'text/plain; charset=windows-1252',
        'Content-Disposition': `attachment; filename="bokforing_${new Date().toISOString().split('T')[0]}.se"`,
      },
    });
  } catch (error) {
    console.error('Error generating SIE:', error);
    return NextResponse.json(
      { error: 'Kunde inte generera SIE-fil' },
      { status: 500 }
    );
  }
}
