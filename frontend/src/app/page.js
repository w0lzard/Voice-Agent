'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

import LandingNavbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import IntegrationsSection from '@/components/landing/IntegrationsSection';
import TestimonialSection from '@/components/landing/TestimonialSection';
import PricingSection from '@/components/landing/PricingSection';
import LandingFooter from '@/components/landing/Footer';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Authenticated users go straight to the dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // Avoid flash of landing page for authenticated users
  if (loading || user) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 overflow-x-hidden">
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <IntegrationsSection />
        <TestimonialSection />
        <PricingSection />
      </main>
      <LandingFooter />
    </div>
  );
}
