import { prisma } from './prisma';
import { format } from 'date-fns';

interface SIEOptions {
  companyName: string;
  orgNumber: string;
  fiscalYearStart: Date;
  fiscalYearEnd: Date;
}

export async function generateSIE(options: SIEOptions): Promise<string> {
  const accounts = await prisma.account.findMany({
    orderBy: { number: 'asc' },
  });

  const transactions = await prisma.transaction.findMany({
    include: {
      entries: {
        include: {
          account: true,
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  let sie = '';

  // Header
  sie += '#FLAGGA 0\n';
  sie += '#FORMAT PC8\n';
  sie += `#GEN ${format(new Date(), 'yyyyMMdd')}\n`;
  sie += '#SIETYP 4\n';
  sie += '#PROGRAM "Bokföring App" 1.0\n';
  
  // Company info
  sie += `#FNAMN "${options.companyName}"\n`;
  sie += `#ORGNR ${options.orgNumber}\n`;
  
  // Fiscal year
  sie += `#RAR 0 ${format(options.fiscalYearStart, 'yyyyMMdd')} ${format(options.fiscalYearEnd, 'yyyyMMdd')}\n`;
  
  // Accounts
  for (const account of accounts) {
    sie += `#KONTO ${account.number} "${account.name}"\n`;
    sie += `#KTYP ${account.number} ${mapAccountType(account.type)}\n`;
  }

  // Transactions
  for (const transaction of transactions) {
    const transDate = format(transaction.date, 'yyyyMMdd');
    sie += `#VER "" "${transaction.id}" ${transDate} "${transaction.description}"\n`;
    sie += '{\n';
    
    for (const entry of transaction.entries) {
      const amount = entry.debit > 0 ? entry.debit : -entry.credit;
      sie += `\t#TRANS ${entry.account.number} {} ${amount.toFixed(2)}\n`;
    }
    
    sie += '}\n';
  }

  return sie;
}

function mapAccountType(type: string): string {
  switch (type) {
    case 'TILLGÅNG':
      return 'T';
    case 'SKULD':
      return 'S';
    case 'EGET_KAPITAL':
      return 'K';
    case 'INTÄKT':
      return 'I';
    case 'KOSTNAD':
      return 'K';
    default:
      return 'T';
  }
}
