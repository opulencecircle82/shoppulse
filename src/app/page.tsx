import HeroVideoSection from "@/components/landing/01-HeroVideoSection";
import AboutSection from "@/components/landing/02-AboutSection";
import FeaturesSection from "@/components/landing/03-FeaturesSection";
import PricingSection from "@/components/landing/04-PricingSection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <main className="flex-1">
        <HeroVideoSection />
        <AboutSection />
        <FeaturesSection />
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}
