// Landing page (launch / waitlist) — matches the warm-orange design.
// Each section is its own component in src/components/landing/.

import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { MarketplacePreview } from '@/components/landing/MarketplacePreview';
import { Benefits } from '@/components/landing/Benefits';
import { Packages } from '@/components/landing/Packages';
import { Features } from '@/components/landing/Features';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Cta } from '@/components/landing/Cta';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <>
      <div className="decorative-blob" aria-hidden />
      <Header />
      <main>
        <Hero />
        <MarketplacePreview />
        <Benefits />
        <Packages />
        <Features />
        <HowItWorks />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
