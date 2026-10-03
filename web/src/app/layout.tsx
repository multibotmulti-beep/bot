import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Plantilla Web Modular con Paneles y Dock',
  description: 'Plantilla escalable basada en Next.js, paneles modulares y Dock flotante.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
