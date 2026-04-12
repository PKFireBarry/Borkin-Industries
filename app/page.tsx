import Image from "next/image";
import { currentUser } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/auth/role-helpers';
import { redirect } from 'next/navigation';

import About from "@/components/About";
import HeroSection from "@/components/HeroSection";
import TeamSection from "@/components/TeamSection";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ContactComponent from "@/components/Contact";
import WhyChooseUs from "@/components/WhyChooseUs";
import ServicesSection from "@/components/ServicesSection";

export default async function Home() {
  const user = await currentUser();
  const role = getUserRole(user);

  if (role === 'client') redirect('/dashboard');
  if (role === 'contractor') redirect('/dashboard/contractor');
  if (role === 'admin') redirect('/admin');
  
  // Redirect to role selection page if user is logged in but has no role
  if (user && !role) redirect('/select-role');

  return (
    <div className="home-font-theme flex min-h-screen w-full flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 flex flex-col w-full overflow-x-hidden">

        
        <HeroSection />
        <div id='about'><About /></div>
        <TeamSection />
        <WhyChooseUs/>
        <ServicesSection />
        <div id="contact"><ContactComponent /></div>
      </main>
      <Footer />
    </div>
  );
}
