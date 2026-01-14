import PitchBackground from "@/components/ui/PitchBackground";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import PathSelector from "@/components/landing/PathSelector";
import StepsSection from "@/components/landing/StepsSection";
import ProductsSection from "@/components/landing/ProductsSection";
import ChatBot from "@/components/chat/ChatBot";

const Index = () => {
  return (
    <PitchBackground showConfetti>
      <Header />
      <main className="pt-16">
        <HeroSection />
        <PathSelector />
        <StepsSection />
        <ProductsSection />
      </main>
      <Footer />
      <ChatBot />
    </PitchBackground>
  );
};

export default Index;