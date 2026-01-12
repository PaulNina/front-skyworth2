import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Ticket, Search, Users, Store } from 'lucide-react';
import { format } from 'date-fns';

type Coupon = {
  id: string;
  code: string;
  serial_number: string;
  owner_type: string;
  owner_name: string | null;
  owner_email: string | null;
  status: string;
  issued_at: string;
  products?: { model_name: string } | null;
};

export default function AdminCoupons() {
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerTypeFilter, setOwnerTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch coupons
  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons', searchTerm, ownerTypeFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('coupons')
        .select('*, products(model_name)')
        .order('issued_at', { ascending: false });

      if (ownerTypeFilter !== 'all') {
        query = query.eq('owner_type', ownerTypeFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (searchTerm) {
        query = query.or(`code.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,owner_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data as Coupon[];
    }
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['coupon-stats'],
    queryFn: async () => {
      const [
        { count: total },
        { count: buyerCoupons },
        { count: sellerCoupons },
        { count: activeCoupons }
      ] = await Promise.all([
        supabase.from('coupons').select('*', { count: 'exact', head: true }),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('owner_type', 'BUYER'),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('owner_type', 'SELLER'),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE')
      ]);
      return {
        total: total || 0,
        buyer: buyerCoupons || 0,
        seller: sellerCoupons || 0,
        active: activeCoupons || 0
      };
    }
  });

  const getOwnerTypeBadge = (type: string) => {
    return type === 'BUYER' 
      ? <Badge className="bg-blue-500 text-white"><Users className="h-3 w-3 mr-1" />Comprador</Badge>
      : <Badge className="bg-purple-500 text-white"><Store className="h-3 w-3 mr-1" />Vendedor</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge className="bg-secondary text-secondary-foreground">Activo</Badge>;
      case 'VOID': return <Badge variant="destructive">Anulado</Badge>;
      case 'WON': return <Badge className="bg-primary text-primary-foreground">Ganador</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Ticket className="h-8 w-8 text-primary" />
          Cupones Emitidos
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total Cupones</p>
              <p className="text-3xl font-bold text-foreground">{stats?.total || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Compradores</p>
              <p className="text-3xl font-bold text-blue-400">{stats?.buyer || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Vendedores</p>
              <p className="text-3xl font-bold text-purple-400">{stats?.seller || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Activos</p>
              <p className="text-3xl font-bold text-secondary">{stats?.active || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, serial o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background border-border text-foreground"
          />
        </div>
        <Select value={ownerTypeFilter} onValueChange={setOwnerTypeFilter}>
          <SelectTrigger className="w-40 bg-background border-border text-foreground">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border">
            <SelectItem value="all" className="text-foreground">Todos</SelectItem>
            <SelectItem value="BUYER" className="text-foreground">Comprador</SelectItem>
            <SelectItem value="SELLER" className="text-foreground">Vendedor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-background border-border text-foreground">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border">
            <SelectItem value="all" className="text-foreground">Todos</SelectItem>
            <SelectItem value="ACTIVE" className="text-foreground">Activo</SelectItem>
            <SelectItem value="VOID" className="text-foreground">Anulado</SelectItem>
            <SelectItem value="WON" className="text-foreground">Ganador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-muted border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Código</TableHead>
                <TableHead className="text-muted-foreground">Serial</TableHead>
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-muted-foreground">Propietario</TableHead>
                <TableHead className="text-muted-foreground">Producto</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground">Emitido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Cargando cupones...
                  </TableCell>
                </TableRow>
              ) : coupons && coupons.length > 0 ? (
                coupons.map((coupon) => (
                  <TableRow key={coupon.id} className="border-border">
                    <TableCell className="text-foreground font-mono text-sm">{coupon.code}</TableCell>
                    <TableCell className="text-foreground font-mono text-sm">{coupon.serial_number}</TableCell>
                    <TableCell>{getOwnerTypeBadge(coupon.owner_type)}</TableCell>
                    <TableCell className="text-foreground">
                      <div>
                        <p className="font-medium">{coupon.owner_name || '-'}</p>
                        {coupon.owner_email && (
                          <p className="text-xs text-muted-foreground">{coupon.owner_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">{coupon.products?.model_name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(coupon.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(coupon.issued_at), 'dd/MM/yy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay cupones emitidos aún.
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
