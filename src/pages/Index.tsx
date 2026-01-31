import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ChatBot from "@/components/chat/ChatBot";
import { motion } from "framer-motion";
import { Plane, Bed, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config/api";

const Index = () => {
  const navigate = useNavigate();
  const [bgImage, setBgImage] = useState("/fondo_web2.webp");

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setBgImage("/fondo_mobile_1080.webp");
      } else {
        setBgImage("/fondo_web2.webp");
      }
    };

    handleResize(); // Check on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleRegisterClick = () => {
    navigate('/registrar-compra');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      {/* Background Image - Moved to root level and hardened */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      
      {/* Overlay to ensure text readability */}
      <div className="fixed inset-0 z-0 bg-black/30 bg-blend-overlay pointer-events-none" />

      <Header />
      
      <main className="flex-1 relative z-10">
        {/* Hero Content */}
        <div className="relative pt-32 pb-16 px-4 flex flex-col items-center justify-center text-center">
          
          {/* Logo / Title Area */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            {/* Logo / Title Area - Replaced with Image */}
            <div className="mb-4">
              <img 
                src="/sueno_hincha.png" 
                alt="El Sueño del Hincha Skyworth" 
                className="max-w-[80vw] md:max-w-2xl h-auto mx-auto drop-shadow-2xl"
              />
            </div>
          </motion.div>

          {/* Main Copy */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-4xl mx-auto mb-10"
          >
            <p className="text-white text-lg md:text-2xl font-bold uppercase leading-relaxed drop-shadow-md">
              COMPRA TU TV SKYWORTH, REGISTRA TU COMPRA<br className="hidden md:block" />
              {' '}Y PARTICIPA POR INCREÍBLES PREMIOS.<br />
              <span className="text-skyworth-gold">¡TU BOLETO AL REPECHAJE TE ESPERA!</span>
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRegisterClick}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold text-xl md:text-2xl py-3 px-8 rounded-full shadow-lg border-2 border-orange-400 mb-12 uppercase"
          >
            Registrar Compra
          </motion.button>

          {/* Prize Banner - Replaced components with images */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full max-w-4xl mx-auto"
          >
            {/* 5 Paquetes Image - The white card is likely part of the image or we need to contain it */}
            {/* 5 Paquetes Image - Wrapped in white card as requested */}
            <div className="flex justify-center mb-10">
               <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl inline-block">
                 <img src="/5_paquetes.png" alt="5 Paquetes al Repechaje" className="max-w-[85vw] md:max-w-2xl h-auto" />
               </div>
            </div>

            <p className="text-white font-bold text-lg md:text-2xl mb-8 uppercase drop-shadow-md">EL PREMIO INCLUYE:</p>

            <div className="grid grid-cols-3 gap-8 md:gap-16 max-w-4xl mx-auto mb-12 items-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-28 h-24 md:w-36 md:h-32 lg:w-48 lg:h-40 flex items-center justify-center">
                  <img src="/pasaje.png" alt="Pasajes" className="w-full h-full object-contain hover:scale-110 transition-transform duration-300" />
                </div>
                {/* <span className="text-white font-bold uppercase text-sm md:text-xl drop-shadow-md">Pasajes</span> */}
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 flex items-center justify-center">
                  <img src="/hospedaje.png" alt="Hospedaje" className="w-full h-full object-contain hover:scale-110 transition-transform duration-300" />
                </div>
                {/* <span className="text-white font-bold uppercase text-sm md:text-xl drop-shadow-md">Hospedaje</span> */}
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 flex items-center justify-center">
                  <img src="/entrada.png" alt="Entradas" className="w-full h-full object-contain hover:scale-110 transition-transform duration-300" />
                </div>
                {/* <span className="text-white font-bold uppercase text-sm md:text-xl drop-shadow-md">Entradas</span> */}
              </div>
            </div>
          </motion.div>

          {/* AJ Logo and Legal Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-12 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 max-w-4xl mx-auto"
          >
            {/* AJ Logo - Using new file lo_aj.png */}
            <div className="flex items-center gap-2">
               <img src="/logo_aj.png" alt="AJ Autoridad de Fiscalización del Juego" className="h-20 w-auto object-contain" />
            </div>

            <div className="text-center md:text-left">
              <p className="text-skyworth-blue font-semibold text-xs md:text-sm">
                Promoción válida desde la emisión de resolución administrativa de autorización hasta el 16 de marzo de 2026.
              </p>
              <p className="text-skyworth-blue font-semibold text-xs md:text-sm">
                <a href={`${API_BASE_URL}/api/public/terms/pdf`} target="_blank" rel="noopener noreferrer" className="font-extrabold hover:underline">Bases y Condiciones</a>, ingresa a: <a href="https://hincha.skyworth.bo" target="_blank" rel="noopener noreferrer" className="font-extrabold hover:underline">hincha.skyworth.bo</a>
              </p>
              <p className="text-skyworth-blue font-semibold text-xs md:text-sm">
                Actividad Autorizada y Fiscalizada por la Autoridad de Juegos
              </p>
            </div>
          </motion.div>
        </div>
      </main>
      
      <div className="relative z-10">
        <Footer />
      </div>
      <ChatBot />
    </div>
  );
};

export default Index;
