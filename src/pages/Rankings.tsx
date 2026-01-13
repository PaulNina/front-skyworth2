import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, Award, Store, MapPin, TrendingUp } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface SellerRanking {
  id: string;
  full_name: string;
  store_name: string;
  store_city: string;
  total_points: number;
  total_sales: number;
  ranking_position: number;
}

interface CityRanking {
  id: string;
  full_name: string;
  store_name: string;
  store_city: string;
  total_points: number;
  total_sales: number;
  city_ranking: number;
}

export default function Rankings() {
  const [selectedCity, setSelectedCity] = useState<string>('all');

  const { data: generalRanking, isLoading: loadingGeneral } = useQuery({
    queryKey: ['seller-ranking'],
    queryFn: async (): Promise<SellerRanking[]> => {
      const { data, error } = await supabase
        .from('v_seller_ranking')
        .select('*')
        .limit(50);

      if (error) throw error;
      return (data as SellerRanking[]) || [];
    },
  });

  const { data: cityRanking, isLoading: loadingCity } = useQuery({
    queryKey: ['seller-ranking-by-city'],
    queryFn: async (): Promise<CityRanking[]> => {
      const { data, error } = await supabase
        .from('v_seller_ranking_by_city')
        .select('*');

      if (error) throw error;
      return (data as CityRanking[]) || [];
    },
  });

  const cities = [...new Set(cityRanking?.map(r => r.store_city) || [])];
  
  const filteredCityRanking = selectedCity === 'all' 
    ? cityRanking 
    : cityRanking?.filter(r => r.store_city === selectedCity);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-300" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-400">#{position}</span>;
    }
  };

  const getRankBadge = (position: number) => {
    if (position === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    if (position === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400';
    if (position === 3) return 'bg-gradient-to-r from-amber-500 to-amber-700';
    return 'bg-skyworth-dark/50';
  };

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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <span className="text-skyworth-gold">RANKING</span> DE VENDEDORES
            </h1>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Los mejores vendedores de TVs Skyworth compiten por increíbles premios
            </p>
          </motion.div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-white/10">
              <TabsTrigger value="general" className="data-[state=active]:bg-skyworth-gold data-[state=active]:text-skyworth-dark">
                <TrendingUp className="h-4 w-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="city" className="data-[state=active]:bg-skyworth-gold data-[state=active]:text-skyworth-dark">
                <MapPin className="h-4 w-4 mr-2" />
                Por Ciudad
              </TabsTrigger>
            </TabsList>

            {/* General Ranking */}
            <TabsContent value="general">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {/* Top 3 Podium */}
                {generalRanking && generalRanking.length >= 3 && (
                  <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
                    {/* 2nd Place */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mt-8"
                    >
                      <Card className="bg-gradient-to-b from-gray-400/20 to-gray-600/20 border-gray-400/30 text-center">
                        <CardContent className="pt-6">
                          <Medal className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <h3 className="font-bold text-white truncate">{generalRanking[1]?.full_name}</h3>
                          <p className="text-sm text-gray-300 truncate">{generalRanking[1]?.store_name}</p>
                          <Badge className="mt-2 bg-gray-400 text-gray-900">
                            {generalRanking[1]?.total_points} pts
                          </Badge>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* 1st Place */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Card className="bg-gradient-to-b from-yellow-400/30 to-yellow-600/20 border-yellow-400/50 text-center transform scale-105">
                        <CardContent className="pt-6">
                          <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-3" />
                          <h3 className="font-bold text-white text-lg truncate">{generalRanking[0]?.full_name}</h3>
                          <p className="text-sm text-gray-300 truncate">{generalRanking[0]?.store_name}</p>
                          <Badge className="mt-2 bg-yellow-400 text-gray-900 text-lg px-4">
                            {generalRanking[0]?.total_points} pts
                          </Badge>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* 3rd Place */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-12"
                    >
                      <Card className="bg-gradient-to-b from-amber-500/20 to-amber-700/20 border-amber-600/30 text-center">
                        <CardContent className="pt-6">
                          <Award className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                          <h3 className="font-bold text-white truncate">{generalRanking[2]?.full_name}</h3>
                          <p className="text-sm text-gray-300 truncate">{generalRanking[2]?.store_name}</p>
                          <Badge className="mt-2 bg-amber-600 text-white">
                            {generalRanking[2]?.total_points} pts
                          </Badge>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>
                )}

                {/* Full List */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-skyworth-gold" />
                      Ranking Completo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingGeneral ? (
                      <div className="text-center py-8 text-gray-400">Cargando ranking...</div>
                    ) : generalRanking?.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        Aún no hay vendedores registrados
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {generalRanking?.map((seller, idx) => (
                          <motion.div
                            key={seller.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`flex items-center gap-4 p-4 rounded-lg ${getRankBadge(seller.ranking_position)} ${seller.ranking_position <= 3 ? 'text-white' : 'bg-white/5'}`}
                          >
                            <div className="w-10 flex justify-center">
                              {getRankIcon(seller.ranking_position)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-white truncate">{seller.full_name}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-300">
                                <Store className="h-3 w-3" />
                                <span className="truncate">{seller.store_name}</span>
                                <span className="text-gray-500">•</span>
                                <MapPin className="h-3 w-3" />
                                <span>{seller.store_city}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-skyworth-gold">{seller.total_points}</div>
                              <div className="text-xs text-gray-400">{seller.total_sales} ventas</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* City Ranking */}
            <TabsContent value="city">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="max-w-xs mx-auto mb-8">
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Filtrar por ciudad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las ciudades</SelectItem>
                      {cities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-skyworth-gold" />
                      Ranking por Ciudad
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingCity ? (
                      <div className="text-center py-8 text-gray-400">Cargando ranking...</div>
                    ) : filteredCityRanking?.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        No hay vendedores en esta ciudad
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredCityRanking?.map((seller, idx) => (
                          <motion.div
                            key={seller.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center gap-4 p-4 rounded-lg bg-white/5"
                          >
                            <div className="w-10 flex justify-center">
                              {getRankIcon(seller.city_ranking)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-white truncate">{seller.full_name}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-300">
                                <Store className="h-3 w-3" />
                                <span className="truncate">{seller.store_name}</span>
                              </div>
                            </div>
                            <Badge className="bg-skyworth-dark text-skyworth-gold">
                              {seller.store_city}
                            </Badge>
                            <div className="text-right">
                              <div className="text-lg font-bold text-skyworth-gold">{seller.total_points}</div>
                              <div className="text-xs text-gray-400">{seller.total_sales} ventas</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
