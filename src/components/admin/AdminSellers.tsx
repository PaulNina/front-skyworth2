import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Users, Eye, Search, CheckCircle, Trophy, Store } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Seller = {
  id: string;
  user_id: string;
  store_name: string;
  store_city: string;
  store_department: string | null;
  total_points: number | null;
  total_sales: number | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'pending', label: 'Por verificar' },
];

export default function AdminSellers() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);

  const { data: sellers, isLoading } = useQuery({
    queryKey: ['admin-sellers', statusFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('sellers')
        .select('*, profiles!sellers_user_id_fkey(full_name, email, phone)')
        .order('total_points', { ascending: false });

      if (statusFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false);
      } else if (statusFilter === 'pending') {
        query = query.eq('is_verified', false);
      }

      if (searchTerm) {
        query = query.or(`store_name.ilike.%${searchTerm}%,store_city.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Seller[];
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('sellers')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      toast.success('Estado actualizado');
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sellers')
        .update({ is_verified: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      toast.success('Vendedor verificado');
      setSelectedSeller(null);
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const { data: sellerSales } = useQuery({
    queryKey: ['seller-sales', selectedSeller?.id],
    queryFn: async () => {
      if (!selectedSeller) return [];
      const { data, error } = await supabase
        .from('seller_sales')
        .select('*, products(model_name)')
        .eq('seller_id', selectedSeller.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSeller
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          Vendedores
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tienda o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background border-border text-foreground"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-background border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border">
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-foreground">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-muted border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Vendedor</TableHead>
                <TableHead className="text-muted-foreground">Tienda</TableHead>
                <TableHead className="text-muted-foreground">Ciudad</TableHead>
                <TableHead className="text-muted-foreground text-center">Ventas</TableHead>
                <TableHead className="text-muted-foreground text-center">Puntos</TableHead>
                <TableHead className="text-muted-foreground text-center">Estado</TableHead>
                <TableHead className="text-muted-foreground text-center">Activo</TableHead>
                <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : sellers && sellers.length > 0 ? (
                sellers.map((seller) => (
                  <TableRow key={seller.id} className="border-border">
                    <TableCell className="text-foreground">
                      <div>
                        <p className="font-medium">{seller.profiles?.full_name || 'Sin nombre'}</p>
                        <p className="text-muted-foreground text-xs">{seller.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground font-medium">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        {seller.store_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">{seller.store_city}</TableCell>
                    <TableCell className="text-foreground text-center font-bold">
                      {seller.total_sales || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span className="text-foreground font-bold">{seller.total_points || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {seller.is_verified ? (
                        <Badge className="bg-secondary text-secondary-foreground">Verificado</Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={seller.is_active ?? false}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: seller.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedSeller(seller)}>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No hay vendedores registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSeller} onOpenChange={(open) => !open && setSelectedSeller(null)}>
        <DialogContent className="bg-muted border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Store className="h-5 w-5" />
              Detalle de Vendedor
            </DialogTitle>
          </DialogHeader>
          {selectedSeller && (
            <div className="space-y-6">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Nombre</p>
                  <p className="text-foreground font-medium">{selectedSeller.profiles?.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Email</p>
                  <p className="text-foreground font-medium">{selectedSeller.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Teléfono</p>
                  <p className="text-foreground font-medium">{selectedSeller.profiles?.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Tienda</p>
                  <p className="text-foreground font-medium">{selectedSeller.store_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Ciudad</p>
                  <p className="text-foreground font-medium">{selectedSeller.store_city}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Registrado</p>
                  <p className="text-foreground font-medium">
                    {format(new Date(selectedSeller.created_at), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="bg-background rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{selectedSeller.total_sales || 0}</p>
                  <p className="text-muted-foreground text-sm">Ventas</p>
                </div>
                <div className="bg-background rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{selectedSeller.total_points || 0}</p>
                  <p className="text-muted-foreground text-sm">Puntos</p>
                </div>
              </div>

              {/* Recent Sales */}
              <div className="pt-4 border-t border-border">
                <p className="text-foreground font-medium mb-3">Últimas Ventas</p>
                {sellerSales && sellerSales.length > 0 ? (
                  <div className="space-y-2">
                    {sellerSales.map((sale: any) => (
                      <div key={sale.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                        <div>
                          <p className="text-foreground font-medium">{sale.products?.model_name}</p>
                          <p className="text-muted-foreground text-xs">{sale.client_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-primary font-bold">+{sale.points_earned}</p>
                          <p className="text-muted-foreground text-xs">
                            {format(new Date(sale.sale_date), 'dd/MM/yy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Sin ventas registradas.</p>
                )}
              </div>

              {/* Verify Button */}
              {!selectedSeller.is_verified && (
                <div className="pt-4">
                  <Button
                    onClick={() => verifyMutation.mutate(selectedSeller.id)}
                    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    disabled={verifyMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verificar Vendedor
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
