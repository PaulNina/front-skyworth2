import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, Search, Users, Store, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { apiService } from '@/services/apiService';
import { API_ENDPOINTS } from '@/config/api';

type Coupon = {
  id: number;
  codigo: string;
  serialTv?: string;
  nombreComprador?: string;
  ciComprador?: string;
  email?: string;
  estado: string;
  tipo: string;
  fechaGeneracion: string;
  modeloTv?: string;
};

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export default function AdminCoupons() {
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerTypeFilter, setOwnerTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Fetch coupons
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons', page, pageSize, searchTerm, ownerTypeFilter, statusFilter],
    queryFn: async () => {
      let url = `${API_ENDPOINTS.ADMIN.CUPONES}?page=${page}&size=${pageSize}`;
      if (searchTerm) url += `&search=${searchTerm}`;
      if (ownerTypeFilter !== 'all') url += `&tipo=${ownerTypeFilter}`;
      if (statusFilter !== 'all') url += `&estado=${statusFilter}`;

      const response = await apiService.get<PageResponse<Coupon>>(url);
      if (response.error) throw new Error(response.mensaje);
      
      const pageData = response.data;
      setTotalPages(pageData.totalPages);
      setTotalElements(pageData.totalElements);
      return pageData.content;
    }
  });

  // Calculate stats logic needs to be updated. Since we are paginating, we cannot calculate totals client-side easily.
  // We might need a separate endpoint for stats or accept that stats are disabled or fetched differently.
  // For now, I will hardcode stats to 0 or remove them?
  // User asked for pagination. "because van a ser miles de cupones".
  // Stats based on `coupons.length` (current page) is wrong.
  // I will just display "Total: totalElements" in one card and maybe hide others or keep them static?
  // Let's keep Total.
  const stats = {
    total: totalElements,
    buyer: '-', // Cannot count all without separate API
    seller: '-',
    active: '-'
  };

  const getOwnerTypeBadge = (tipo: string) => {
    return tipo === 'COMPRADOR' 
      ? <Badge className="bg-blue-500 text-white"><Users className="h-3 w-3 mr-1" />Comprador</Badge>
      : <Badge className="bg-purple-500 text-white"><Store className="h-3 w-3 mr-1" />Vendedor</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVO': return <Badge className="bg-secondary text-secondary-foreground">Activo</Badge>;
      case 'ANULADO': return <Badge variant="destructive">Anulado</Badge>;
      case 'GANADOR': return <Badge className="bg-primary text-primary-foreground">Ganador</Badge>;
      case 'PRESELECCIONADO': return <Badge className="bg-yellow-500 text-black">Preseleccionado</Badge>;
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

      {/* Stats Cards - Simplified for Pagination */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total Cupones</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
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
            onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0); // Reset page on search
            }}
            className="pl-10 bg-background border-border text-foreground"
          />
        </div>
        <Select value={ownerTypeFilter} onValueChange={(val) => { setOwnerTypeFilter(val); setPage(0); }}>
          <SelectTrigger className="w-40 bg-background border-border text-foreground">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border">
            <SelectItem value="all" className="text-foreground">Todos</SelectItem>
            <SelectItem value="BUYER" className="text-foreground">Comprador</SelectItem>
            <SelectItem value="SELLER" className="text-foreground">Vendedor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(0); }}>
          <SelectTrigger className="w-40 bg-background border-border text-foreground">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border">
            <SelectItem value="all" className="text-foreground">Todos</SelectItem>
            <SelectItem value="ACTIVO" className="text-foreground">Activo</SelectItem>
            <SelectItem value="ANULADO" className="text-foreground">Anulado</SelectItem>
            <SelectItem value="GANADOR" className="text-foreground">Ganador</SelectItem>
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
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-muted-foreground">Propietario</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground">Emitido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Cargando cupones...
                  </TableCell>
                </TableRow>
              ) : coupons.length > 0 ? (
                coupons.map((coupon) => (
                  <TableRow key={coupon.id} className="border-border">
                    <TableCell className="text-foreground font-mono text-sm font-bold">{coupon.codigo}</TableCell>
                    <TableCell>{getOwnerTypeBadge(coupon.tipo)}</TableCell>
                    <TableCell className="text-foreground">
                      <div>
                        <p className="font-medium">{coupon.nombreComprador || '-'}</p>
                        {coupon.ciComprador && (
                          <p className="text-xs text-muted-foreground">CI: {coupon.ciComprador}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(coupon.estado)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(coupon.fechaGeneracion), 'dd/MM/yy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No se encontraron cupones.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-4 py-4 border-t border-border bg-muted/50">
            <div className="text-sm text-foreground font-medium">
                Mostrando <span className="text-primary">{coupons.length}</span> de <span className="text-primary">{totalElements}</span> resultados (Página {page + 1} de {totalPages})
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="bg-background border-border text-foreground hover:bg-secondary/20"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="bg-background border-border text-foreground hover:bg-secondary/20"
                >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>

        </CardContent>
      </Card>
    </div>
  );
}
