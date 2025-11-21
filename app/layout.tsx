// app/layout.tsx
import type { Metadata } from 'next'

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