"use client";

import { ReactNode } from 'react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { PawPrintIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContractorApplyLayoutProps {
  children: ReactNode;
}

export default function ContractorApplyLayout({ children }: ContractorApplyLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <PawPrintIcon className="h-7 w-7 text-pink-500" />
              <span className="font-semibold text-xl text-gray-800">Borkin Industries</span>
            </Link>
            <div className="hidden md:flex items-center ml-6">
              <div className="h-6 w-px bg-gray-200 mx-4"></div>
              <span className="text-sm font-medium text-gray-600">Contractor Application</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
      <footer className="py-6 text-center text-sm text-gray-500 border-t bg-white mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>&copy; {new Date().getFullYear()} Borkin Industries. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
              <Link href="/help" className="hover:text-gray-900 transition-colors">Help</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 