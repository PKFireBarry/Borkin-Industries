import { ReactNode } from 'react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { PawPrintIcon } from 'lucide-react';

export default function RoleSelectionLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="bg-white shadow-sm py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <PawPrintIcon className="h-6 w-6 text-blue-600" />
            <span className="font-semibold text-xl">Borkin Industries</span>
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>
      {children}
    </>
  );
} 