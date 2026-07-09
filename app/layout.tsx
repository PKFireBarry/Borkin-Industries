import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Boogaloo, Bubblegum_Sans, Fredoka, Geist, Geist_Mono, Permanent_Marker } from 'next/font/google'
import './globals.css'
import { BanCheck } from '@/components/ban-check'
import { Toaster } from "@/components/ui/sonner"

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const permanentMarker = Permanent_Marker({
  variable: '--font-home-accent',
  subsets: ['latin'],
  weight: ['400'],
})

const boogaloo = Boogaloo({
  variable: '--font-home-boogaloo',
  subsets: ['latin'],
  weight: ['400'],
})

const bubblegumSans = Bubblegum_Sans({
  variable: '--font-home-display',
  subsets: ['latin'],
  weight: ['400'],
})

const fredoka = Fredoka({
  variable: '--font-home-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Borkin Industries - Professional Pet Care Services',
  description: 'Professional at-home pet care services by Borkin Industries',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} ${permanentMarker.variable} ${fredoka.variable} ${boogaloo.variable} ${bubblegumSans.variable} antialiased`}>
          <BanCheck />
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  )
}
