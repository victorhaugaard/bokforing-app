# 📊 Bokföring App

En enkel bokföringsapp byggd i TypeScript med Next.js och SQLite. Perfekt för små företag som vill ha full kontroll över sin bokföring.

## ✨ Funktioner

- ✅ **Registrera verifikationer** med automatisk validering (debet = kredit)
- 📁 **BAS-kontoplan** förkonfigurerad med vanligaste kontona
- 💾 **SQLite databas** - ingen server behövs
- 📤 **SIE-export** (typ 4) - kompatibel med alla bokföringsprogram
- 🎨 **Enkel UI** med Tailwind CSS
- 🔢 **Momshantering** med ingående moms på investeringar

## 🚀 Kom igång

### 1. Installera dependencies

```bash
npm install
```

### 2. Sätt upp databasen

```bash
npm run db:push
```

### 3. Lägg till BAS-kontoplanen

```bash
npx tsx prisma/seed.ts
```

### 4. Starta utvecklingsservern

```bash
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000) i din webbläsare.

## 📖 Så använder du appen

### Skapa en verifikation

1. Gå till fliken "Verifikationer"
2. Välj datum och beskriv transaktionen
3. Lägg till konteringar (minst 2 rader)
4. Se till att debet = kredit (visas längst ner)
5. Klicka "Spara verifikation"

### Exempel: Bokföra utlägg för kamera

**Verifikation: Utlägg kamera Sony, inköp 2025-10-10**

| Konto | Kontonamn | Debet | Kredit |
|-------|-----------|-------|--------|
| 1220 | Inventarier och verktyg | 20 000 | |
| 2641 | Ingående moms på investeringar | 5 000 | |
| 2893 | Skuld utlägg ägare | | 25 000 |

**Totalt:** 25 000 = 25 000 ✓

### Exportera SIE-fil

1. Gå till fliken "Exportera SIE"
2. Fyll i företagsnamn och organisationsnummer
3. Välj räkenskapsår (start och slut)
4. Klicka "Ladda ner SIE-fil"

SIE-filen kan importeras i:
- Fortnox
- Visma eEkonomi
- PE Accounting
- Alla andra bokföringsprogram som stödjer SIE typ 4

## 📁 Projektstruktur

```
bokforing-app/
├── app/
│   ├── api/              # API routes
│   │   ├── accounts/     # Hämta konton
│   │   ├── transactions/ # CRUD för verifikationer
│   │   └── export/       # SIE-export
│   ├── components/       # React komponenter
│   │   ├── TransactionForm.tsx
│   │   ├── TransactionList.tsx
│   │   └── ExportSIE.tsx
│   └── page.tsx          # Huvudsida
├── lib/
│   ├── prisma.ts         # Prisma klient
│   └── sie.ts            # SIE-generering
├── prisma/
│   ├── schema.prisma     # Databasschema
│   └── seed.ts           # BAS-kontoplan
└── package.json
```

## 🗄️ Databasschema

### Account (Konto)
- `number`: Kontonummer (1000-8999)
- `name`: Kontonamn
- `type`: TILLGÅNG, SKULD, EGET_KAPITAL, INTÄKT, KOSTNAD

### Transaction (Verifikation)
- `date`: Datum
- `description`: Beskrivning
- `entries`: Array av konteringar

### Entry (Kontering)
- `accountId`: Koppling till konto
- `debit`: Debetbelopp
- `credit`: Kreditbelopp

## 💡 Tips för bokföring

### Utlägg från ägare
När du köpt något privat åt företaget:
```
Debet: 1220 Inventarier (exkl. moms)
Debet: 2641 Ingående moms
Kredit: 2893 Skuld utlägg ägare (inkl. moms)
```

### Ägarlån (kontantinsättning)
När du sätter in pengar på företagskontot:
```
Debet: 1930 Företagskonto
Kredit: 2890 Ägarlån
```

### Betala tillbaka utlägg
När företaget betalar tillbaka dina utlägg:
```
Debet: 2893 Skuld utlägg ägare
Kredit: 1930 Företagskonto
```

## 🔧 Utveckling

### Visa databasen
```bash
npm run db:studio
```

### Lägg till nya konton
Redigera `prisma/seed.ts` och kör:
```bash
npx tsx prisma/seed.ts
```

### TypeScript check
```bash
npx tsc --noEmit
```

## 🚨 Viktigt att veta

- **Backup**: Databas-filen ligger i `prisma/dev.db` - ta backup regelbundet!
- **Moms**: Se till att rätt momssats används (25%, 12%, 6%)
- **Revision**: Även om detta är ett simpelt system, spara alla originalkvitton
- **Årsbokslut**: Detta system hjälper med löpande bokföring, men du behöver fortfarande göra årsbokslut

## 📚 Resurser

- [BAS-kontoplanen](https://www.bas.se/)
- [SIE-format](https://sie.se/)
- [Next.js Dokumentation](https://nextjs.org/docs)
- [Prisma Dokumentation](https://www.prisma.io/docs)

## 📝 Licens

Detta är ett personligt projekt skapat för ditt företag. Använd fritt!

---

**Frågor?** Detta är en levande app - fortsätt utveckla den efter dina behov! 🚀
