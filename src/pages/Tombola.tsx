import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '@/services/apiService';
import { API_ENDPOINTS } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Ticket, Users, Loader2, RotateCcw, Award, User, Phone, Mail, Tv, Eye, Download, FileText, X, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { API_BASE_URL } from '@/config/api';
import { ScrollArea } from "@/components/ui/scroll-area";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface TombolaStats {
  totalCupones: number;
  cuponesActivos: number;
  cuponesPreseleccionados: number;
  cuponesGanadores: number;
}

interface CuponPreseleccionado {
  id: number;
  codigo: string;
  nombreComprador: string;
  ciComprador: string;
  emailComprador: string;
  telefonoComprador: string;
  modeloTv: string;
  serialTv: string;
  posicion: number;
  // New fields for detail view
  registroId?: number;
  tagPolizaPath?: string;
  polizaGarantiaPath?: string;
  notaVentaPath?: string;
  validadoGemini?: boolean;
  observacionesGemini?: string;
}

interface SorteoResponse {
  totalCupones: number;
  cantidadPreseleccionados: number;
  preseleccionados: CuponPreseleccionado[];
  fechaSorteo: string;
  mensaje: string;
}

export default function Tombola() {
  const queryClient = useQueryClient();
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayedCoupons, setDisplayedCoupons] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCoupon, setSelectedCoupon] = useState<CuponPreseleccionado | null>(null);
  const [detailCoupon, setDetailCoupon] = useState<CuponPreseleccionado | null>(null); // For the modal
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [sorteoResults, setSorteoResults] = useState<CuponPreseleccionado[]>([]);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch statistics
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['tombola-stats'],
    queryFn: async (): Promise<TombolaStats> => {
      const response = await apiService.get<TombolaStats>(API_ENDPOINTS.TOMBOLA.ESTADISTICAS);
      if (response.error) throw new Error(response.mensaje);
      return response.data || { totalCupones: 0, cuponesActivos: 0, cuponesPreseleccionados: 0, cuponesGanadores: 0 };
    },
  });

  // Fetch all coupons for animation
  const { data: allCoupons } = useQuery({
    queryKey: ['tombola-cupones'],
    queryFn: async (): Promise<string[]> => {
      const response = await apiService.get<string[]>(API_ENDPOINTS.TOMBOLA.CUPONES);
      if (response.error) throw new Error(response.mensaje);
      return response.data || [];
    },
  });

  // Fetch existing preseleccionados
  const { data: preseleccionados } = useQuery({
    queryKey: ['tombola-preseleccionados'],
    queryFn: async (): Promise<CuponPreseleccionado[]> => {
      const response = await apiService.get<CuponPreseleccionado[]>(API_ENDPOINTS.TOMBOLA.PRESELECCIONADOS);
      if (response.error) throw new Error(response.mensaje);
      return response.data || [];
    },
  });

  // Mutation for sorteo
  const sortearMutation = useMutation({
    mutationFn: async (): Promise<SorteoResponse> => {
      const response = await apiService.post<SorteoResponse>(`${API_ENDPOINTS.TOMBOLA.SORTEAR}?cantidad=1`, {});
      if (response.error) throw new Error(response.mensaje);
      return response.data!;
    },
    onSuccess: (data) => {
      // Add new winners to the list
      setSorteoResults(prev => [...data.preseleccionados, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['tombola-stats'] });
      // We don't invalidate preseleccionados immediately to avoid UI jump, we manage local state
    },
  });

  // Initialize displayed coupons
  useEffect(() => {
    if (allCoupons && allCoupons.length > 0 && displayedCoupons.length === 0) {
      // Show 5 coupons at a time
      const shuffled = [...allCoupons].sort(() => Math.random() - 0.5);
      setDisplayedCoupons(shuffled.slice(0, Math.min(5, shuffled.length)));
    }
  }, [allCoupons, displayedCoupons.length]);

  // Load initial preselected into local state
  useEffect(() => {
    if (preseleccionados) {
       // Only set if we haven't started drawing yet (empty local state) or just initial load
       setSorteoResults(preseleccionados); 
    }
  }, [preseleccionados]);


  // Spinning animation
  useEffect(() => {
    if (isSpinning && allCoupons && allCoupons.length > 0) {
      spinIntervalRef.current = setInterval(() => {
        // Just random shuffle visual effect
        const shuffled = [...allCoupons].sort(() => Math.random() - 0.5);
        setDisplayedCoupons(shuffled.slice(0, Math.min(5, shuffled.length)));
      }, 50); // Faster spin
    } else {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    }
    return () => {
        if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, [isSpinning, allCoupons]);

  const handleGirar = async () => {
    if (!allCoupons || allCoupons.length === 0) return;

    setIsSpinning(true);
    setSelectedCoupon(null);

    // Minimum spin time 2 seconds
    const minSpinTime = new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
        // Start API call in parallel with spin
        const [result] = await Promise.all([
            sortearMutation.mutateAsync(),
            minSpinTime
        ]);

        // Stop spinning
        setIsSpinning(false);
        
        // Force display the winner in the middle (index 2)
        if (result.preseleccionados.length > 0) {
            const winnerCode = result.preseleccionados[0].codigo;
            // Create a display array where index 2 is the winner
            // We take 2 random ones before and 2 after
            const others = allCoupons.filter(c => c !== winnerCode);
            const shuffledOthers = others.sort(() => Math.random() - 0.5);
            
            const finalDisplay = [
                shuffledOthers[0] || '---',
                shuffledOthers[1] || '---',
                winnerCode,
                shuffledOthers[2] || '---',
                shuffledOthers[3] || '---'
            ];
            
            setDisplayedCoupons(finalDisplay);
            setSelectedCoupon(result.preseleccionados[0]);
        }

    } catch (error) {
        console.error('Error en sorteo:', error);
        setIsSpinning(false);
        toast.error("Error al realizar el sorteo");
    }
  };

  const handleReset = () => {
    // Resetting doesn't clear the table, just ready for next spin?
    // User probably wants to clear selection highlight
    setSelectedCoupon(null);
  };

  // Background Logic
  const [bgImage, setBgImage] = useState("/fondo_web2.webp");
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setBgImage("/fondo_mobile_1080.webp");
      } else {
        setBgImage("/fondo_web2.webp");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loadingStats) {
    return (
      <div className="min-h-screen flex flex-col font-sans relative text-white">
        <div 
            className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
            style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="fixed inset-0 z-0 bg-black/40 bg-blend-overlay pointer-events-none" />
        <Header />
        <main className="flex-1 pt-32 pb-12 relative z-10 flex items-center justify-center">
             <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-skyworth-gold" />
                  <p className="text-xl font-bold uppercase tracking-widest">Cargando Tómbola...</p>
             </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-x-hidden text-white">
      {/* Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="fixed inset-0 z-0 bg-black/40 bg-blend-overlay pointer-events-none" />

      {/* Confetti Effect */}
      {sorteoResults.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full shadow-lg"
              style={{
                backgroundColor: ['#FFD700', '#00FF00', '#FFFFFF', '#FFA500'][i % 4],
                left: `${Math.random() * 100}%`,
              }}
              initial={{ y: -20, opacity: 1 }}
              animate={{ y: '100vh', opacity: 0, rotate: 720 }}
              transition={{ duration: 3 + Math.random() * 2, delay: Math.random() * 0.5, repeat: Infinity, repeatDelay: 2 }}
            />
          ))}
        </div>
      )}

      <Header />

      <main className="flex-1 pt-32 pb-12 relative z-10">
        <div className="container mx-auto px-4">
          
          {/* Header Section */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block"
            >
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl shadow-2xl mb-4 inline-flex items-center gap-4">
                    <img src="/favicon.png" alt="Skyworth" className="h-10 md:h-12 w-auto object-contain" />
                    <div className="h-10 w-px bg-white/30"></div>
                     <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight drop-shadow-lg">
                      Tómbola <span className="text-skyworth-gold">Virtual</span>
                    </h1>
                </div>
                <p className="text-white/80 text-lg md:text-xl font-medium tracking-wide uppercase">El Sueño del Hincha - Sorteo 2026</p>
            </motion.div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 max-w-5xl mx-auto">
             {[
                 { label: 'Total Cupones', value: stats?.totalCupones, icon: Ticket, color: 'text-skyworth-gold' },
                 { label: 'Cupones Activos', value: stats?.cuponesActivos, icon: Users, color: 'text-green-400' },
                 { label: 'Preseleccionados', value: stats?.cuponesPreseleccionados, icon: Award, color: 'text-orange-400' },
                 { label: 'Ganadores', value: stats?.cuponesGanadores, icon: Trophy, color: 'text-yellow-300' }
             ].map((stat, i) => (
                 <Card key={i} className="bg-black/40 border-white/10 backdrop-blur-sm text-center transform hover:scale-105 transition-transform duration-300">
                     <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                         <div className={`mb-2 p-2 rounded-full bg-white/5 ${stat.color}`}>
                             <stat.icon className="h-6 w-6" />
                         </div>
                         <span className="text-3xl font-black text-white">{stat.value || 0}</span>
                         <span className="text-xs uppercase text-white/60 font-bold mt-1">{stat.label}</span>
                     </CardContent>
                 </Card>
             ))}
          </div>

          <div className="flex flex-col items-center gap-2 max-w-7xl mx-auto">
            
            {/* Top Section: Tombola Machine */}
            <div className="w-full flex flex-col items-center">
                 <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-5xl relative flex flex-col items-center -mt-8"
                 >
                    {/* Visual Container - Made larger */}
                    <div className="relative w-full aspect-square max-w-[900px] flex items-center justify-center">
                        
                        {/* 1. LAYER BEHIND: Scrolling Numbers */}
                        {/* We position this relative to the container. Adjust top/width/height to fit the image window */}
                        {/* Based on screenshot: TV screen is on the right side */}
                        <div className="absolute top-[34%] left-[45%] w-[53%] h-[38%] overflow-hidden z-10 flex flex-col items-center justify-center bg-white rounded-lg border-2 border-gray-200">
                             {/* Gradient Overlay for depth - White based */}
                             <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-transparent to-white/90 z-20 pointer-events-none"></div>

                             {/* Golden Selection Border (Static Overlay) */}
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-14 border-y-4 border-skyworth-gold bg-skyworth-gold/10 z-10 shadow-sm"></div>
                             
                             {/* Golden Arrow Indicators */}
                             <div className="absolute top-1/2 left-2 -translate-y-1/2 z-20">
                                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-l-skyworth-gold"></div>
                             </div>
                             <div className="absolute top-1/2 right-2 -translate-y-1/2 z-20">
                                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-skyworth-gold"></div>
                             </div>

                             <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
                                <AnimatePresence mode="popLayout">
                                    {displayedCoupons.map((coupon, idx) => (
                                    <motion.div
                                        key={`${coupon}-${idx}-${isSpinning}`}
                                        initial={{ y: -50, opacity: 0 }}
                                        animate={{ 
                                            y: 0, 
                                            opacity: idx === 2 ? 1 : 0.5,
                                            scale: idx === 2 ? 1.2 : 0.9,
                                            filter: isSpinning ? 'blur(1px)' : 'none',
                                            color: idx === 2 ? '#000000' : '#444444',
                                            fontWeight: idx === 2 ? 900 : 600,
                                        }}
                                        exit={{ y: 50, opacity: 0 }}
                                        transition={{ duration: isSpinning ? 0.05 : 0.2 }}
                                        className={`font-mono text-lg md:text-3xl tracking-widest py-1 whitespace-nowrap ${idx === 2 ? 'z-30 relative' : 'z-0'}`}
                                    >
                                        {coupon}
                                    </motion.div>
                                    ))}
                                </AnimatePresence>
                             </div>
                        </div>

                        {/* 2. LAYER FRONT: Tombola Image Frame */}
                        {/* The image must have transparency in the center for the numbers to show through */}
                        <img 
                            src="/tombola.png" 
                            alt="Tómbola Skyworth" 
                            className="relative z-20 w-full h-auto object-contain drop-shadow-2xl pointer-events-none" 
                        />
                        
                        {/* Golden Arrow Indicator (Optional, if image doesn't have it) */}
                        {/* 
                        <div className="absolute top-[44%] left-[18%] z-30 transform -rotate-90">
                            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[15px] border-b-red-600 drop-shadow-md"></div>
                        </div>
                        */}
                    </div>

                    {/* Action Button - Moved up to overlap */}
                    <div className="-mt-60 z-30 relative">
                        {isSpinning || sortearMutation.isPending ? (
                            <Button disabled className="px-12 py-6 bg-gray-600 rounded-full text-xl font-bold uppercase tracking-wider relative overflow-hidden shadow-xl border-4 border-gray-500">
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                                <span className="relative z-10">Sorteando...</span>
                            </Button>
                        ) : (
                            <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleGirar}
                                disabled={!allCoupons?.length}
                                className="px-16 py-4 bg-gradient-to-b from-[#ffb700] to-[#ff8c00] rounded-full text-white text-2xl font-black uppercase tracking-widest shadow-[0_8px_0_#995400] active:shadow-none active:translate-y-[8px] transition-all border-4 border-[#ffd700] drop-shadow-2xl"
                            >
                                GIRAR
                            </motion.button>
                        )}
                    </div>

                 </motion.div>
            </div>

            {/* Bottom Section: Results & History */}
            <div className="w-full max-w-4xl space-y-6 mt-12">
                
                {/* Winner Spotlight Card */}
                <AnimatePresence>
                {selectedCoupon && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        <Card className="bg-gradient-to-r from-skyworth-gold/90 to-orange-500/90 border-none shadow-2xl relative overflow-hidden">
                           <div className="absolute -right-10 -top-10 text-white/20 rotate-12">
                               <Trophy size={200} />
                           </div>
                           <CardContent className="p-8 relative z-10 text-white">
                               <div className="flex flex-col md:flex-row items-center gap-6">
                                   <div className="bg-white/20 p-4 rounded-full backdrop-blur-md border border-white/30">
                                       <Award size={48} className="text-white drop-shadow-md" />
                                   </div>
                                   <div className="flex-1 text-center md:text-left">
                                       <h3 className="text-sm font-bold uppercase tracking-widest text-white/80 mb-1">¡Ganador Seleccionado!</h3>
                                       <p className="text-3xl md:text-4xl font-black uppercase mb-2 drop-shadow-md">{selectedCoupon.nombreComprador}</p>
                                       <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                            <Badge variant="secondary" className="bg-black/30 text-white border-none text-sm px-3 py-1">
                                                CI: {selectedCoupon.ciComprador}
                                            </Badge>
                                            <Badge variant="secondary" className="bg-black/30 text-white border-none text-sm px-3 py-1">
                                                Cupón: {selectedCoupon.codigo}
                                            </Badge>
                                             <Badge variant="secondary" className="bg-black/30 text-white border-none text-sm px-3 py-1 flex items-center gap-1">
                                                <Phone size={12} /> {selectedCoupon.telefonoComprador}
                                            </Badge>
                                       </div>
                                   </div>
                               </div>
                           </CardContent>
                        </Card>
                    </motion.div>
                )}
                </AnimatePresence>

                {/* Preselected List */}
                <Card className="bg-black/40 border-white/10 backdrop-blur-md">
                    <CardHeader className="bg-white/5 border-b border-white/5">
                        <CardTitle className="text-white flex items-center gap-2">
                             <Users className="h-5 w-5 text-skyworth-gold" />
                             Preseleccionados Anteriores
                             <span className="ml-auto text-sm font-normal text-white/50 bg-white/10 px-3 py-1 rounded-full">
                                 {sorteoResults.length} / 20
                             </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                         <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                             {sorteoResults.length > 0 ? (
                                <div className="divide-y divide-white/5">
                                    {sorteoResults.map((cupon, idx) => (
                                        <div 
                                            key={cupon.id}
                                            onClick={() => setSelectedCoupon(cupon)}
                                            className={`p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer ${selectedCoupon?.id === cupon.id ? 'bg-white/10 border-l-4 border-l-skyworth-gold' : ''}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="font-black text-skyworth-gold text-lg w-8">#{cupon.posicion}</div>
                                                <div>
                                                    <p className="font-bold text-white leading-tight">{cupon.nombreComprador}</p>
                                                    <p className="text-xs text-white/50">{cupon.codigo} • {cupon.ciComprador}</p>
                                                </div>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                                 <p className="text-xs text-white/40">{cupon.modeloTv}</p>
                                                 <p className="text-xs text-white/30">{cupon.serialTv}</p>
                                             </div>
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="ml-4 hover:bg-white/20 text-white/70 hover:text-white"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDetailCoupon(cupon);
                                                }}
                                              >
                                                  <Eye className="h-5 w-5" />
                                              </Button>
                                         </div>
                                    ))}
                                </div>
                             ) : (
                                 <div className="p-8 text-center text-white/30 flex flex-col items-center">
                                     <Ticket className="h-12 w-12 mb-2 opacity-20" />
                                     <p>No hay preseleccionados aún</p>
                                 </div>
                             )}
                         </div>
                    </CardContent>
                </Card>

            </div>
          </div>
        </div>
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!detailCoupon} onOpenChange={(open) => !open && setDetailCoupon(null)}>
        <DialogContent className="bg-[#0a1610] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto p-0 text-white block">
          <DialogHeader className="p-6 border-b border-white/10 sticky top-0 bg-[#0a1610] z-10">
            <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-skyworth-gold" />
                Detalle del Ganador
                </DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="p-6">
            {detailCoupon && (
                <div className="space-y-6">
                 {/* Header Info */}
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="bg-skyworth-gold/20 p-3 rounded-full">
                        <Award className="h-8 w-8 text-skyworth-gold" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{detailCoupon.nombreComprador}</h3>
                        <p className="text-white/60 text-sm">CI: {detailCoupon.ciComprador}</p>
                        <div className="flex gap-2 mt-2">
                             <Badge variant="outline" className="border-skyworth-gold text-skyworth-gold">
                                Cupón: {detailCoupon.codigo}
                             </Badge>
                             <Badge className="bg-white/10 hover:bg-white/20">
                                Posición #{detailCoupon.posicion}
                             </Badge>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <p className="text-white/40 text-xs uppercase font-bold mb-1">Email</p>
                        <p className="font-medium">{detailCoupon.emailComprador}</p>
                    </div>
                     <div>
                        <p className="text-white/40 text-xs uppercase font-bold mb-1">Teléfono</p>
                        <p className="font-medium">{detailCoupon.telefonoComprador}</p>
                    </div>
                     <div>
                        <p className="text-white/40 text-xs uppercase font-bold mb-1">Producto</p>
                        <p className="font-medium">{detailCoupon.modeloTv}</p>
                    </div>
                     <div>
                        <p className="text-white/40 text-xs uppercase font-bold mb-1">Serial</p>
                        <p className="font-medium text-skyworth-gold font-mono">{detailCoupon.serialTv}</p>
                    </div>
                </div>

                {/* Validation Status */}
                {(detailCoupon.validadoGemini !== undefined) && (
                    <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                        <p className="text-white/40 text-xs uppercase font-bold mb-2">Validación IA</p>
                         <div className="flex gap-2 items-center mb-2">
                            <Badge variant={detailCoupon.validadoGemini ? "default" : "destructive"} className={detailCoupon.validadoGemini ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : ""}>
                                {detailCoupon.validadoGemini ? "Válido" : "Inválido / No verificado"}
                            </Badge>
                        </div>
                        {detailCoupon.observacionesGemini && (
                             <p className="text-xs text-white/50 italic">
                                 "{detailCoupon.observacionesGemini}"
                             </p>
                        )}
                    </div>
                )}

                {/* Documents */}
                <div>
                   <p className="text-white/40 text-xs uppercase font-bold mb-4">Evidencia Adjunta</p>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                          { label: 'Tag Póliza', path: detailCoupon.tagPolizaPath, type: 'tag_poliza' },
                          { label: 'Póliza Garantía', path: detailCoupon.polizaGarantiaPath, type: 'poliza_garantia' },
                          { label: 'Nota Venta', path: detailCoupon.notaVentaPath, type: 'nota_venta' }
                      ].map((doc, idx) => (
                          <div key={idx} className="border border-white/10 rounded-lg p-3 bg-white/5 flex flex-col items-center gap-3">
                              <span className="text-xs font-medium text-white/70">{doc.label}</span>
                              {doc.path && detailCoupon.registroId ? (
                                  <>
                                      <div className="relative w-full aspect-video bg-black/40 rounded overflow-hidden group cursor-pointer border border-white/5"
                                           onClick={() => setZoomedImage(`${API_BASE_URL}/api/registro/${detailCoupon.registroId}/imagen/${doc.type}`)}
                                      >
                                          <img 
                                              src={`${API_BASE_URL}/api/registro/${detailCoupon.registroId}/imagen/${doc.type}`} 
                                              alt={doc.label}
                                              className="w-full h-full object-cover transition-transform group-hover:scale-105 opacity-80 group-hover:opacity-100"
                                              onError={(e) => {
                                                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x300/1a1a1a/ffffff?text=No+Image';
                                              }}
                                          />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                              <Eye className="w-6 h-6 text-white" />
                                          </div>
                                      </div>
                                      <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="w-full text-xs border-white/10 hover:bg-white/10 text-white"
                                          onClick={() => setZoomedImage(`${API_BASE_URL}/api/registro/${detailCoupon.registroId}/imagen/${doc.type}`)}
                                      >
                                          <Eye className="w-3 h-3 mr-2" />
                                          Ver Imagen
                                      </Button>
                                  </>
                              ) : (
                                  <div className="w-full aspect-video bg-white/5 rounded flex flex-col items-center justify-center text-white/30 gap-2 border border-white/5 border-dashed">
                                      <FileText className="w-8 h-8 opacity-20" />
                                      <span className="text-xs">No disponible</span>
                                  </div>
                              )}
                          </div>
                      ))}
                   </div>
                </div>
                </div>
            )}
          </div>

          <div className="p-6 border-t border-white/10 flex justify-center sticky bottom-0 bg-[#0a1610] z-10">
              <Button onClick={() => setDetailCoupon(null)} className="bg-red-600 hover:bg-red-700 text-white px-8 font-bold tracking-wide shadow-lg shadow-red-900/20">
                  Cerrar
              </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Zoomed Image Lightbox */}
      <Dialog 
        open={!!zoomedImage} 
        onOpenChange={(open) => {
            if (!open) {
                setZoomedImage(null);
                setIsZoomed(false);
            }
        }}
      >
        <DialogContent 
            className="max-w-[100vw] max-h-[100vh] h-screen w-screen bg-transparent border-none shadow-none p-0 flex items-center justify-center [&>button]:hidden outline-none"
            onClick={() => setZoomedImage(null)}
        >
            <button 
                className="fixed top-6 right-6 z-[60] bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all hover:scale-105"
                onClick={(e) => {
                    e.stopPropagation();
                    setZoomedImage(null);
                }}
            >
                <XCircle className="h-10 w-10" />
            </button>
            {zoomedImage && (
                <img 
                    src={zoomedImage} 
                    alt="Zoomed document" 
                    className={`
                        object-contain rounded-md shadow-2xl transition-all duration-300 ease-in-out
                        ${isZoomed 
                            ? "cursor-zoom-out scale-[1.8] translate-y-0" 
                            : "cursor-zoom-in max-w-[90vw] max-h-[90vh] w-auto h-auto"
                        }
                    `}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsZoomed(!isZoomed);
                    }}
                />
            )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
