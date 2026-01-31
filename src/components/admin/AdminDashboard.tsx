import { useState } from 'react';
import { useQuery as useConfigQuery, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, ShoppingCart, Gift, TrendingUp, Package, CheckCircle, Clock, AlertCircle, FileText, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiService } from '@/services/apiService';
import { API_ENDPOINTS, ConfiguracionDTO, DashboardCompleteStats, TopProduct, RitmoJuegoItem } from '@/config/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

export default function AdminDashboard() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Fetch Campaign Config using API
  const { data: configs } = useConfigQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const res = await apiService.get<ConfiguracionDTO[]>(API_ENDPOINTS.ADMIN.CONFIGURACION);
      if (res.error) throw new Error(res.mensaje);
      return res.data;
    }
  });

  const campaign = {
      campaign_name: configs?.find(c => c.clave === 'campaign.name')?.valor || 'Campaña Skyworth',
      start_date: configs?.find(c => c.clave === 'campaign.start_date')?.valor || new Date().toISOString(),
      end_date: configs?.find(c => c.clave === 'campaign.end_date')?.valor || new Date().toISOString(),
      draw_date: configs?.find(c => c.clave === 'campaign.draw_date')?.valor || new Date().toISOString(),
  };

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const res = await apiService.get<DashboardCompleteStats>(API_ENDPOINTS.ADMIN.DASHBOARD);
      if (res.error) throw new Error(res.mensaje);
      return res.data;
    }
  });

  const { data: ritmoJuego, isLoading: isLoadingRitmo } = useQuery({
    queryKey: ['admin-dashboard-ritmo', startDate, endDate],
    queryFn: async () => {
        let url = `${API_ENDPOINTS.DASHBOARD.RITMO_JUEGO}?dias=7`;

        if (startDate && endDate) {
             url = `${API_ENDPOINTS.DASHBOARD.RITMO_JUEGO}/rango?fechaInicio=${startDate}&fechaFin=${endDate}`;
        }
      const res = await apiService.get<RitmoJuegoItem[]>(url);
      if (res.error) throw new Error(res.mensaje);
      return res.data;
    }
  });

  const isLoading = isLoadingStats || isLoadingRitmo;

  const daysUntilDraw = campaign.draw_date 
    ? differenceInDays(new Date(campaign.draw_date), new Date())
    : 0;

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="bg-muted border-border">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Helper to fix date timezone display (show date as is, ignoring timezone shift)
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    // Append T00:00:00 and Current Timezone offset to force it to be "local midnight" regardless of actual input
    // Or simpler: Split and use specific year/month/day
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset); 
    return format(adjustedDate, "d 'de' MMMM yyyy", { locale: es });
  };

  const kpiCards = [
    { label: 'Compras Clientes', value: stats?.purchases || 0, icon: ShoppingCart, color: 'text-primary' },
    { label: 'Ventas Vendedores', value: stats?.approvedPurchases || 0, icon: CheckCircle, color: 'text-secondary' }, // Actually Total Vendor Sales
    { label: 'Ventas Pendientes', value: stats?.pendingPurchases || 0, icon: Clock, color: 'text-yellow-400' },
    { label: 'Cupones Emitidos', value: stats?.couponsTotal || 0, icon: Gift, color: 'text-secondary' },
    { label: 'Cupones Comprador', value: stats?.couponsBuyer || 0, icon: Gift, color: 'text-blue-400' },
    { label: 'Total Puntos Emitidos', value: stats?.couponsSeller || 0, icon: Gift, color: 'text-green-400' },
    { label: 'Seriales Usados', value: `${stats?.serialsRegistered || 0} / ${stats?.serialsTotal || 0}`, icon: FileText, color: 'text-purple-400' },
    { label: 'Vendedores', value: stats?.sellers || 0, icon: Users, color: 'text-blue-400' },
    { label: 'Ventas Totales', value: stats?.sales || 0, icon: TrendingUp, color: 'text-purple-400' },
    { label: 'Días para Sorteo', value: daysUntilDraw > 0 ? daysUntilDraw : 'HOY', icon: AlertCircle, color: daysUntilDraw <= 7 ? 'text-destructive' : 'text-primary' },
  ];

  const maxVentas = ritmoJuego ? Math.max(...ritmoJuego.map(item => item.cantidad)) : 0;
  const yAxisMax = maxVentas > 0 ? Math.ceil(maxVentas * 1.2) : 5;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        {campaign && (
          <div className="text-right">
            <p className="text-muted-foreground text-sm">Campaña activa</p>
            <p className="text-foreground font-semibold">{campaign.campaign_name}</p>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="bg-muted border-border hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-xs font-medium">{kpi.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Icon className={`h-6 w-6 ${kpi.color}`} />
                  <span className="text-2xl font-bold text-foreground">{kpi.value}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Info */}
        <Card className="bg-muted border-border col-span-1 lg:col-span-2">
            <CardHeader>
            <CardTitle className="text-foreground">Información de Campaña</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                <p className="text-muted-foreground text-sm">Inicio</p>
                <p className="text-foreground font-semibold">
                    {formatDate(campaign.start_date)}
                </p>
                </div>
                <div>
                <p className="text-muted-foreground text-sm">Fin</p>
                <p className="text-foreground font-semibold">
                    {formatDate(campaign.end_date)}
                </p>
                </div>
                <div>
                <p className="text-muted-foreground text-sm">Fecha de Sorteo</p>
                <p className="text-foreground font-semibold">
                    {formatDate(campaign.draw_date)}
                </p>
                </div>
            </div>
            </CardContent>
        </Card>

        {/* Ritmo de Juego Chart */}
        <Card className="bg-muted border-border col-span-1 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-foreground flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Ritmo de Juego
                </CardTitle>
                <div className="flex gap-2 items-center">
                    <Input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 w-auto text-xs bg-white/10 border-white/20 text-white [color-scheme:dark]"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 w-auto text-xs bg-white/10 border-white/20 text-white [color-scheme:dark]"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {ritmoJuego && ritmoJuego.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ritmoJuego} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                                <XAxis 
                                    dataKey="fecha" 
                                    tickFormatter={(value) => format(parseISO(value), 'dd MMM', { locale: es })}
                                    className="text-xs text-muted-foreground"
                                    tick={{ fill: 'currentColor' }}
                                />
                                <YAxis 
                                    className="text-xs text-muted-foreground" 
                                    tick={{ fill: 'currentColor' }}
                                    domain={[0, yAxisMax]}
                                    allowDecimals={false}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                                    labelFormatter={(value) => format(parseISO(value), "d 'de' MMMM yyyy", { locale: es })}
                                />
                                <Bar dataKey="cantidad" fill="#3b82f6" name="Ventas" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="cantidad" position="top" fill="#9ca3af" fontSize={12} formatter={(value: number) => value > 0 ? value : ''} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No hay datos de ventas recientes.</p>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="bg-muted border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Productos más registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.topProducts && stats.topProducts.length > 0 ? (
            <div className="space-y-3">
              {stats.topProducts.map((product: TopProduct, index: number) => (
                <div key={product.id || index} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-primary">#{index + 1}</span>
                    <div>
                      <p className="text-foreground font-medium">{product.model_name || 'Desconocido'}</p>
                      <p className="text-muted-foreground text-sm">{product.screen_size}" - {product.tier}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground font-bold">{product.total_registrations || 0}</p>
                    <p className="text-muted-foreground text-xs">registros</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No hay registros de productos aún (Datos de backend en construcción).</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}