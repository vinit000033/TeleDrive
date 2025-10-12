// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Your Cloud Storage',
  description: 'Self-deployable cloud storage using Telegram',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      {/* Remove hardcoded bg classes like bg-gray-900 or bg-black */}
      <body className={`${inter.className}`}>{children}</body>
    </html>
  )
}