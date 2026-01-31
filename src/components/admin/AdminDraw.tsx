import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { API_ENDPOINTS, ConfiguracionDTO, DashboardResumen, SorteoClienteGanador } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Trophy, Play, Download, AlertTriangle, Users, Gift, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useNavigate } from 'react-router-dom';

export default function AdminDraw() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Fetch Configs (for Draw Date)
  const { data: configs } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const res = await apiService.get<ConfiguracionDTO[]>(API_ENDPOINTS.ADMIN.CONFIGURACION);
      if (res.error) throw new Error(res.mensaje);
      return res.data;
    }
  });

  const drawDate = configs?.find(c => c.clave === 'campaign.draw_date')?.valor;

  // Fetch Stats (Resumen)
  const { data: stats } = useQuery({
    queryKey: ['dashboard-resumen'],
    queryFn: async () => {
      const res = await apiService.get<DashboardResumen>(API_ENDPOINTS.DASHBOARD.RESUMEN);
      if (res.error) throw new Error(res.mensaje);
      return res.data;
    }
  });

  // Fetch Winners
  const { data: winners, isLoading: loadingWinners } = useQuery({
    queryKey: ['admin-draw-winners'],
    queryFn: async () => {
      const res = await apiService.get<SorteoClienteGanador[]>(API_ENDPOINTS.SORTEOS.GANADORES_CLIENTES);
      if (res.error) throw new Error(res.mensaje);
      return res.data;
    }
  });

  // Execute Draw Mutation (Single Winner)
  const createDrawMutation = useMutation({
    mutationFn: async () => {
      const res = await apiService.post(API_ENDPOINTS.SORTEOS.SORTEAR_CLIENTE, {});
      if (res.error) throw new Error(res.mensaje);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-draw-winners'] });
      // Verify if data contains message or status
      toast.success('¡Ganador seleccionado exitosamente!');
      setConfirmDialogOpen(false);
      setConfirmText('');
    },
    onError: (error) => {
      toast.error('Error en sorteo: ' + error.message);
    }
  });

  const exportCSV = () => {
    if (!winners || winners.length === 0) return;

    const headers = ['Posición', 'Nombre', 'Email', 'Teléfono', 'Cupón', 'Fecha Sorteo'];
    const rows = winners.map(w => [
      w.posicionSorteo,
      w.nombreCliente,
      w.emailCliente,
      w.telefonoCliente || '',
      w.codigoCupon,
      format(new Date(w.fechaSorteo), 'dd/MM/yyyy HH:mm')
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

  const hasWinners = winners && winners.length > 0;
  const maxWinners = 5; // Hardcoded in backend
  const canExecuteDraw = (winners?.length || 0) < maxWinners;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
        <Trophy className="h-8 w-8 text-primary" />
        Sorteo de Clientes
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gift className="h-8 w-8 text-primary" />
              <div>
                <p className="text-muted-foreground text-sm">Cupones Totales (Series Canjeadas)</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.seriesCanjeadas || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-muted-foreground text-sm">Jugadores Inscritos</p>
                <p className="text-2xl font-bold text-foreground">{stats?.jugadoresInscritos || 0}</p>
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
              <p className="text-muted-foreground text-sm">Fecha Programada del Sorteo</p>
              <p className="text-2xl font-bold text-foreground">
                {drawDate 
                  ? format(new Date(drawDate), 'd MMM yyyy', { locale: es })
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
            Sortea un ganador de entre los cupones disponibles. (Máximo {maxWinners} ganadores)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canExecuteDraw && (
            <Alert className="bg-secondary/20 border-secondary">
              <Trophy className="h-4 w-4 text-secondary" />
              <AlertDescription className="text-foreground">
                Se ha alcanzado el límite de ganadores ({maxWinners}). El sorteo ha finalizado.
              </AlertDescription>
            </Alert>
          )}

          {canExecuteDraw && (
            <>
              <Alert className="bg-destructive/20 border-destructive">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-foreground">
                  <strong>Advertencia:</strong> Esta acción seleccionará 1 ganador aleatorio. Es irreversible.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => navigate('/tombola')}
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                size="lg"
                disabled={!stats?.seriesCanjeadas}
              >
                <Play className="h-5 w-5 mr-2" />
                Ir a la Tómbola de Sorteo
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Winners */}
      {hasWinners && (
        <Card className="bg-muted border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground flex items-center gap-2">
                  🏆 Ganadores Seleccionados
                </CardTitle>
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
                  <TableHead className="text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Teléfono</TableHead>
                  <TableHead className="text-muted-foreground">Cupón</TableHead>
                  <TableHead className="text-muted-foreground">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingWinners ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : winners.map((winner) => (
                    <TableRow key={winner.id} className="border-border">
                      <TableCell className="font-bold text-primary text-lg">
                        #{winner.posicionSorteo}
                      </TableCell>
                      <TableCell className="text-foreground font-medium">{winner.nombreCliente}</TableCell>
                      <TableCell className="text-foreground">{winner.emailCliente}</TableCell>
                      <TableCell className="text-foreground">{winner.telefonoCliente || '-'}</TableCell>
                      <TableCell className="text-foreground font-mono">{winner.codigoCupon}</TableCell>
                      <TableCell className="text-foreground">
                         {format(new Date(winner.fechaSorteo), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))
                }
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
              Confirmar Sorteo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              Estás a punto de seleccionar un ganador aleatorio de entre <strong>{stats?.seriesCanjeadas}</strong> cupones.
            </p>
            <Alert className="bg-destructive/20 border-destructive">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-foreground">
                Escribe "SORTEAR" para confirmar.
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