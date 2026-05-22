import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import HeroSection from '../components/landing/HeroSection'
import TokenEfficiencySection from '../components/landing/TokenEfficiencySection'
import FeaturesSection from '../components/landing/FeaturesSection'
import CtaSection from '../components/landing/CtaSection'
import PricingSection from '../components/landing/PricingSection'

export default function Landing() {
  return (
    <div className="font-sans text-on-surface">
      <Navbar />
      <main>
        <HeroSection />
        <TokenEfficiencySection />
        <FeaturesSection />
        <PricingSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}
