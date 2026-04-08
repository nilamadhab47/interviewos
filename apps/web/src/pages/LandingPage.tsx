import Navbar from '@/components/landing/Navbar';
import GradientOrbs from '@/components/landing/GradientOrbs';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import Comparison from '@/components/landing/Comparison';
import Pricing from '@/components/landing/Pricing';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-bg-primary">
      <GradientOrbs />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Features />
        <HowItWorks />
        <Comparison />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
