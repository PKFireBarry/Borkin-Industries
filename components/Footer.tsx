import Link from "next/link"
import { PawPrintIcon as Paw, Facebook, Instagram, } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="w-full py-6 bg-purple-600 dark:bg-purple-900 text-white overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
        <div className="flex flex-col items-center md:items-start">
          <Link href="#" className="flex items-center">
            <Paw className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
            <span className="ml-2 text-lg sm:text-2xl font-bold">Borkin Industries</span>
          </Link>
          <p className="mt-2 text-xs sm:text-sm text-center md:text-left">© 2025 Borkin Industries. All rights reserved.</p>
        </div>
        <nav className="flex gap-4 sm:gap-6">

        </nav>
        <div className="flex items-center space-x-4">
          <Link href="https://www.facebook.com/share/18y5Ap5sKe/" className="text-white hover:text-yellow-400 transition-colors">
            <Facebook className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="sr-only">Facebook</span>
          </Link>
          <Link href="https://www.instagram.com/borkin.industries?igsh=Nnl5bWdheWg2ampj" className="text-white hover:text-yellow-400 transition-colors">
            <Instagram className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="sr-only">Instagram</span>
          </Link>
        </div>
      </div>
    </footer>
  )
}

