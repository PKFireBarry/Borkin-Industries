"use client";

import type { ReactNode } from 'react';
import { Suspense } from 'react';
// Link, cn, usePathname, UserButton are not directly used in this simplified layout,
// but kept for potential future small additions. Re-evaluate if not needed.
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { getContractorProfile } from '@/lib/firebase/contractors';
import type { Contractor } from '@/types/contractor';
import { useEffect, useState } from 'react';
// Removed Button, Dialog, DialogContent, Menu, ChevronLeft, ChevronRight, LayoutDashboard etc. as they are for the removed Nav

interface ContractorDashboardLayoutProps {
  children: ReactNode;
}

// Removed navItems constant, as the parent dashboard layout handles navigation

function ContractorDashboardLayoutContent({ children }: ContractorDashboardLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPreviewMode = searchParams?.get('preview') === 'admin';
  const router = useRouter();

  const { user, isLoaded: isUserLoaded } = useUser();
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  // Removed isSidebarCollapsed, isDrawerOpen

  useEffect(() => {
    // Skip profile check in preview mode
    if (isPreviewMode) {
      setIsLoadingStatus(false);
      return;
    }

    if (isUserLoaded && user) {
      getContractorProfile(user.id)
        .then((profile: Contractor | null) => {
          if (profile && profile.application) {
            setApplicationStatus(profile.application.status || 'pending');
          } else {
            setApplicationStatus('not_applied');
          }
        })
        .catch(() => setApplicationStatus('error'))
        .finally(() => setIsLoadingStatus(false));
    } else if (!isUserLoaded) {
      // Still loading user
    } else {
      setIsLoadingStatus(false);
      router.replace('/sign-in');
    }
  }, [user, isUserLoaded, isPreviewMode, router]);

  // Navigate from an effect rather than calling redirect() during render, which
  // could throw mid-render in this client component and corrupt React's hook
  // bookkeeping for that pass (observed as "Rendered more hooks than during
  // the previous render" for brand-new contractor accounts).
  useEffect(() => {
    if (isPreviewMode || !isUserLoaded || isLoadingStatus) return;

    if (pathname === '/dashboard/contractor/apply') {
      if (applicationStatus === 'approved') {
        router.replace('/dashboard/contractor');
      }
      return;
    }

    if (applicationStatus !== 'approved') {
      router.replace('/dashboard/contractor/apply');
    }
  }, [pathname, applicationStatus, isPreviewMode, isUserLoaded, isLoadingStatus, router]);

  if (!isUserLoaded || isLoadingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p>Loading contractor data...</p>
      </div>
    );
  }

  // Allow access in preview mode regardless of application status
  if (isPreviewMode) {
    return <>{children}</>;
  }

  if (pathname === '/dashboard/contractor/apply') {
    if (applicationStatus === 'approved') {
      return null; // redirecting via effect above
    }
    return <>{children}</>;
  }

  if (applicationStatus !== 'approved') {
    return null; // redirecting via effect above
  }

  // User is approved and on a protected contractor route.
  // The parent app/dashboard/layout.tsx will provide the sidebar and main content structure.
  return <>{children}</>;
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <p>Loading contractor data...</p>
    </div>
  );
}

export default function ContractorDashboardLayout({ children }: ContractorDashboardLayoutProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ContractorDashboardLayoutContent>{children}</ContractorDashboardLayoutContent>
    </Suspense>
  );
} 
