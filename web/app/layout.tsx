import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Obra Actas Web',
  description: 'Prototipo Next.js para Vercel'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
