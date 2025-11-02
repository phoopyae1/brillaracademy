import type { Metadata } from 'next';
import { ReactNode } from 'react';
import ThemeRegistry from '@/components/ThemeRegistry';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brillar Academy Platform',
  description: 'A minimal, elegant academic platform experience powered by Next.js, MUI, and PostgreSQL.'
};

type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
