import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Ticket, Plus, Search, RefreshCw } from 'lucide-react';

const TIERS = ['T1', 'T2', 'T3'];

export default function AdminTickets() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tierFilter, setTierFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [generateForm, setGenerateForm] = useState({
    tier: 'T1',
    count: '100',
    prefix: 'TKT'
  });

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: async () => {
      const results = await Promise.all(
        TIERS.map(async (tier) => {
          const [{ count: total }, { count: assigned }] = await Promise.all([
            supabase.from('ticket_pool').select('*', { count: 'exact', head: true }).eq('tier', tier),
            supabase.from('ticket_pool').select('*', { count: 'exact', head: true }).eq('tier', tier).eq('is_assigned', true)
          ]);
          return { tier, total: total || 0, assigned: assigned || 0 };
        })
      );
      return results;
    }
  });

  // Tickets list query
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-tickets', tierFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('ticket_pool')
        .select('*')
        .order('created_at', { ascending: false });

      if (tierFilter !== 'all') {
        query = query.eq('tier', tierFilter);
      }

      if (searchTerm) {
        query = query.ilike('ticket_code', `%${searchTerm}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    }
  });

  // Generate tickets mutation
  const generateMutation = useMutation({
    mutationFn: async ({ tier, count, prefix }: { tier: string; count: number; prefix: string }) => {
      const ticketsToInsert = [];
      for (let i = 0; i < count; i++) {
        const code = `${prefix}-${tier.charAt(0)}-${Date.now().toString(36).toUpperCase()}${i.toString().padStart(4, '0')}`;
        ticketsToInsert.push({
          ticket_code: code,
          tier: tier,
          is_assigned: false
        });
      }
      
      const { error } = await supabase.from('ticket_pool').insert(ticketsToInsert);
      if (error) throw error;
      return count;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats'] });
      toast.success(`${count} tickets generados exitosamente`);
      setDialogOpen(false);
      setGenerateForm({ tier: 'T1', count: '100', prefix: 'TKT' });
    },
    onError: (error) => {
      toast.error('Error al generar tickets: ' + error.message);
    }
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(generateForm.count);
    if (count < 1 || count > 10000) {
      toast.error('La cantidad debe estar entre 1 y 10,000');
      return;
    }
    generateMutation.mutate({
      tier: generateForm.tier,
      count,
      prefix: generateForm.prefix
    });
  };

  const getTierBadgeClass = (tier: string) => {
    switch (tier) {
      case 'T3': return 'bg-primary text-primary-foreground';
      case 'T2': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted-foreground/20 text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Ticket className="h-8 w-8 text-primary" />
          Pool de Tickets
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Generar Tickets
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-muted border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Generar Nuevos Tickets</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tier" className="text-foreground">Tier</Label>
                <Select 
                  value={generateForm.tier} 
                  onValueChange={(v) => setGenerateForm({ ...generateForm, tier: v })}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    {TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier} className="text-foreground">{tier}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="count" className="text-foreground">Cantidad</Label>
                <Input
                  id="count"
                  type="number"
                  value={generateForm.count}
                  onChange={(e) => setGenerateForm({ ...generateForm, count: e.target.value })}
                  min="1"
                  max="10000"
                  className="bg-background border-border text-foreground"
                />
                <p className="text-muted-foreground text-xs">Máximo 10,000 tickets por lote</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prefix" className="text-foreground">Prefijo</Label>
                <Input
                  id="prefix"
                  value={generateForm.prefix}
                  onChange={(e) => setGenerateForm({ ...generateForm, prefix: e.target.value.toUpperCase() })}
                  maxLength={5}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={generateMutation.isPending} className="flex-1 bg-primary text-primary-foreground">
                  {generateMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    'Generar'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats?.map((stat) => {
          const percentage = stat.total > 0 ? (stat.assigned / stat.total) * 100 : 0;
          return (
            <Card key={stat.tier} className="bg-muted border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex items-center justify-between">
                  <Badge className={getTierBadgeClass(stat.tier)}>{stat.tier}</Badge>
                  <span className="text-2xl font-bold">{stat.total.toLocaleString()}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Asignados</span>
                    <span className="text-foreground font-medium">{stat.assigned.toLocaleString()}</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Disponibles</span>
                    <span className="text-secondary font-medium">{(stat.total - stat.assigned).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background border-border text-foreground"
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-48 bg-background border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border">
            <SelectItem value="all" className="text-foreground">Todos los tiers</SelectItem>
            {TIERS.map((tier) => (
              <SelectItem key={tier} value={tier} className="text-foreground">{tier}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tickets Table */}
      <Card className="bg-muted border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Código</TableHead>
                <TableHead className="text-muted-foreground">Tier</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground">Asignado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : tickets && tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="border-border">
                    <TableCell className="text-foreground font-mono">{ticket.ticket_code}</TableCell>
                    <TableCell>
                      <Badge className={getTierBadgeClass(ticket.tier)}>{ticket.tier}</Badge>
                    </TableCell>
                    <TableCell>
                      {ticket.is_assigned ? (
                        <Badge variant="outline" className="text-muted-foreground">Asignado</Badge>
                      ) : (
                        <Badge className="bg-secondary text-secondary-foreground">Disponible</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ticket.assigned_at
                        ? new Date(ticket.assigned_at).toLocaleDateString('es-ES')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No hay tickets. Genera algunos para comenzar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
