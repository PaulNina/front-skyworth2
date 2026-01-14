import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PitchBackgroundProps {
  children: ReactNode;
  className?: string;
  showConfetti?: boolean;
}

const PitchBackground = ({ children, className = "", showConfetti = false }: PitchBackgroundProps) => {
  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-pitch-pattern" />
      
      {/* Pitch lines overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(90deg, transparent 49.5%, rgba(255,255,255,0.06) 49.5%, rgba(255,255,255,0.06) 50.5%, transparent 50.5%),
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)
          `
        }}
      />
      
      {/* Vignette effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.5) 100%)'
        }}
      />
      
      {/* Confetti particles */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-sm"
              initial={{ 
                top: "-10%",
                left: `${Math.random() * 100}%`,
                rotate: 0,
                opacity: 0.7
              }}
              animate={{ 
                top: "110%",
                rotate: 720,
                opacity: 0
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 4,
                ease: "linear"
              }}
              style={{
                backgroundColor: i % 3 === 0 ? '#1ED760' : i % 3 === 1 ? '#FF8A00' : '#0D2B3A'
              }}
            />
          ))}
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default PitchBackground;