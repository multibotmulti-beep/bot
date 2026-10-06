import './globals.css';
import { ThemeProvider } from '../lib/theme/ThemeProvider';
import { ToastProvider } from '../components/toast/ToastProvider';
import { TourProvider } from '../components/tour/TourProvider';
import TourUI from '../components/tour/TourUI';
import { LoadingProvider } from '../components/loading/LoadingProvider';
import VersionChecker from '../components/VersionChecker';
import { CartProvider } from '../lib/CartContext';

export const metadata = {
  title: 'WhatsApp Bot Manager | Asistente de Menús y Automatización',
  description:
    'Plataforma profesional para crear, configurar y gestionar bots y menús interactivos de WhatsApp en tiempo real sin contraseña.',
  keywords: [
    'WhatsApp bot',
    'automatización de WhatsApp',
    'menús numéricos',
    'asistente virtual',
    'CRM WhatsApp',
  ],
  authors: [{ name: 'WhatsApp Bot Manager Team' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider>
          <ToastProvider>
            <TourProvider>
              <TourUI />
              <LoadingProvider>
                <VersionChecker />
                <CartProvider>{children}</CartProvider>
              </LoadingProvider>
            </TourProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
