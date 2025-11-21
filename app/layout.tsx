// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css' // If you have global styles, otherwise remove this line

export const metadata: Metadata = {
  title: 'Trading Bot Dashboard',
  description: 'Automated trading control panel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}