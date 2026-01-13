import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Award, Calendar, Users, Gift, Crown } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DrawResult {
  id: string;
  draw_date: string;
  status: string;
  total_participants: number;
  total_tickets: number; // This now represents coupons count
  preselected_count: number;
  finalists_count: number;
}

interface Winner {
  id: string;
  owner_name: string;
  owner_email: string;
  winner_type: string;
  position: number | null;
  prize_description: string | null;
  ticket_id: string; // Coupon ID reference
}

export default function Resultados() {
  // Fetch executed draws
  const { data: draws, isLoading: loadingDraws } = useQuery({
    queryKey: ['public-draw-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('draw_results')
        .select('*')
        .eq('status', 'EXECUTED')
        .order('draw_date', { ascending: false });
      if (error) throw error;
      return data as DrawResult[];
    }
  });

  // Fetch winners for the latest draw
  const latestDraw = draws?.[0];
  
  const { data: winners, isLoading: loadingWinners } = useQuery({
    queryKey: ['public-draw-winners', latestDraw?.id],
    queryFn: async () => {
      if (!latestDraw) return [];
      const { data, error } = await supabase
        .from('draw_winners')
        .select(`
          id,
          owner_name,
          owner_email,
          winner_type,
          position,
          prize_description,
          ticket_id
        `)
        .eq('draw_id', latestDraw.id)
        .order('winner_type', { ascending: true })
        .order('position', { ascending: true });
      if (error) throw error;
      return data as Winner[];
    },
    enabled: !!latestDraw
  });

  // Fetch coupon codes for winners
  const { data: couponCodes } = useQuery({
    queryKey: ['winner-coupon-codes', winners?.map(w => w.ticket_id)],
    queryFn: async () => {
      if (!winners || winners.length === 0) return {};
      const ticketIds = winners.map(w => w.ticket_id).filter(Boolean);
      
      // Try to get from coupons table first (new system)
      const { data: coupons } = await supabase
        .from('coupons')
        .select('id, code')
        .in('id', ticketIds);

      const codeMap: Record<string, string> = {};
      coupons?.forEach(c => {
        codeMap[c.id] = c.code;
      });

      // Fallback to ticket_pool if coupons not found (legacy data)
      const missingIds = ticketIds.filter(id => !codeMap[id]);
      if (missingIds.length > 0) {
        const { data: tickets } = await supabase
          .from('ticket_pool')
          .select('id, ticket_code')
          .in('id', missingIds);
        
        tickets?.forEach(t => {
          codeMap[t.id] = t.ticket_code;
        });
      }

      return codeMap;
    },
    enabled: !!winners && winners.length > 0
  });

  const finalists = winners?.filter(w => w.winner_type === 'FINALIST') || [];
  const preselected = winners?.filter(w => w.winner_type === 'PRESELECTED') || [];

  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***.***';
    const maskedLocal = local.slice(0, 2) + '***' + (local.length > 4 ? local.slice(-1) : '');
    return `${maskedLocal}@${domain}`;
  };

  const getPositionIcon = (position: number | null) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-300" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <Award className="h-5 w-5 text-skyworth-gold" />;
    }
  };

  const getCouponCode = (ticketId: string) => {
    return couponCodes?.[ticketId] || ticketId.slice(0, 8).toUpperCase();
  };

  if (loadingDraws) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex flex-col">
        <Header />
        <main className="flex-1 pt-24 pb-12">
          <div className="container mx-auto px-4">
            <div className="space-y-6">
              <Skeleton className="h-12 w-64 mx-auto" />
              <div className="grid gap-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!draws || draws.length === 0) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-24 pb-12">
          <div className="text-center max-w-md px-4">
            <Trophy className="h-20 w-20 text-skyworth-gold mx-auto mb-6 opacity-50" />
            <h1 className="text-3xl font-bold text-white mb-4">
              Sorteo Pendiente
            </h1>
            <p className="text-gray-400 text-lg">
              Aún no se ha realizado el sorteo. ¡Mantente atento a los resultados!
            </p>
            <p className="text-skyworth-gold mt-4 font-medium">
              Fecha del sorteo: 15 de Julio de 2026
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-skyworth-dark flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-skyworth-gold to-yellow-600 rounded-full mb-6">
              <Trophy className="h-10 w-10 text-skyworth-dark" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Resultados del <span className="text-skyworth-gold">Sorteo</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              ¡Felicitaciones a todos los ganadores de la campaña "Gana el Mundial con Skyworth 2026"!
            </p>
          </motion.div>

          {/* Draw Info */}
          {latestDraw && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-12"
            >
              <Card className="bg-white/5 border-skyworth-gold/30 backdrop-blur-sm">
                <CardContent className="py-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div>
                      <Calendar className="h-6 w-6 text-skyworth-gold mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Fecha del Sorteo</p>
                      <p className="text-white font-semibold">
                        {format(new Date(latestDraw.draw_date), "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <div>
                      <Users className="h-6 w-6 text-skyworth-gold mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Participantes</p>
                      <p className="text-white font-semibold text-2xl">{latestDraw.total_participants}</p>
                    </div>
                    <div>
                      <Gift className="h-6 w-6 text-skyworth-gold mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Cupones en Juego</p>
                      <p className="text-white font-semibold text-2xl">{latestDraw.total_tickets}</p>
                    </div>
                    <div>
                      <Trophy className="h-6 w-6 text-skyworth-gold mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Ganadores</p>
                      <p className="text-white font-semibold text-2xl">{latestDraw.finalists_count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Finalists - Main Winners */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Crown className="h-7 w-7 text-skyworth-gold" />
              Ganadores Finalistas
              <Badge className="bg-skyworth-gold text-skyworth-dark">¡VIAJE AL MUNDIAL!</Badge>
            </h2>
            
            {loadingWinners ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : finalists.length > 0 ? (
              <div className="space-y-4">
                {finalists.map((winner, idx) => (
                  <motion.div
                    key={winner.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                  >
                    <Card className={`bg-gradient-to-r ${
                      winner.position === 1 
                        ? 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/50' 
                        : winner.position === 2
                          ? 'from-gray-300/20 to-gray-400/10 border-gray-400/50'
                          : winner.position === 3
                            ? 'from-amber-600/20 to-amber-700/10 border-amber-600/50'
                            : 'from-skyworth-gold/10 to-transparent border-skyworth-gold/30'
                    }`}>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                            winner.position === 1 
                              ? 'bg-yellow-500/30' 
                              : winner.position === 2
                                ? 'bg-gray-400/30'
                                : winner.position === 3
                                  ? 'bg-amber-600/30'
                                  : 'bg-skyworth-gold/20'
                          }`}>
                            {getPositionIcon(winner.position)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl font-bold text-white">#{winner.position}</span>
                              <h3 className="text-xl font-semibold text-white">{winner.owner_name}</h3>
                            </div>
                            <p className="text-gray-400 text-sm">{maskEmail(winner.owner_email)}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-skyworth-gold border-skyworth-gold">
                              {getCouponCode(winner.ticket_id)}
                            </Badge>
                            {winner.prize_description && (
                              <p className="text-skyworth-gold text-sm mt-1 font-medium">
                                {winner.prize_description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No hay ganadores registrados aún.</p>
            )}
          </motion.div>

          {/* Preselected */}
          {preselected.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Medal className="h-6 w-6 text-blue-400" />
                Preseleccionados
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  {preselected.length} participantes
                </Badge>
              </h2>
              
              <Card className="bg-white/5 border-white/10">
                <CardContent className="py-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {preselected.map((winner, idx) => (
                      <motion.div
                        key={winner.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + idx * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Award className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{winner.owner_name}</p>
                          <p className="text-gray-500 text-xs truncate">{maskEmail(winner.owner_email)}</p>
                        </div>
                        <Badge variant="outline" className="text-gray-400 border-gray-600 text-xs">
                          {getCouponCode(winner.ticket_id)}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 text-center"
          >
            <p className="text-gray-400 mb-4">
              ¿Tienes preguntas sobre los resultados?
            </p>
            <a 
              href="mailto:soporte@skyworth.bo" 
              className="text-skyworth-gold hover:underline font-medium"
            >
              Contáctanos en soporte@skyworth.bo
            </a>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}