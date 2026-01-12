import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Trophy, Play, Download, AlertTriangle, CheckCircle, Users, Gift, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCampaign } from '@/hooks/useCampaign';
import type { Tables } from '@/integrations/supabase/types';

type DrawResult = Tables<'draw_results'>;
type DrawWinner = Tables<'draw_winners'>;

export default function AdminDraw() {
  const queryClient = useQueryClient();
  const { data: campaign } = useCampaign();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [preselectedCount, setPreselectedCount] = useState(20);
  const [finalistsCount, setFinalistsCount] = useState(5);
  const [confirmText, setConfirmText] = useState('');

  // Fetch draws
  const { data: draws, isLoading: loadingDraws } = useQuery({
    queryKey: ['admin-draws'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('draw_results')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DrawResult[];
    }
  });

  // Fetch winners for latest executed draw
  const latestExecutedDraw = draws?.find(d => d.status === 'EXECUTED');
  
  const { data: winners, isLoading: loadingWinners } = useQuery({
    queryKey: ['admin-draw-winners', latestExecutedDraw?.id],
    queryFn: async () => {
      if (!latestExecutedDraw) return [];
      const { data, error } = await supabase
        .from('draw_winners')
        .select('*')
        .eq('draw_id', latestExecutedDraw.id)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as DrawWinner[];
    },
    enabled: !!latestExecutedDraw
  });

  // Fetch stats using COUPONS instead of tickets
  const { data: stats } = useQuery({
    queryKey: ['admin-draw-stats'],
    queryFn: async () => {
      const [
        { count: couponsTotal },
        { count: couponsBuyer },
        { count: couponsSeller },
        { data: uniqueParticipants }
      ] = await Promise.all([
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('owner_type', 'BUYER').eq('status', 'ACTIVE'),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('owner_type', 'SELLER').eq('status', 'ACTIVE'),
        // Count unique participants by email
        supabase.from('coupons').select('owner_email').eq('status', 'ACTIVE')
      ]);

      // Get unique participants count
      const uniqueEmails = new Set(uniqueParticipants?.map(c => c.owner_email) || []);

      return {
        couponsTotal: couponsTotal || 0,
        couponsBuyer: couponsBuyer || 0,
        couponsSeller: couponsSeller || 0,
        participants: uniqueEmails.size
      };
    }
  });

  // Create draw mutation
  const createDrawMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      // Create draw record
      const { data: drawData, error: createError } = await supabase
        .from('draw_results')
        .insert({
          draw_date: campaign?.draw_date || new Date().toISOString(),
          executed_by: user.id,
          status: 'PENDING',
          total_tickets: stats?.couponsTotal, // Using coupons count
          total_participants: stats?.participants
        })
        .select()
        .single();

      if (createError) throw createError;

      // Execute draw RPC
      const { data: result, error: rpcError } = await supabase.rpc('rpc_run_draw', {
        p_draw_id: drawData.id,
        p_preselected_count: preselectedCount,
        p_finalists_count: finalistsCount
      });

      if (rpcError) throw rpcError;

      return result;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-draws'] });
      queryClient.invalidateQueries({ queryKey: ['admin-draw-winners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-draw-stats'] });
      const res = result as { finalists?: number; preselected?: number } | null;
      toast.success(`¡Sorteo ejecutado! ${res?.finalists || 0} finalistas y ${res?.preselected || 0} preseleccionados`);
      setConfirmDialogOpen(false);
      setConfirmText('');
    },
    onError: (error) => {
      toast.error('Error en sorteo: ' + error.message);
    }
  });

  const exportCSV = () => {
    if (!winners || winners.length === 0) return;

    const headers = ['Posición', 'Tipo', 'Nombre', 'Email', 'Teléfono', 'Cupón ID', 'Premio'];
    const rows = winners.map(w => [
      w.position,
      w.winner_type,
      w.owner_name,
      w.owner_email,
      w.owner_phone || '',
      w.ticket_id, // This field references the coupon now
      w.prize_description || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ganadores_sorteo_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canExecuteDraw = !draws?.some(d => d.status === 'EXECUTED');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
        <Trophy className="h-8 w-8 text-primary" />
        Sorteo
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gift className="h-8 w-8 text-primary" />
              <div>
                <p className="text-muted-foreground text-sm">Cupones Totales</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.couponsTotal || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gift className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-muted-foreground text-sm">Cupones Compradores</p>
                <p className="text-2xl font-bold text-foreground">{stats?.couponsBuyer || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gift className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-muted-foreground text-sm">Cupones Vendedores</p>
                <p className="text-2xl font-bold text-foreground">{stats?.couponsSeller || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-muted-foreground text-sm">Participantes Únicos</p>
                <p className="text-2xl font-bold text-foreground">{stats?.participants || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign date */}
      <Card className="bg-muted border-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-muted-foreground text-sm">Fecha Sorteo</p>
              <p className="text-2xl font-bold text-foreground">
                {campaign?.draw_date 
                  ? format(new Date(campaign.draw_date), 'd MMM yyyy', { locale: es })
                  : 'No definida'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execute Draw */}
      <Card className="bg-muted border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Ejecutar Sorteo</CardTitle>
          <CardDescription>
            Configura y ejecuta el sorteo para seleccionar ganadores entre los cupones emitidos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canExecuteDraw && (
            <Alert className="bg-secondary/20 border-secondary">
              <CheckCircle className="h-4 w-4 text-secondary" />
              <AlertDescription className="text-foreground">
                El sorteo ya fue ejecutado. Los ganadores están listados abajo.
              </AlertDescription>
            </Alert>
          )}

          {canExecuteDraw && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Cantidad Preseleccionados</Label>
                  <Input
                    type="number"
                    value={preselectedCount}
                    onChange={(e) => setPreselectedCount(parseInt(e.target.value) || 20)}
                    min={finalistsCount}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Cantidad Finalistas</Label>
                  <Input
                    type="number"
                    value={finalistsCount}
                    onChange={(e) => setFinalistsCount(parseInt(e.target.value) || 5)}
                    max={preselectedCount}
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>

              <Alert className="bg-destructive/20 border-destructive">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-foreground">
                  <strong>Advertencia:</strong> El sorteo es irreversible. Una vez ejecutado, no se puede deshacer.
                  Asegúrate de tener todos los participantes y cupones registrados antes de proceder.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => setConfirmDialogOpen(true)}
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                size="lg"
                disabled={!stats?.couponsTotal}
              >
                <Play className="h-5 w-5 mr-2" />
                Ejecutar Sorteo ({stats?.couponsTotal || 0} cupones participantes)
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Winners */}
      {latestExecutedDraw && (
        <Card className="bg-muted border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground flex items-center gap-2">
                  🏆 Ganadores del Sorteo
                </CardTitle>
                <CardDescription>
                  Ejecutado el {format(new Date(latestExecutedDraw.created_at), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
                </CardDescription>
              </div>
              <Button onClick={exportCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground w-20">#</TableHead>
                  <TableHead className="text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Teléfono</TableHead>
                  <TableHead className="text-muted-foreground">Notificado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingWinners ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : winners && winners.length > 0 ? (
                  winners.map((winner) => (
                    <TableRow key={winner.id} className="border-border">
                      <TableCell className="font-bold text-primary text-lg">
                        #{winner.position}
                      </TableCell>
                      <TableCell>
                        <Badge className={winner.winner_type === 'FINALIST' ? 'bg-yellow-500 text-black' : 'bg-blue-500'}>
                          {winner.winner_type === 'FINALIST' ? '🏆 Finalista' : '⭐ Preseleccionado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground font-medium">{winner.owner_name}</TableCell>
                      <TableCell className="text-foreground">{winner.owner_email}</TableCell>
                      <TableCell className="text-foreground">{winner.owner_phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={winner.is_notified ? 'default' : 'outline'}>
                          {winner.is_notified ? '✓ Sí' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay ganadores registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {draws && draws.length > 0 && !latestExecutedDraw && (
        <Card className="bg-muted border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Historial de Sorteos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Fecha</TableHead>
                  <TableHead className="text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-muted-foreground">Participantes</TableHead>
                  <TableHead className="text-muted-foreground">Cupones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draws.map((draw) => (
                  <TableRow key={draw.id} className="border-border">
                    <TableCell className="text-foreground">
                      {format(new Date(draw.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={draw.status === 'EXECUTED' ? 'default' : 'secondary'}>
                        {draw.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{draw.total_participants}</TableCell>
                    <TableCell className="text-foreground">{draw.total_tickets}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="bg-muted border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Ejecución de Sorteo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              Estás a punto de ejecutar el sorteo con los siguientes parámetros:
            </p>
            <div className="grid grid-cols-3 gap-4 p-4 bg-background rounded-lg">
              <div>
                <p className="text-muted-foreground text-sm">Cupones</p>
                <p className="text-foreground font-bold text-xl">{stats?.couponsTotal || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Preseleccionados</p>
                <p className="text-foreground font-bold text-xl">{preselectedCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Finalistas</p>
                <p className="text-foreground font-bold text-xl">{finalistsCount}</p>
              </div>
            </div>
            <Alert className="bg-destructive/20 border-destructive">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-foreground">
                Esta acción es <strong>IRREVERSIBLE</strong>. Escribe "SORTEAR" para confirmar.
              </AlertDescription>
            </Alert>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Escribe SORTEAR"
              className="bg-background border-border text-foreground"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createDrawMutation.mutate()}
              disabled={confirmText !== 'SORTEAR' || createDrawMutation.isPending}
              className="bg-destructive text-destructive-foreground"
            >
              {createDrawMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Ejecutar Sorteo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}