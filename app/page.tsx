import Image from "next/image";
import { currentUser } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/auth/role-helpers';
import { RoleButtons } from './role-buttons';
import { redirect } from 'next/navigation';
import { GenerateTestDataButton } from './generate-test-data-button';
import About from "@/components/About";
import HeroSection from "@/components/HeroSection";
import TeamSection from "@/components/TeamSection";
import TermsOfServiceSection from "@/components/TermsOfServiceSection";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ContactComponent from "@/components/Contact";
import WhyChooseUs from "@/components/WhyChooseUs";

export default async function Home() {
  const user = await currentUser();
  const role = getUserRole(user);

  if (role === 'client') redirect('/dashboard');
  if (role === 'contractor') redirect('/dashboard/contractor');
  if (role === 'admin') redirect('/admin');

  return (
    <div className="flex flex-col min-h-screen w-full">
      <Header />
      <main className="flex-1 flex flex-col w-full">
        {/* Role selection buttons for new users */}
        {user && !role && <div className="container mx-auto px-4 py-8"><RoleButtons /></div>}
        {/* Admin-only: Generate test data button */}
        {user && role === 'admin' && <div className="container mx-auto px-4 py-8"><GenerateTestDataButton /></div>}
        
        <HeroSection />
        <div  id='about'><About /></div>
        <TeamSection />
        <WhyChooseUs/>
        <div id="contact"><ContactComponent /></div>
        <TermsOfServiceSection />
        

      </main>
      <Footer />
    </div>
  );
}
