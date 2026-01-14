import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import CountdownTimer from "@/components/ui/CountdownTimer";
import PromoPrizeCard from "@/components/ui/PromoPrizeCard";
import { useCampaign } from "@/hooks/useCampaign";

const HeroSection = () => {
  const { data: campaign } = useCampaign();
  
  // Use campaign draw_date from DB, fallback to default
  const sorteoDate = campaign?.draw_date 
    ? new Date(campaign.draw_date) 
    : new Date("2026-07-15T20:00:00");

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-green-cta/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-hit/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {/* Main Hero Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Left: Title */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Soccer ball icon integrated with title */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="mb-6"
            >
              <svg viewBox="0 0 100 100" className="w-20 h-20 mx-auto lg:mx-0">
                <circle cx="50" cy="50" r="48" fill="white" stroke="#1ED760" strokeWidth="2"/>
                <path d="M50 10 L65 35 L50 50 L35 35 Z" fill="#0B3A2A"/>
                <path d="M85 40 L75 60 L50 50 L65 35 Z" fill="#0B3A2A"/>
                <path d="M75 80 L50 90 L50 50 L75 60 Z" fill="#0B3A2A"/>
                <path d="M25 80 L50 90 L50 50 L25 60 Z" fill="#0B3A2A"/>
                <path d="M15 40 L25 60 L50 50 L35 35 Z" fill="#0B3A2A"/>
              </svg>
            </motion.div>

            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-white leading-none tracking-wide mb-2">
              EL SUEÑO
            </h1>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-white leading-none tracking-wide mb-4">
              DEL HINCHA
            </h1>
            <h2 className="font-display text-3xl md:text-4xl text-gradient-orange tracking-wider">
              SKYWORTH
            </h2>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 mt-8 justify-center lg:justify-start"
            >
              <Link to="/registro-cliente" className="btn-cta-primary inline-flex items-center justify-center gap-2">
                REGISTRAR COMPRA
              </Link>
              <Link to="/registro-vendedor" className="btn-cta-secondary inline-flex items-center justify-center gap-2">
                SOY VENDEDOR
              </Link>
            </motion.div>
          </motion.div>

          {/* Right: Motivational Text */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center lg:text-right"
          >
            <p className="font-display text-3xl md:text-4xl lg:text-5xl text-white leading-tight tracking-wide">
              ¡UNA PROMO PARA
              <br />
              <span className="text-green-cta">HINCHAS</span> QUE NO
              <br />
              DEJAN DE <span className="text-orange-hit">CREER!</span>
            </p>
          </motion.div>
        </div>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-16"
        >
          <CountdownTimer targetDate={sorteoDate} />
        </motion.div>

        {/* Prize Card */}
        <PromoPrizeCard />
      </div>
    </section>
  );
};

export default HeroSection;