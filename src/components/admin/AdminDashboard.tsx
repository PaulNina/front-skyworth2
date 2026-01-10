import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ShoppingCart, Ticket, TrendingUp, Package, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCampaign } from '@/hooks/useCampaign';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminDashboard() {
  const { campaign } = useCampaign();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [
        { count: purchasesCount },
        { count: approvedPurchasesCount },
        { count: pendingPurchasesCount },
        { count: ticketsAssigned },
        { count: ticketsTotal },
        { count: sellersCount },
        { count: salesCount },
        { data: topProducts }
      ] = await Promise.all([
        supabase.from('client_purchases').select('*', { count: 'exact', head: true }),
        supabase.from('client_purchases').select('*', { count: 'exact', head: true }).eq('admin_status', 'APPROVED'),
        supabase.from('client_purchases').select('*', { count: 'exact', head: true }).is('admin_status', null),
        supabase.from('ticket_pool').select('*', { count: 'exact', head: true }).eq('is_assigned', true),
        supabase.from('ticket_pool').select('*', { count: 'exact', head: true }),
        supabase.from('sellers').select('*', { count: 'exact', head: true }),
        supabase.from('seller_sales').select('*', { count: 'exact', head: true }),
        supabase.from('v_top_products').select('*').limit(5)
      ]);

      return {
        purchases: purchasesCount || 0,
        approvedPurchases: approvedPurchasesCount || 0,
        pendingPurchases: pendingPurchasesCount || 0,
        ticketsAssigned: ticketsAssigned || 0,
        ticketsTotal: ticketsTotal || 0,
        sellers: sellersCount || 0,
        sales: salesCount || 0,
        topProducts: topProducts || []
      };
    }
  });

  const daysUntilDraw = campaign?.draw_date 
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

  const kpiCards = [
    { label: 'Compras Registradas', value: stats?.purchases, icon: ShoppingCart, color: 'text-primary' },
    { label: 'Compras Aprobadas', value: stats?.approvedPurchases, icon: CheckCircle, color: 'text-secondary' },
    { label: 'Pendientes Revisión', value: stats?.pendingPurchases, icon: Clock, color: 'text-yellow-400' },
    { label: 'Tickets Asignados', value: `${stats?.ticketsAssigned}/${stats?.ticketsTotal}`, icon: Ticket, color: 'text-secondary' },
    { label: 'Vendedores', value: stats?.sellers, icon: Users, color: 'text-blue-400' },
    { label: 'Ventas Totales', value: stats?.sales, icon: TrendingUp, color: 'text-purple-400' },
    { label: 'Días para Sorteo', value: daysUntilDraw > 0 ? daysUntilDraw : 'HOY', icon: AlertCircle, color: daysUntilDraw <= 7 ? 'text-destructive' : 'text-primary' },
  ];

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="bg-muted border-border hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">{kpi.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Icon className={`h-8 w-8 ${kpi.color}`} />
                  <span className="text-3xl font-bold text-foreground">{kpi.value}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Campaign Info */}
      {campaign && (
        <Card className="bg-muted border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Información de Campaña</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-muted-foreground text-sm">Inicio</p>
                <p className="text-foreground font-semibold">
                  {format(new Date(campaign.start_date), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Fin</p>
                <p className="text-foreground font-semibold">
                  {format(new Date(campaign.end_date), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Fecha de Sorteo</p>
                <p className="text-foreground font-semibold">
                  {format(new Date(campaign.draw_date), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              {stats.topProducts.map((product: any, index: number) => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-primary">#{index + 1}</span>
                    <div>
                      <p className="text-foreground font-medium">{product.model_name}</p>
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
            <p className="text-muted-foreground text-center py-8">No hay registros de productos aún.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
