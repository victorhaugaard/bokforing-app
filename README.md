# 📚 Bokföra

En modern och professionell bokföringsapplikation byggd för svenska företag och enskilda firmor.

![Version](https://img.shields.io/badge/version-3.0-blue)
![License](https://img.shields.io/badge/license-Private-red)

## ✨ Funktioner

- **📋 Verifikationer** - Skapa och hantera bokföringsverifikationer med BAS-kontoplan
- **🔄 Återkommande betalningar** - Automatisera fasta kostnader som hyra och prenumerationer
- **📦 Inventarieregister** - Hantera tillgångar med automatiska avskrivningar
- **📊 Statistik** - Ekonomisk översikt med intäkter, kostnader och resultat
- **💳 Stripe & OSS-moms** - Hantera EU-försäljning och momsredovisning
- **📝 Anteckningar** - TODO-lista och anteckningar för bokföringsuppgifter
- **📤 SIE-export** - Exportera till SIE typ 4 för revisor och bokföringsprogram
- **🌙 Dark/Light mode** - Premiumdesign med stöd för mörkt och ljust tema

## 🛠️ Teknisk stack

- **Frontend:** Next.js 14, React, TypeScript
- **Styling:** Tailwind CSS med custom design system
- **Backend:** Next.js API Routes
- **Databas:** SQLite med Prisma ORM

## 🚀 Kom igång

### Förutsättningar

- Node.js 18+
- npm eller yarn

### Installation

```bash
# Klona repot
git clone git@github.com:victorhaugaard/bokforing-app.git
cd bokforing-app

# Installera beroenden
npm install

# Skapa databasen
npx prisma generate
npx prisma db push

# Seeda kontoplanen (valfritt)
npx prisma db seed

# Starta utvecklingsservern
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000) i din webbläsare.

## 📁 Projektstruktur

```
bokforing-app/
├── app/                    # Next.js App Router
│   ├── api/               # API-routes
│   ├── components/        # React-komponenter
│   ├── globals.css        # Globala stilar
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Huvudsida
├── prisma/                # Prisma schema och databas
├── public/                # Statiska filer
└── package.json
```

## 📄 Licens

Privat - © 2025 Script Collective AB. Alla rättigheter förbehållna.

---

Utvecklad med ❤️ av **Script Collective AB**
