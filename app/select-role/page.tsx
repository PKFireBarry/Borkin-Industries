import { currentUser } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/auth/role-helpers';
import { redirect } from 'next/navigation';
import { RoleSelectionContent } from './role-selection-content';

export const metadata = {
  title: 'Select Your Role - Borkin Industries',
  description: 'Choose between becoming a client or contractor on Borkin Industries'
}

export default async function SelectRolePage() {
  const user = await currentUser();
  
  // If not logged in, redirect to sign-in
  if (!user) {
    redirect('/sign-in');
  }
  
  const role = getUserRole(user);
  
  // If user already has a role, redirect to their dashboard
  if (role === 'client') redirect('/dashboard');
  if (role === 'contractor') redirect('/dashboard/contractor');
  if (role === 'admin') redirect('/admin');
  
  // Get user details to personalize the page
  const firstName = user.firstName || user.username || 'there';
  
  return <RoleSelectionContent firstName={firstName} />;
} 