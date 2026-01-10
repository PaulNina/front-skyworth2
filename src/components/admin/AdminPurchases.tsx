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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ShoppingCart, Eye, CheckCircle, XCircle, Clock, Search, FileText, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Purchase = Tables<'client_purchases'> & {
  products?: { model_name: string; tier: string } | null;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobados' },
  { value: 'REJECTED', label: 'Rechazados' },
];

export default function AdminPurchases() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['admin-purchases', statusFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('client_purchases')
        .select('*, products(model_name, tier)')
        .order('created_at', { ascending: false });

      if (statusFilter === 'pending') {
        query = query.is('admin_status', null);
      } else if (statusFilter !== 'all') {
        query = query.eq('admin_status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,invoice_number.ilike.%${searchTerm}%,ci_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Purchase[];
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from('client_purchases')
        .update({
          admin_status: status,
          admin_notes: notes || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-purchases'] });
      toast.success('Estado actualizado');
      setSelectedPurchase(null);
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const handleApprove = (purchase: Purchase) => {
    updateStatusMutation.mutate({ id: purchase.id, status: 'APPROVED', notes: adminNotes });
  };

  const handleReject = (purchase: Purchase) => {
    if (!adminNotes.trim()) {
      toast.error('Debes agregar una nota explicando el rechazo');
      return;
    }
    updateStatusMutation.mutate({ id: purchase.id, status: 'REJECTED', notes: adminNotes });
  };

  const getStatusBadge = (status: string | null, iaStatus: string | null) => {
    if (status === 'APPROVED') {
      return <Badge className="bg-secondary text-secondary-foreground">Aprobado</Badge>;
    }
    if (status === 'REJECTED') {
      return <Badge variant="destructive">Rechazado</Badge>;
    }
    if (iaStatus === 'VALID') {
      return <Badge className="bg-blue-500 text-white">IA: Válido</Badge>;
    }
    if (iaStatus === 'INVALID') {
      return <Badge className="bg-orange-500 text-white">IA: Revisar</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground border-muted-foreground">Pendiente</Badge>;
  };

  const openDetail = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setAdminNotes(purchase.admin_notes || '');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-primary" />
          Compras de Clientes
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, factura o CI..."
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
                <TableHead className="text-muted-foreground">Fecha</TableHead>
                <TableHead className="text-muted-foreground">Cliente</TableHead>
                <TableHead className="text-muted-foreground">Producto</TableHead>
                <TableHead className="text-muted-foreground">Factura</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : purchases && purchases.length > 0 ? (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id} className="border-border">
                    <TableCell className="text-foreground">
                      {format(new Date(purchase.created_at), 'dd/MM/yy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell className="text-foreground">
                      <div>
                        <p className="font-medium">{purchase.full_name}</p>
                        <p className="text-muted-foreground text-xs">{purchase.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {purchase.products?.model_name || '-'}
                    </TableCell>
                    <TableCell className="text-foreground font-mono text-sm">
                      {purchase.invoice_number}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(purchase.admin_status, purchase.ia_status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDetail(purchase)}>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No hay compras registradas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPurchase} onOpenChange={(open) => !open && setSelectedPurchase(null)}>
        <DialogContent className="bg-muted border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <User className="h-5 w-5" />
              Detalle de Compra
            </DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Nombre</p>
                  <p className="text-foreground font-medium">{selectedPurchase.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">CI</p>
                  <p className="text-foreground font-medium">{selectedPurchase.ci_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Email</p>
                  <p className="text-foreground font-medium">{selectedPurchase.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Teléfono</p>
                  <p className="text-foreground font-medium">{selectedPurchase.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Ciudad</p>
                  <p className="text-foreground font-medium">{selectedPurchase.city}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Fecha Nacimiento</p>
                  <p className="text-foreground font-medium">
                    {format(new Date(selectedPurchase.birth_date), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>

              {/* Purchase Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-muted-foreground text-sm">Producto</p>
                  <p className="text-foreground font-medium">{selectedPurchase.products?.model_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Número Serie</p>
                  <p className="text-foreground font-mono">{selectedPurchase.serial_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Número Factura</p>
                  <p className="text-foreground font-mono">{selectedPurchase.invoice_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Fecha Compra</p>
                  <p className="text-foreground font-medium">
                    {format(new Date(selectedPurchase.purchase_date), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>

              {/* Documents */}
              <div className="pt-4 border-t border-border">
                <p className="text-muted-foreground text-sm mb-3">Documentos</p>
                <div className="flex gap-3">
                  {selectedPurchase.ci_front_url && (
                    <a
                      href={selectedPurchase.ci_front_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-background rounded-lg text-foreground hover:bg-accent transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      CI Frontal
                    </a>
                  )}
                  {selectedPurchase.ci_back_url && (
                    <a
                      href={selectedPurchase.ci_back_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-background rounded-lg text-foreground hover:bg-accent transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      CI Posterior
                    </a>
                  )}
                  {selectedPurchase.invoice_url && (
                    <a
                      href={selectedPurchase.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-background rounded-lg text-foreground hover:bg-accent transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      Factura
                    </a>
                  )}
                </div>
              </div>

              {/* IA Analysis */}
              {selectedPurchase.ia_status && (
                <div className="pt-4 border-t border-border">
                  <p className="text-muted-foreground text-sm mb-2">Análisis IA</p>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={selectedPurchase.ia_status === 'VALID' ? 'bg-secondary' : 'bg-orange-500'}>
                      {selectedPurchase.ia_status}
                    </Badge>
                    {selectedPurchase.ia_score !== null && (
                      <span className="text-foreground">Score: {selectedPurchase.ia_score}%</span>
                    )}
                  </div>
                  {selectedPurchase.ia_detail && (
                    <pre className="text-xs text-muted-foreground bg-background p-2 rounded overflow-auto">
                      {JSON.stringify(selectedPurchase.ia_detail, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Admin Review */}
              <div className="pt-4 border-t border-border">
                <p className="text-muted-foreground text-sm mb-2">Notas Admin</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Agrega notas sobre la revisión..."
                  className="bg-background border-border text-foreground"
                />
              </div>

              {/* Actions */}
              {selectedPurchase.admin_status !== 'APPROVED' && selectedPurchase.admin_status !== 'REJECTED' && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => handleReject(selectedPurchase)}
                    variant="destructive"
                    className="flex-1"
                    disabled={updateStatusMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedPurchase)}
                    className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprobar
                  </Button>
                </div>
              )}

              {selectedPurchase.admin_status && (
                <div className="text-center pt-4">
                  <p className="text-muted-foreground">
                    Estado actual: {getStatusBadge(selectedPurchase.admin_status, null)}
                  </p>
                  {selectedPurchase.reviewed_at && (
                    <p className="text-muted-foreground text-xs mt-1">
                      Revisado el {format(new Date(selectedPurchase.reviewed_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
