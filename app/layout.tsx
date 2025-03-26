import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Substantial Presence Test Calculator',
  description: 'Substantial Presence Test Calculator',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
