import { motion } from "framer-motion";
import { Plane, Hotel, Ticket } from "lucide-react";

interface PromoPrizeCardProps {
  className?: string;
}

const PromoPrizeCard = ({ className = "" }: PromoPrizeCardProps) => {
  const benefits = [
    { icon: Plane, label: "Pasajes" },
    { icon: Hotel, label: "Hospedaje" },
    { icon: Ticket, label: "Entradas" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={`promo-card ${className}`}
    >
      <div className="grid lg:grid-cols-5 gap-6 items-center">
        {/* Left: Main content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Title */}
          <h3 className="font-display text-3xl md:text-4xl text-pitch-900 tracking-wide leading-tight">
            ¡GÁNATE 1 VIAJE A MONTERREY
          </h3>
          <p className="text-xl text-pitch-700 font-medium">
            para alentar a La Verde en el repechaje!
          </p>
          
          {/* Description */}
          <p className="text-pitch-600">
            Compra una TV SKYWORTH y participa del sorteo de
          </p>
          
          {/* Prize highlight */}
          <div className="flex items-center gap-4 py-4">
            <span className="font-display text-7xl md:text-8xl text-orange-hit leading-none">
              5
            </span>
            <div className="sport-badge text-lg">
              PAQUETES FULL HINCHA
            </div>
          </div>
          
          {/* Tagline */}
          <p className="text-lg text-pitch-700 font-semibold">
            ¡Para ver y apoyar a la SELECCIÓN EN MÉXICO!
          </p>
        </div>
        
        {/* Right: Benefits panel */}
        <div className="lg:col-span-2">
          <div className="bg-pitch-900 rounded-2xl p-6 space-y-4">
            <p className="text-white/70 text-sm uppercase tracking-wider font-display">
              Incluye
            </p>
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.label}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-green-cta/20 flex items-center justify-center">
                  <benefit.icon className="w-6 h-6 text-green-cta" />
                </div>
                <span className="text-white font-display text-xl tracking-wide">
                  {benefit.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PromoPrizeCard;