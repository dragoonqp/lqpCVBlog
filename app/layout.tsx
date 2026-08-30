import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Qiuping Long — Senior Front-End Engineer',
  description:
    'Senior front-end engineer portfolio focused on data products, enterprise systems, and thoughtful user experiences.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body>{children}</body>
    </html>
  );
}
