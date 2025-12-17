import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// BAS-kontoplan - Urval av vanligaste kontona
const accounts = [
  // TILLGÅNGAR (1000-1999)
  { number: 1220, name: 'Inventarier och verktyg', type: 'TILLGÅNG' },
  { number: 1229, name: 'Ackumulerade avskrivningar på inventarier', type: 'TILLGÅNG' },
  { number: 1510, name: 'Kundfordringar', type: 'TILLGÅNG' },
  { number: 1930, name: 'Företagskonto', type: 'TILLGÅNG' },
  { number: 1940, name: 'Kassa', type: 'TILLGÅNG' },
  
  // SKULDER (2000-2999)
  { number: 2440, name: 'Leverantörsskulder', type: 'SKULD' },
  { number: 2510, name: 'Skatteskulder', type: 'SKULD' },
  { number: 2610, name: 'Utgående moms 25%', type: 'SKULD' },
  { number: 2611, name: 'Utgående moms 12%', type: 'SKULD' },
  { number: 2612, name: 'Utgående moms 6%', type: 'SKULD' },
  { number: 2640, name: 'Ingående moms', type: 'SKULD' },
  { number: 2641, name: 'Ingående moms på investeringar', type: 'SKULD' },
  { number: 2893, name: 'Skuld utlägg ägare', type: 'SKULD' },
  { number: 2890, name: 'Ägarlån/Skuld till ägare', type: 'SKULD' },
  
  // EGET KAPITAL (2000-2999)
  { number: 2081, name: 'Aktiekapital', type: 'EGET_KAPITAL' },
  { number: 2091, name: 'Balanserad vinst eller förlust', type: 'EGET_KAPITAL' },
  { number: 2099, name: 'Årets resultat', type: 'EGET_KAPITAL' },
  
  // INTÄKTER (3000-3999)
  { number: 3000, name: 'Försäljning tjänster, 25% moms', type: 'INTÄKT' },
  { number: 3001, name: 'Försäljning tjänster, 12% moms', type: 'INTÄKT' },
  { number: 3002, name: 'Försäljning tjänster, 6% moms', type: 'INTÄKT' },
  { number: 3100, name: 'Försäljning varor, 25% moms', type: 'INTÄKT' },
  
  // KOSTNADER (4000-8999)
  { number: 4000, name: 'Inköp material och varor', type: 'KOSTNAD' },
  { number: 5010, name: 'Lokalhyra', type: 'KOSTNAD' },
  { number: 5400, name: 'Förbrukningsinventarier', type: 'KOSTNAD' },
  { number: 5410, name: 'Programvaror och licenser', type: 'KOSTNAD' },
  { number: 5460, name: 'Förnödenheter', type: 'KOSTNAD' },
  { number: 5800, name: 'Resor', type: 'KOSTNAD' },
  { number: 6071, name: 'Hyra av anläggningstillgångar', type: 'KOSTNAD' },
  { number: 6072, name: 'Leasing av anläggningstillgångar', type: 'KOSTNAD' },
  { number: 6110, name: 'Kontorsmaterial', type: 'KOSTNAD' },
  { number: 6212, name: 'Mobiltelefon', type: 'KOSTNAD' },
  { number: 6230, name: 'Datakommunikation', type: 'KOSTNAD' },
  { number: 6310, name: 'Företagsförsäkringar', type: 'KOSTNAD' },
  { number: 6250, name: 'IT-tjänster', type: 'KOSTNAD' },
  { number: 6540, name: 'IT-program och licenser', type: 'KOSTNAD' },
  { number: 6970, name: 'Tidningar, böcker, tidskrifter', type: 'KOSTNAD' },
  { number: 7010, name: 'Löner till tjänstemän', type: 'KOSTNAD' },
  { number: 7510, name: 'Arbetsgivaravgifter', type: 'KOSTNAD' },
  { number: 7610, name: 'Utbildning', type: 'KOSTNAD' },
  { number: 7832, name: 'Bankkostnader', type: 'KOSTNAD' },
  
  // STRIPE & OSS-RELATERADE KONTON
  // Tillgång - Fordran på Stripe
  { number: 1580, name: 'Fordran Stripe', type: 'TILLGÅNG' },
  
  // Intäkter - OSS och försäljning utanför EU
  { number: 3040, name: 'Försäljning tjänster, OSS-moms', type: 'INTÄKT' },
  { number: 3041, name: 'Försäljning digitala tjänster, OSS', type: 'INTÄKT' },
  { number: 3105, name: 'Försäljning utanför EU', type: 'INTÄKT' },
  { number: 3106, name: 'Försäljning digitala tjänster, utanför EU', type: 'INTÄKT' },
  
  // Skulder - OSS moms (samlat konto)
  { number: 2614, name: 'Utgående moms OSS', type: 'SKULD' },
  
  // Kostnader - Stripe avgifter
  { number: 6530, name: 'Stripe-avgifter', type: 'KOSTNAD' },
  { number: 6531, name: 'Betalningsförmedlingsavgifter', type: 'KOSTNAD' },
  
  // AVSKRIVNINGAR
  { number: 7810, name: 'Avskrivning inventarier', type: 'KOSTNAD' },
];

async function main() {
  console.log('Skapar BAS-kontoplan...');
  
  for (const account of accounts) {
    await prisma.account.upsert({
      where: { number: account.number },
      update: {},
      create: account,
    });
  }
  
  console.log(`${accounts.length} konton skapade!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
