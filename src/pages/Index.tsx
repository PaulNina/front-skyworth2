import PitchBackground from "@/components/ui/PitchBackground";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import StepsSection from "@/components/landing/StepsSection";
import ProductsSection from "@/components/landing/ProductsSection";
import RegistrarCompraForm from "@/components/cliente/RegistrarCompraForm";
import ChatBot from "@/components/chat/ChatBot";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <PitchBackground showConfetti>
      <Header />
      <main className="pt-16">
        <HeroSection />
        <StepsSection />
        <ProductsSection />
        
        {/* Formulario de registro embebido */}
        <section id="registrar-compra" className="py-20 px-4">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="font-display text-4xl md:text-5xl text-white mb-4">
                REGISTRA TU <span className="text-gradient-orange">COMPRA</span>
              </h2>
              <p className="text-white/60 text-lg">
                Completa el formulario para participar en el sorteo del viaje al repechaje
              </p>
            </motion.div>
            
            <RegistrarCompraForm embedded />
          </div>
        </section>
      </main>
      <Footer />
      <ChatBot />
    </PitchBackground>
  );
};

export default Index;
