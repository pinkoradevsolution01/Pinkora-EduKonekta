import type { Metadata } from 'next';
import PwaRegister from './pwa-register';
import { InteractionFeedback } from './interaction-feedback';
import './globals.css';

export const metadata: Metadata = {
  title: 'JVerse EduKonekta',
  description: 'School communication and student-support platform',
  icons: { icon: '/pinkora-logo.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="system-footer">
          © 2026 EduKonekta. Powered by JVerse. All rights reserved.
        </footer>
        <InteractionFeedback />
        <PwaRegister />
      </body>
    </html>
  );
}
