'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

export function BanCheck() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    // Only run once the user is loaded and we haven't already checked
    if (!isLoaded || isChecked || !user) return;

    const checkIfBanned = async () => {
      try {
        // Get the user's ID and email
        const userId = user.id;
        const userEmail = user.primaryEmailAddress?.emailAddress;

        // If we don't have an ID or email, we can't check
        if (!userId && !userEmail) return;

        let isBanned = false;
        
        // List of collections to check for bans
        const banCollections = ['banned_contractors', 'banned_clients'];
        
        // Check each ban collection
        for (const collectionName of banCollections) {
          // Check by userId
          if (userId && !isBanned) {
            const bannedByIdQuery = query(
              collection(db, collectionName),
              where('userId', '==', userId)
            );
            const bannedByIdSnapshot = await getDocs(bannedByIdQuery);
            if (!bannedByIdSnapshot.empty) {
              isBanned = true;
              break;
            }
          }
          
          // Check by email
          if (userEmail && !isBanned) {
            const bannedByEmailQuery = query(
              collection(db, collectionName),
              where('email', '==', userEmail)
            );
            const bannedByEmailSnapshot = await getDocs(bannedByEmailQuery);
            if (!bannedByEmailSnapshot.empty) {
              isBanned = true;
              break;
            }
          }
        }

        // If banned, redirect to the banned page
        if (isBanned) {
          router.push('/not-authorized?banned=1');
        }

        // Mark as checked so we don't check again
        setIsChecked(true);
      } catch (error) {
        console.error('Error checking banned status:', error);
      }
    };

    checkIfBanned();
  }, [user, isLoaded, isChecked, router]);

  // This component doesn't render anything
  return null;
} 