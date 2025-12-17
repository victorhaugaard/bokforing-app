import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bokföring - Film & Produktionsbolag',
  description: 'Enkel bokföring för ditt företag',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
