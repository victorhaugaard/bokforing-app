#!/bin/bash

echo "📦 Installerar dependencies..."
npm install

echo ""
echo "🗄️ Skapar databas..."
npm run db:push

echo ""
echo "📁 Laddar BAS-kontoplan..."
npx tsx prisma/seed.ts

echo ""
echo "✅ Allt klart!"
echo ""
echo "🚀 Starta appen med: npm run dev"
echo "🌐 Öppna sedan: http://localhost:3000"
