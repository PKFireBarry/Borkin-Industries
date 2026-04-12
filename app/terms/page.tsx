import TermsOfServiceSection from '@/components/TermsOfServiceSection'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Borkin Industries',
  description: 'Read the Borkin Industries terms of service and legal policies for our pet care services.',
}

export default function TermsPage() {
  return (
    <div className="home-font-theme flex min-h-screen w-full flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 flex flex-col w-full overflow-x-hidden pt-20 sm:pt-24">
        <TermsOfServiceSection defaultOpen hideToggle />
      </main>
      <Footer />
    </div>
  )
}
