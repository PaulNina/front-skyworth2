import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { apiService } from '@/services/apiService';
import { API_ENDPOINTS } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Users, Gift, Ticket, User, Phone, Tv, Award } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface Preseleccionado {
  id: number;
  codigo: string;
  nombreComprador: string;
  ciComprador: string;
  emailComprador: string;
  telefonoComprador: string;
  modeloTv: string;
  serialTv: string;
  posicion: number;
}

interface TombolaStats {
  totalCupones: number;
  cuponesActivos: number;
  cuponesPreseleccionados: number;
  cuponesGanadores: number;
}

export default function Resultados() {
  // Fetch preseleccionados from backend
  const { data: preseleccionados, isLoading } = useQuery({
    queryKey: ['sorteos-preseleccionados'],
    queryFn: async (): Promise<Preseleccionado[]> => {
      const response = await apiService.get<Preseleccionado[]>(API_ENDPOINTS.TOMBOLA.PRESELECCIONADOS);
      if (response.error) {
        // Return empty array if no preseleccionados yet
        return [];
      }
      return response.data || [];
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['tombola-stats-public'],
    queryFn: async (): Promise<TombolaStats> => {
      const response = await apiService.get<TombolaStats>(API_ENDPOINTS.TOMBOLA.ESTADISTICAS);
      if (response.error) {
        return { totalCupones: 0, cuponesActivos: 0, cuponesPreseleccionados: 0, cuponesGanadores: 0 };
      }
      return response.data || { totalCupones: 0, cuponesActivos: 0, cuponesPreseleccionados: 0, cuponesGanadores: 0 };
    },
  });

  const maskName = (name: string) => {
    if (!name) return '***';
    const parts = name.split(' ');
    return parts.map(part => {
      if (part.length <= 2) return part;
      return part[0] + '*'.repeat(part.length - 2) + part[part.length - 1];
    }).join(' ');
  };

  const maskCI = (ci: string) => {
    if (!ci) return '****';
    if (ci.length <= 4) return '****';
    return ci.slice(0, 2) + '*'.repeat(ci.length - 4) + ci.slice(-2);
  };

  // Background image logic
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col font-sans relative">
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="fixed inset-0 z-0 bg-black/30 bg-blend-overlay pointer-events-none" />
        
        <Header />
        <main className="flex-1 pt-24 pb-12 relative z-10">
          <div className="container mx-auto px-4">
            <Skeleton className="h-12 w-64 mx-auto mb-8" />
            <div className="grid gap-4 max-w-4xl mx-auto">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </main>
        <div className="relative z-10">
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      
      {/* Overlay */}
      <div className="fixed inset-0 z-0 bg-black/30 bg-blend-overlay pointer-events-none" />

      <Header />

      <main className="flex-1 pt-24 pb-12 relative z-10">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4 shadow-lg">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              Resultados del <span className="text-yellow-400">Sorteo</span>
            </h1>
            <p className="text-blue-200 text-lg">El Sueño del Hincha - Skyworth 2026</p>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <Ticket className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats?.totalCupones || 0}</p>
                <p className="text-xs text-blue-200">Total Cupones</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats?.cuponesActivos || 0}</p>
                <p className="text-xs text-blue-200">Participantes</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <Award className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats?.cuponesPreseleccionados || 0}</p>
                <p className="text-xs text-blue-200">Preseleccionados</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <Trophy className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats?.cuponesGanadores || 0}</p>
                <p className="text-xs text-blue-200">Ganadores</p>
              </CardContent>
            </Card>
          </div>

          {/* Preseleccionados List */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-black/50 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Gift className="h-6 w-6 text-yellow-400" />
                  Los 20 Preseleccionados
                  {preseleccionados && preseleccionados.length > 0 && (
                    <Badge className="ml-auto bg-yellow-400/20 text-yellow-400">
                      {preseleccionados.length} participantes
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {preseleccionados && preseleccionados.length > 0 ? (
                  <div className="grid gap-3">
                    {preseleccionados.map((preseleccionado, idx) => (
                      <motion.div
                        key={preseleccionado.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-4 border border-white/10 hover:border-yellow-400/50 transition-all"
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          {/* Position */}
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                              preseleccionado.posicion <= 3 
                                ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' 
                                : 'bg-white/20 text-white'
                            }`}>
                              {preseleccionado.posicion}
                            </div>
                            <div>
                              <p className="text-white font-semibold flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-400" />
                                {maskName(preseleccionado.nombreComprador || 'Participante')}
                              </p>
                              <p className="text-blue-200 text-sm">
                                CI: {maskCI(preseleccionado.ciComprador)}
                              </p>
                            </div>
                          </div>

                          {/* Coupon Code */}
                          <div className="md:ml-auto flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Tv className="h-4 w-4 text-cyan-400" />
                              <span className="text-white/80 text-sm">{preseleccionado.modeloTv || 'TV Skyworth'}</span>
                            </div>
                            <Badge className="bg-yellow-400/20 text-yellow-400 font-mono">
                              <Ticket className="h-3 w-3 mr-1" />
                              {preseleccionado.codigo}
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Gift className="h-16 w-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 text-lg">Aún no hay preseleccionados</p>
                    <p className="text-blue-200/60 text-sm mt-2">
                      Los resultados se publicarán aquí después del sorteo
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Information Card */}
            <Card className="bg-black/50 border-blue-400/30 mt-6">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Trophy className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">¿Cómo funciona?</h3>
                    <ul className="text-blue-200 text-sm space-y-1">
                      <li>• Por cada compra de un TV Skyworth, se generan cupones electrónicos</li>
                      <li>• En el sorteo se seleccionan 20 preseleccionados al azar</li>
                      <li>• Los preseleccionados tienen la oportunidad de ganar increíbles premios</li>
                      <li>• Los datos personales están parcialmente ocultos por privacidad</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}