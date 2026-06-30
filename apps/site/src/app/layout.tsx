import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ClientLayout } from './client-layout'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://1router.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '1Router — One Interface for All AI Models',
    template: '%s — 1Router',
  },
  description: 'Access and compare all AI models through a single, unified API. Better prices, better uptime, no subscription. Self-hostable and open source.',
  keywords: ['AI models', 'API gateway', 'OpenAI compatible', 'LLM routing', 'self-hosted', 'open source', 'AI provider'],
  authors: [{ name: '1Router' }],
  creator: '1Router',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: '1Router',
    title: '1Router — One Interface for All AI Models',
    description: 'Access and compare all AI models through a single, unified API. Better prices, better uptime, no subscription.',
  },
  twitter: {
    card: 'summary_large_image',
    title: '1Router — One Interface for All AI Models',
    description: 'Access and compare all AI models through a single, unified API. Better prices, better uptime, no subscription.',
    creator: '@1router',
  },
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
