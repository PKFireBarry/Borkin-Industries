"use client";

import { useState, useTransition } from 'react';
import { setUserRole } from '@/lib/auth/set-user-role';
import { PawPrint, Home, Briefcase, Check, ChevronRight, Users } from 'lucide-react';
import Image from 'next/image';

interface RoleSelectionContentProps {
  firstName: string;
}

export function RoleSelectionContent({ firstName }: RoleSelectionContentProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<'client' | 'contractor' | null>(null);

  const handleSelect = (role: 'client' | 'contractor') => {
    setSelectedRole(role);
  };

  const handleConfirm = () => {
    if (!selectedRole) return;
    
    startTransition(() => {
      setUserRole(selectedRole);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <PawPrint className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Welcome to Borkin Industries, {firstName}!
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Please select how you'd like to use our platform. This will personalize your experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Client Role Card */}
          <div 
            className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 transition-all ${
              selectedRole === 'client' 
                ? 'border-blue-500 ring-4 ring-blue-100' 
                : 'border-transparent hover:border-gray-200'
            }`}
            onClick={() => handleSelect('client')}
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-2 rounded-full mr-4">
                  <Home className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold">Pet Owner (Client)</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                As a pet owner, you'll be able to find and book professional pet care services for your furry friends.
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">Find qualified pet care professionals in your area</p>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">Book services based on your schedule and needs</p>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">Manage your pets' profiles and care history</p>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">Review and rate your experiences</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-600">
                  {selectedRole === 'client' ? 'Selected' : 'Select this role'}
                </span>
                {selectedRole === 'client' && (
                  <div className="bg-blue-100 p-1 rounded-full">
                    <Check className="h-5 w-5 text-blue-600" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contractor Role Card */}
          <div 
            className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 transition-all ${
              selectedRole === 'contractor' 
                ? 'border-green-500 ring-4 ring-green-100' 
                : 'border-transparent hover:border-gray-200'
            }`}
            onClick={() => handleSelect('contractor')}
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-2 rounded-full mr-4">
                  <Briefcase className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold">Pet Care Provider</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                As a pet care provider, you'll offer your professional services to pet owners in your area.
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">Create a professional profile showcasing your experience</p>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">Set your own rates, availability, and service area</p>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">Receive booking requests and manage your schedule</p>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">Build a reputation with reviews and ratings</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-600">
                  {selectedRole === 'contractor' ? 'Selected' : 'Select this role'}
                </span>
                {selectedRole === 'contractor' && (
                  <div className="bg-green-100 p-1 rounded-full">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <button
            type="button"
            className={`flex items-center justify-center gap-2 py-3 px-8 rounded-lg font-semibold shadow-lg transition-all ${
              selectedRole 
                ? selectedRole === 'client'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!selectedRole || isPending}
            onClick={handleConfirm}
          >
            {isPending ? (
              <>Processing...</>
            ) : (
              <>
                Continue as {selectedRole === 'client' ? 'Pet Owner' : selectedRole === 'contractor' ? 'Pet Care Provider' : 'Selected Role'}
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </button>
          
          <p className="mt-4 text-sm text-gray-500">
            You can always change your role later in your account settings.
          </p>
        </div>
      </div>
    </div>
  );
} 