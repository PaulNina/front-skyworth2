import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import CountdownTimer from "@/components/ui/CountdownTimer";

const HeroSection = () => {
  // Fecha del sorteo - configurable desde admin
  const sorteoDate = new Date("2026-07-15T20:00:00");

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-skyworth-blue-light/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Trophy Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="mb-8"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-gold shadow-glow-gold">
            <Trophy className="w-12 h-12 text-skyworth-dark" />
          </div>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-6xl lg:text-7xl font-black uppercase mb-4"
        >
          <span className="text-foreground">GANA EL</span>{" "}
          <span className="text-gradient-gold">MUNDIAL</span>
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl md:text-5xl lg:text-6xl font-black uppercase mb-6"
        >
          <span className="text-foreground">CON</span>{" "}
          <span className="text-gradient-gold">SKYWORTH</span>
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
        >
          Compra tu TV Skyworth, registra tu compra y participa por increíbles premios.
          ¡Tu boleto al Mundial 2026 te espera!
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <Link to="/registro-cliente" className="btn-cta-primary inline-flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            REGISTRAR COMPRA
          </Link>
        </motion.div>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <CountdownTimer targetDate={sorteoDate} />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
