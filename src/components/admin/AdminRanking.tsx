import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { apiService } from '@/services/apiService';
import { API_ENDPOINTS } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, Award, Store, MapPin, TrendingUp, Loader2, Crown } from 'lucide-react';

interface VendedorRanking {
  nombreVendedor: string;
  tienda: string;
  ciudad: string;
  departamento: string;
  cantidadVentas: number;
  posicion?: number;
  displayPosition?: number;
}

interface TopCiudadesResponse {
  topLaPaz: VendedorRanking[];
  topCochabamba: VendedorRanking[];
  topSantaCruz: VendedorRanking[];
  topGeneral: { posicion: number; ciudad: string; nombre: string; tienda: string; ventas: number }[];
  totalVendedores: number;
}

export default function AdminRanking() {
  const [selectedDept, setSelectedDept] = useState<string>('all');

  // Fetch general ranking
  const { data: rankingData, isLoading } = useQuery({
    queryKey: ['admin-vendedores-ranking'],
    queryFn: async (): Promise<VendedorRanking[]> => {
      const response = await apiService.get<VendedorRanking[]>(API_ENDPOINTS.RANKING.TODOS);
      if (response.error) {
        return [];
      }
      // Add position to each vendor
      return (response.data || []).map((v, idx) => ({ ...v, posicion: idx + 1 }));
    },
  });

  // Fetch top cities ranking
  const { data: topCiudades, isLoading: isLoadingTop } = useQuery({
    queryKey: ['admin-vendedores-top-ciudades'],
    queryFn: async (): Promise<TopCiudadesResponse | null> => {
      const response = await apiService.get<TopCiudadesResponse>(API_ENDPOINTS.RANKING.TOP_CIUDADES);
      if (response.error) {
        return null;
      }
      return response.data;
    },
  });

  const departamentos = [...new Set(rankingData?.map(r => r.departamento).filter(Boolean) || [])];
  
  const filteredRanking = selectedDept === 'all' 
    ? rankingData 
    : rankingData?.filter(r => r.departamento === selectedDept);

  // Recalculate positions for filtered data
  const rankedFiltered = filteredRanking?.map((seller, idx) => ({
    ...seller,
    displayPosition: selectedDept === 'all' ? seller.posicion : idx + 1
  }));

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
    return 'bg-white/5 border border-white/10';
  };

  const getCityColor = (ciudad: string) => {
    if (ciudad.includes('La Paz')) return 'from-blue-500 to-blue-700';
    if (ciudad.includes('Cochabamba')) return 'from-green-500 to-green-700';
    if (ciudad.includes('Santa Cruz')) return 'from-orange-500 to-orange-700';
    return 'from-gray-500 to-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <span className="text-white">Ranking de Vendedores</span>
        </h1>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-xl border border-white/10 min-h-[500px]">
        <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 mb-8 bg-black/40 border border-white/10">
            <TabsTrigger 
                value="general" 
                className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-gray-400 hover:text-white transition-colors"
            >
                <TrendingUp className="h-4 w-4 mr-2" />
                General
            </TabsTrigger>
            <TabsTrigger 
                value="topCities" 
                className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-gray-400 hover:text-white transition-colors"
            >
                <Crown className="h-4 w-4 mr-2" />
                Top 6
            </TabsTrigger>
            <TabsTrigger 
                value="city" 
                className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-gray-400 hover:text-white transition-colors"
            >
                <MapPin className="h-4 w-4 mr-2" />
                Por Departamento
            </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {/* Top 3 Podium */}
                {rankingData && rankingData.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
                    {/* 2nd Place */}
                    <div className="mt-8">
                    <Card className="bg-gradient-to-b from-gray-800/50 to-gray-900/50 border-gray-700/50 text-center backdrop-blur-sm">
                        <CardContent className="pt-6">
                        <Medal className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="font-bold text-white truncate">{rankingData[1]?.nombreVendedor}</h3>
                        <p className="text-sm text-gray-400 truncate">{rankingData[1]?.tienda}</p>
                        <Badge className="mt-2 bg-gray-600 text-white border-0">
                            {rankingData[1]?.cantidadVentas || 0} puntos
                        </Badge>
                        </CardContent>
                    </Card>
                    </div>

                    {/* 1st Place */}
                    <div className="transform scale-105 z-10">
                    <Card className="bg-gradient-to-b from-yellow-900/20 to-yellow-950/20 border-yellow-500/30 text-center backdrop-blur-sm shadow-xl shadow-yellow-900/10">
                        <CardContent className="pt-6">
                        <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-3 filter drop-shadow-md" />
                        <h3 className="font-bold text-white text-lg truncate">{rankingData[0]?.nombreVendedor}</h3>
                        <p className="text-sm text-gray-400 truncate">{rankingData[0]?.tienda}</p>
                        <Badge className="mt-2 bg-yellow-500 text-black text-lg px-4 hover:bg-yellow-400 border-0">
                            {rankingData[0]?.cantidadVentas || 0} puntos
                        </Badge>
                        </CardContent>
                    </Card>
                    </div>

                    {/* 3rd Place */}
                    <div className="mt-12">
                    <Card className="bg-gradient-to-b from-amber-900/20 to-amber-950/20 border-amber-800/30 text-center backdrop-blur-sm">
                        <CardContent className="pt-6">
                        <Award className="h-10 w-10 text-amber-600 mx-auto mb-3" />
                        <h3 className="font-bold text-white truncate">{rankingData[2]?.nombreVendedor}</h3>
                        <p className="text-sm text-gray-400 truncate">{rankingData[2]?.tienda}</p>
                        <Badge className="mt-2 bg-amber-700 text-white border-0 hover:bg-amber-600">
                            {rankingData[2]?.cantidadVentas || 0} puntos
                        </Badge>
                        </CardContent>
                    </Card>
                    </div>
                </div>
                )}

                {/* Full List */}
                <Card className="bg-black/40 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-yellow-500" />
                    Ranking Completo
                    {rankingData && (
                        <Badge className="ml-auto bg-yellow-500/20 text-yellow-500 border-0">
                        {rankingData.length} vendedores
                        </Badge>
                    )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                    <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-yellow-500 mx-auto" />
                        <p className="text-gray-400 mt-2">Cargando ranking...</p>
                    </div>
                    ) : rankingData?.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        Aún no hay vendedores registrados
                    </div>
                    ) : (
                    <div className="space-y-3">
                        {rankingData?.map((seller, idx) => (
                        <div
                            key={idx}
                            className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${getRankBadge(seller.posicion || idx + 1)} ${(seller.posicion || idx + 1) <= 2 ? 'text-black shadow-lg' : (seller.posicion || idx + 1) === 3 ? 'text-white' : 'hover:bg-white/10 text-white'}`}
                        >
                            <div className="w-10 flex justify-center">
                            {getRankIcon(seller.posicion || idx + 1)}
                            </div>
                            <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold truncate ${(seller.posicion || idx + 1) <= 2 ? 'text-black' : 'text-white'}`}>{seller.nombreVendedor}</h4>
                            <div className={`flex items-center gap-2 text-sm ${(seller.posicion || idx + 1) <= 2 ? 'text-black/70' : 'text-gray-400'}`}>
                                <Store className="h-3 w-3" />
                                <span className="truncate">{seller.tienda}</span>
                                <span className="text-current opacity-50">•</span>
                                <MapPin className="h-3 w-3" />
                                <span>{seller.departamento}</span>
                            </div>
                            </div>
                            <div className="text-right">
                            <div className={`text-lg font-bold ${(seller.posicion || idx + 1) <= 2 ? 'text-black' : 'text-yellow-500'}`}>{seller.cantidadVentas || 0}</div>
                            <div className={`text-xs ${(seller.posicion || idx + 1) <= 2 ? 'text-black/60' : 'text-gray-500'}`}>puntos</div>
                            </div>
                        </div>
                        ))}
                    </div>
                    )}
                </CardContent>
                </Card>
            </motion.div>
            </TabsContent>

            <TabsContent value="topCities">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                    Top 2 Vendedores por Departamento
                </h2>
                <p className="text-gray-400">
                    Los mejores de La Paz, Cochabamba y Santa Cruz
                </p>
                </div>

                {topCiudades ? (
                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {/* La Paz */}
                    <Card className="bg-gradient-to-br from-blue-900/90 to-blue-950/90 border-blue-800/50">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-400" />
                        La Paz
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {topCiudades.topLaPaz?.map((seller, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-black/40 rounded-lg hover:bg-black/50 transition-colors border border-white/10">
                            {idx === 0 ? <Trophy className="h-5 w-5 text-yellow-400" /> : <Medal className="h-5 w-5 text-gray-400" />}
                            <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate">{seller.nombreVendedor}</p>
                            <p className="text-sm text-gray-300 truncate">{seller.tienda}</p>
                            </div>
                            <Badge className="bg-blue-600 hover:bg-blue-500 border-0">{seller.cantidadVentas}</Badge>
                        </div>
                        ))}
                        {(!topCiudades.topLaPaz || topCiudades.topLaPaz.length === 0) && (
                        <p className="text-gray-400 text-center py-4 text-sm">Sin datos registrados</p>
                        )}
                    </CardContent>
                    </Card>

                    {/* Cochabamba */}
                    <Card className="bg-gradient-to-br from-green-900/90 to-green-950/90 border-green-800/50">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-green-400" />
                        Cochabamba
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {topCiudades.topCochabamba?.map((seller, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-black/40 rounded-lg hover:bg-black/50 transition-colors border border-white/10">
                            {idx === 0 ? <Trophy className="h-5 w-5 text-yellow-400" /> : <Medal className="h-5 w-5 text-gray-400" />}
                            <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate">{seller.nombreVendedor}</p>
                            <p className="text-sm text-gray-300 truncate">{seller.tienda}</p>
                            </div>
                            <Badge className="bg-green-600 hover:bg-green-500 border-0">{seller.cantidadVentas}</Badge>
                        </div>
                        ))}
                        {(!topCiudades.topCochabamba || topCiudades.topCochabamba.length === 0) && (
                        <p className="text-gray-400 text-center py-4 text-sm">Sin datos registrados</p>
                        )}
                    </CardContent>
                    </Card>

                    {/* Santa Cruz */}
                    <Card className="bg-gradient-to-br from-orange-900/90 to-orange-950/90 border-orange-800/50">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-orange-400" />
                        Santa Cruz
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {topCiudades.topSantaCruz?.map((seller, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-black/40 rounded-lg hover:bg-black/50 transition-colors border border-white/10">
                            {idx === 0 ? <Trophy className="h-5 w-5 text-yellow-400" /> : <Medal className="h-5 w-5 text-gray-400" />}
                            <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate">{seller.nombreVendedor}</p>
                            <p className="text-sm text-gray-300 truncate">{seller.tienda}</p>
                            </div>
                            <Badge className="bg-orange-600 hover:bg-orange-500 border-0">{seller.cantidadVentas}</Badge>
                        </div>
                        ))}
                        {(!topCiudades.topSantaCruz || topCiudades.topSantaCruz.length === 0) && (
                        <p className="text-gray-400 text-center py-4 text-sm">Sin datos registrados</p>
                        )}
                    </CardContent>
                    </Card>
                </div>
                ) : (
                <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-yellow-500 mx-auto" />
                    <p className="text-gray-400 mt-2">Cargando datos...</p>
                </div>
                )}
            </motion.div>
            </TabsContent>

            <TabsContent value="city">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="max-w-xs mx-auto mb-8">
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger className="bg-black/40 border-white/20 text-white">
                    <SelectValue placeholder="Filtrar por departamento" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/20 text-white">
                    <SelectItem value="all">Todos los departamentos</SelectItem>
                    {departamentos.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>

                <Card className="bg-black/40 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-yellow-500" />
                    Ranking por Departamento
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                    <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-yellow-500 mx-auto" />
                        <p className="text-gray-400 mt-2">Cargando ranking...</p>
                    </div>
                    ) : rankedFiltered?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No hay vendedores en esta ciudad
                    </div>
                    ) : (
                    <div className="space-y-3">
                        {rankedFiltered?.map((seller, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <div className="w-10 flex justify-center">
                            {getRankIcon(seller.displayPosition || idx + 1)}
                            </div>
                            <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white truncate">{seller.nombreVendedor}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Store className="h-3 w-3" />
                                <span className="truncate">{seller.tienda}</span>
                            </div>
                            </div>
                            <Badge className={`bg-gradient-to-r text-white border-0 ${getCityColor(seller.departamento)}`}>
                            {seller.departamento}
                            </Badge>
                            <div className="text-right">
                            <div className="text-lg font-bold text-yellow-500">{seller.cantidadVentas || 0}</div>
                            <div className="text-xs text-gray-500">puntos</div>
                            </div>
                        </div>
                        ))}
                    </div>
                    )}
                </CardContent>
                </Card>
            </motion.div>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
