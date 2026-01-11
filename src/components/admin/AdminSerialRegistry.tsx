import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { HardDrive, Plus, Upload, Search, Trash2, Pencil, FileSpreadsheet, Download, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type SerialRegistry = Tables<'tv_serial_registry'> & {
  products?: { model_name: string } | null;
};

const TIERS = ['BASIC', 'PREMIUM', 'ULTRA'];
const STATUSES = ['AVAILABLE', 'USED', 'BLOCKED'];

export default function AdminSerialRegistry() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSerial, setEditingSerial] = useState<SerialRegistry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [formData, setFormData] = useState({
    serial_number: '',
    product_id: '',
    tier: 'BASIC',
    ticket_multiplier: 1,
    status: 'AVAILABLE'
  });

  // Fetch serials
  const { data: serials, isLoading } = useQuery({
    queryKey: ['admin-serial-registry', searchTerm, statusFilter, tierFilter],
    queryFn: async () => {
      let query = supabase
        .from('tv_serial_registry')
        .select('*, products(model_name)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (tierFilter !== 'all') {
        query = query.eq('tier', tierFilter);
      }
      if (searchTerm) {
        query = query.ilike('serial_number', `%${searchTerm}%`);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data as SerialRegistry[];
    }
  });

  // Fetch products for dropdown
  const { data: products } = useQuery({
    queryKey: ['admin-products-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, model_name, tier, ticket_multiplier')
        .eq('is_active', true)
        .order('model_name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin-serial-stats'],
    queryFn: async () => {
      const [
        { count: total },
        { count: available },
        { count: used },
        { count: blocked }
      ] = await Promise.all([
        supabase.from('tv_serial_registry').select('*', { count: 'exact', head: true }),
        supabase.from('tv_serial_registry').select('*', { count: 'exact', head: true }).eq('status', 'AVAILABLE'),
        supabase.from('tv_serial_registry').select('*', { count: 'exact', head: true }).eq('status', 'USED'),
        supabase.from('tv_serial_registry').select('*', { count: 'exact', head: true }).eq('status', 'BLOCKED')
      ]);
      return {
        total: total || 0,
        available: available || 0,
        used: used || 0,
        blocked: blocked || 0
      };
    }
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TablesInsert<'tv_serial_registry'>) => {
      if (editingSerial) {
        const { error } = await supabase
          .from('tv_serial_registry')
          .update(data)
          .eq('id', editingSerial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tv_serial_registry')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-serial-registry'] });
      queryClient.invalidateQueries({ queryKey: ['admin-serial-stats'] });
      toast.success(editingSerial ? 'Serial actualizado' : 'Serial creado');
      closeDialog();
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Este número de serie ya existe');
      } else {
        toast.error('Error: ' + error.message);
      }
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tv_serial_registry')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-serial-registry'] });
      queryClient.invalidateQueries({ queryKey: ['admin-serial-stats'] });
      toast.success('Serial eliminado');
    },
    onError: (error) => toast.error('Error: ' + error.message)
  });

  // Bulk import mutation
  const importMutation = useMutation({
    mutationFn: async (records: TablesInsert<'tv_serial_registry'>[]) => {
      const { error } = await supabase
        .from('tv_serial_registry')
        .insert(records);
      if (error) throw error;
      return records.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-serial-registry'] });
      queryClient.invalidateQueries({ queryKey: ['admin-serial-stats'] });
      toast.success(`${count} seriales importados correctamente`);
      setImportPreview(null);
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Algunos seriales ya existen en el sistema');
      } else {
        toast.error('Error en importación: ' + error.message);
      }
    }
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSerial(null);
    setFormData({
      serial_number: '',
      product_id: '',
      tier: 'BASIC',
      ticket_multiplier: 1,
      status: 'AVAILABLE'
    });
  };

  const openEdit = (serial: SerialRegistry) => {
    setEditingSerial(serial);
    setFormData({
      serial_number: serial.serial_number,
      product_id: serial.product_id || '',
      tier: serial.tier,
      ticket_multiplier: serial.ticket_multiplier,
      status: serial.status
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      serial_number: formData.serial_number.trim().toUpperCase(),
      product_id: formData.product_id || null,
      tier: formData.tier,
      ticket_multiplier: formData.ticket_multiplier,
      status: formData.status
    });
  };

  const handleProductSelect = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      setFormData({
        ...formData,
        product_id: productId,
        tier: product.tier,
        ticket_multiplier: product.ticket_multiplier || 1
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Parse CSV - expected format: serial_number,tier,ticket_multiplier,product_id (optional)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const serialIdx = headers.indexOf('serial_number') !== -1 ? headers.indexOf('serial_number') : 0;
      const tierIdx = headers.indexOf('tier') !== -1 ? headers.indexOf('tier') : 1;
      const multiplierIdx = headers.indexOf('ticket_multiplier') !== -1 ? headers.indexOf('ticket_multiplier') : 2;
      const productIdx = headers.indexOf('product_id');

      const records = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
          serial_number: values[serialIdx]?.toUpperCase() || '',
          tier: TIERS.includes(values[tierIdx]?.toUpperCase()) ? values[tierIdx].toUpperCase() : 'BASIC',
          ticket_multiplier: parseInt(values[multiplierIdx]) || 1,
          product_id: productIdx !== -1 && values[productIdx] ? values[productIdx] : null,
          status: 'AVAILABLE' as const
        };
      }).filter(r => r.serial_number);

      setImportPreview(records);
    } catch (err) {
      toast.error('Error al leer el archivo CSV');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const confirmImport = () => {
    if (importPreview && importPreview.length > 0) {
      importMutation.mutate(importPreview);
    }
  };

  const downloadTemplate = () => {
    const csv = 'serial_number,tier,ticket_multiplier\nSN123456789,BASIC,1\nSN987654321,PREMIUM,2\nSN555666777,ULTRA,3';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seriales_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge className="bg-secondary text-secondary-foreground">Disponible</Badge>;
      case 'USED':
        return <Badge variant="outline" className="text-muted-foreground">Usado</Badge>;
      case 'BLOCKED':
        return <Badge variant="destructive">Bloqueado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'ULTRA':
        return <Badge className="bg-yellow-500 text-black">ULTRA</Badge>;
      case 'PREMIUM':
        return <Badge className="bg-blue-500 text-white">PREMIUM</Badge>;
      default:
        return <Badge variant="secondary">BASIC</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <HardDrive className="h-8 w-8 text-primary" />
          Registro de Seriales
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Plantilla CSV
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Serial
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-muted border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editingSerial ? 'Editar Serial' : 'Nuevo Serial'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Número de Serie *</Label>
                  <Input
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="SN123456789"
                    required
                    className="bg-background border-border text-foreground uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Producto (opcional)</Label>
                  <Select value={formData.product_id} onValueChange={handleProductSelect}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border">
                      <SelectItem value="" className="text-foreground">Sin producto</SelectItem>
                      {products?.map(product => (
                        <SelectItem key={product.id} value={product.id} className="text-foreground">
                          {product.model_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Tier</Label>
                    <Select value={formData.tier} onValueChange={(v) => setFormData({ ...formData, tier: v })}>
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-border">
                        {TIERS.map(tier => (
                          <SelectItem key={tier} value={tier} className="text-foreground">{tier}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Multiplicador Tickets</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={formData.ticket_multiplier}
                      onChange={(e) => setFormData({ ...formData, ticket_multiplier: parseInt(e.target.value) || 1 })}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Estado</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border">
                      {STATUSES.map(status => (
                        <SelectItem key={status} value={status} className="text-foreground">{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={closeDialog} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending} className="flex-1 bg-primary text-primary-foreground">
                    {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total</p>
              <p className="text-3xl font-bold text-foreground">{stats?.total || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Disponibles</p>
              <p className="text-3xl font-bold text-secondary">{stats?.available || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Usados</p>
              <p className="text-3xl font-bold text-muted-foreground">{stats?.used || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Bloqueados</p>
              <p className="text-3xl font-bold text-destructive">{stats?.blocked || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Preview */}
      {importPreview && (
        <Card className="bg-secondary/20 border-secondary">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-secondary" />
              Vista Previa de Importación
            </CardTitle>
            <CardDescription>
              Se importarán {importPreview.length} seriales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-60 overflow-auto rounded border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Serial</TableHead>
                    <TableHead className="text-muted-foreground">Tier</TableHead>
                    <TableHead className="text-muted-foreground">Multiplicador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreview.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx} className="border-border">
                      <TableCell className="text-foreground font-mono">{row.serial_number}</TableCell>
                      <TableCell>{getTierBadge(row.tier)}</TableCell>
                      <TableCell className="text-foreground">{row.ticket_multiplier}x</TableCell>
                    </TableRow>
                  ))}
                  {importPreview.length > 10 && (
                    <TableRow className="border-border">
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        ... y {importPreview.length - 10} más
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setImportPreview(null)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={confirmImport} 
                disabled={importMutation.isPending}
                className="flex-1 bg-secondary text-secondary-foreground"
              >
                {importMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Confirmar Importación
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de serie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background border-border text-foreground"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-background border-border text-foreground">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border">
            <SelectItem value="all" className="text-foreground">Todos</SelectItem>
            {STATUSES.map(status => (
              <SelectItem key={status} value={status} className="text-foreground">{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-40 bg-background border-border text-foreground">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border">
            <SelectItem value="all" className="text-foreground">Todos</SelectItem>
            {TIERS.map(tier => (
              <SelectItem key={tier} value={tier} className="text-foreground">{tier}</SelectItem>
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
                <TableHead className="text-muted-foreground">Serial</TableHead>
                <TableHead className="text-muted-foreground">Producto</TableHead>
                <TableHead className="text-muted-foreground">Tier</TableHead>
                <TableHead className="text-muted-foreground">Tickets</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground">Registrado</TableHead>
                <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : serials && serials.length > 0 ? (
                serials.map((serial) => (
                  <TableRow key={serial.id} className="border-border">
                    <TableCell className="text-foreground font-mono">{serial.serial_number}</TableCell>
                    <TableCell className="text-foreground">{serial.products?.model_name || '-'}</TableCell>
                    <TableCell>{getTierBadge(serial.tier)}</TableCell>
                    <TableCell className="text-foreground">{serial.ticket_multiplier}x</TableCell>
                    <TableCell>{getStatusBadge(serial.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {serial.registered_at 
                        ? format(new Date(serial.registered_at), 'dd/MM/yy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(serial)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('¿Eliminar este serial?')) {
                            deleteMutation.mutate(serial.id);
                          }
                        }}
                        disabled={serial.status === 'USED'}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay seriales registrados. Importa un CSV o crea uno manualmente.
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
