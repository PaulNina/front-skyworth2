import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, User, Trophy, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// Type declarations for tracking pixels
declare global {
  interface Window {
    fbq?: (action: string, event: string, params?: Record<string, unknown>) => void;
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
    };
  }
}

interface LocationState {
  formData?: {
    fullName: string;
    phone: string;
    email: string;
  };
  coupons?: string[];
  registrationResult?: {
    estado?: string;
    cantidadCupones?: number;
  };
}

export default function RegistroExitoso() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  useEffect(() => {
    // Si no hay datos, redirigir al registro
    if (!state?.formData) {
      navigate('/registro');
      return;
    }

    // Track PageView for Meta & TikTok Pixels
    if (typeof window !== 'undefined') {
      // Meta Pixel - PageView
      if (window.fbq) {
        window.fbq('track', 'PageView');
        // También enviar evento de compra completada
        window.fbq('track', 'Purchase', {
          content_name: 'Registro de Compra Exitoso',
          content_category: 'Registration Success',
          value: state.coupons?.length || 0,
          currency: 'BOB',
          num_coupons: state.coupons?.length || 0
        });
      }

      // TikTok Pixel - PageView
      if (window.ttq) {
        window.ttq.track('PageView');
        // También enviar evento de compra completada
        window.ttq.track('PlaceAnOrder', {
          content_name: 'Registro de Compra Exitoso',
          content_type: 'Registration Success',
          value: state.coupons?.length || 0,
          currency: 'BOB'
        });
      }
    }
  }, [state, navigate]);

  // Si no hay datos, no renderizar nada (se redirigirá)
  if (!state?.formData) {
    return null;
  }

  const { formData, coupons = [] } = state;

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: `url(/fondo_web2.webp)` }}
      />
      
      {/* Overlay */}
      <div className="fixed inset-0 z-0 bg-black/40 bg-blend-overlay pointer-events-none" />

      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-3xl"
        >
          {/* Success Card */}
          <div className="bg-gradient-to-br from-[#0a1e3d]/95 to-[#1a2f4a]/95 backdrop-blur-xl rounded-3xl border border-skyworth-green/30 shadow-2xl overflow-hidden">
            {/* Header with Icon */}
            <div className="bg-gradient-to-r from-skyworth-green/20 to-green-600/20 p-8 text-center border-b border-skyworth-green/20">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-block"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-skyworth-green to-green-500 rounded-full flex items-center justify-center shadow-lg mx-auto mb-4 ring-4 ring-skyworth-green/30">
                  <CheckCircle className="h-14 w-14 text-white" />
                </div>
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-5xl font-black text-white mb-2"
              >
                ¡GOOOL! 🎉
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-gray-200"
              >
                Tu compra ha sido registrada exitosamente
              </motion.p>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* User Data */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-[#1a2f4a]/80 to-[#0a1e3d]/80 rounded-2xl p-6 border border-white/10 backdrop-blur-sm"
              >
                <p className="font-bold text-white mb-5 text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-skyworth-green" />
                  Tus datos registrados
                </p>
                
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-start gap-3 group"
                  >
                    <User className="w-5 h-5 text-skyworth-green flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Nombre</p>
                      <p className="text-white font-medium text-lg">{formData.fullName}</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-start gap-3 group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-skyworth-green flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Teléfono</p>
                      <p className="text-white font-medium text-lg">{formData.phone}</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex items-start gap-3 group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-skyworth-green flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Correo electrónico</p>
                      <p className="text-white font-medium text-lg break-all">{formData.email}</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Coupons */}
              {coupons.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="bg-gradient-to-br from-amber-900/30 to-yellow-900/30 rounded-2xl p-6 border border-amber-500/30 backdrop-blur-sm"
                >
                  <p className="font-bold text-amber-400 mb-5 text-lg flex items-center gap-2">
                    <Trophy className="w-6 h-6" />
                    Tus cupones para el sorteo
                  </p>
                  
                  <div className="flex flex-wrap gap-3 justify-center">
                    {coupons.map((coupon, index) => (
                      <motion.span
                        key={coupon}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1 + index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-6 py-3 rounded-full font-mono font-bold text-base shadow-lg hover:shadow-xl transition-all cursor-default ring-2 ring-amber-300/50"
                      >
                        {coupon}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="grid md:grid-cols-2 gap-4 pt-4"
              >
                <Button
                  onClick={() => {
                    navigate('/registro');
                    window.scrollTo(0, 0);
                  }}
                  className="w-full bg-gradient-to-r from-skyworth-green to-green-600 hover:from-green-600 hover:to-skyworth-green text-white h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  <RefreshCw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                  Registrar Nueva Compra
                </Button>
                
                <Button
                  onClick={() => {
                    navigate('/');
                    window.scrollTo(0, 0);
                  }}
                  variant="outline"
                  className="w-full h-14 text-lg font-bold border-2 border-skyworth-green text-skyworth-green hover:bg-skyworth-green hover:text-white transition-all duration-300 group bg-transparent"
                >
                  <Home className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Volver al Inicio
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
