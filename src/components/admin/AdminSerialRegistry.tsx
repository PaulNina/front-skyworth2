import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { API_ENDPOINTS } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { HardDrive, Plus, Upload, Search, Trash2, Pencil, FileSpreadsheet, Download, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Product {
  id: number;
  nombre: string;
  modelo: string;
  tamanoPulgadas: number; // Replaces screen_size
  multiplicadorCupones: number; // Replaces ticket_multiplier
}

interface SerialRegistry {
  id: number;
  numeroSerie: string;
  producto?: Product;
  container?: string;
  seal?: string;
  hojaRegistro?: string;
  invoice?: string;
  dateInvoice?: string;
  bloqueado: boolean;
  motivoBloqueo?: string;
  fechaRegistroVendedor?: string;
  registroComprador?: {
    id: number;
    nombre: string;
    fechaRegistro: string;
  };
  registroVendedor?: {
    id: number;
    estado: string;
    vendedor?: {
      nombre: string;
    };
  };
}

interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

interface SerialStats {
  total: number;
  disponibles: number;
  usados: number;
  blocked?: number;
}

interface ImportPreviewRow {
  raw: string;
}

const STATUSES = ['AVAILABLE', 'USED', 'BLOCKED'];

export default function AdminSerialRegistry() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSerial, setEditingSerial] = useState<SerialRegistry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[] | null>(null);
  const [formData, setFormData] = useState({
    numeroSerie: '',
    productoId: '',
    container: '',
    seal: '',
    hojaRegistro: '',
    invoice: '',
    dateInvoice: '',
    bloqueado: false,
    motivoBloqueo: ''
  });

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Fetch serials with server-side pagination and filtering
  const { data: serialsPage, isLoading } = useQuery({
    queryKey: ['admin-serial-registry', page, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      // Send filters to server
      const response = await apiService.get<Page<SerialRegistry>>(
        `${API_ENDPOINTS.ADMIN.SERIALES}?page=${page}&size=${pageSize}&search=${searchTerm}&status=${statusFilter}`
      );
      return response.data;
    }
  });

  const serials = serialsPage?.content || [];
  const totalPages = serialsPage?.totalPages || 0;
  const totalElements = serialsPage?.totalElements || 0;

  // Client-side filtering is no longer needed as backend handles it.
  const filteredSerials = serials; // Direct assignment for compatibility with below code

  // Fetch products for dropdown
  const { data: products } = useQuery({
    queryKey: ['admin-products-list'],
    queryFn: async () => {
      const response = await apiService.get<Product[]>(API_ENDPOINTS.ADMIN.PRODUCTOS);
      return response.data;
    }
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin-serial-stats'],
    queryFn: async () => {
       const response = await apiService.get<SerialStats>(API_ENDPOINTS.ADMIN.SERIALES_ESTADISTICAS);
       return response.data;
    }
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<SerialRegistry> & { productoId: number | null }) => {
      let response;
      if (editingSerial) {
        response = await apiService.put<SerialRegistry>(`${API_ENDPOINTS.ADMIN.SERIALES}/${editingSerial.id}`, data);
      } else {
        response = await apiService.post<SerialRegistry>(API_ENDPOINTS.ADMIN.SERIALES, data);
      }
      
      if (response.error) {
        throw new Error(response.mensaje);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-serial-registry'] });
      queryClient.invalidateQueries({ queryKey: ['admin-serial-stats'] });
      toast.success(editingSerial ? 'Serial actualizado' : 'Serial creado');
      closeDialog();
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiService.delete<string>(`${API_ENDPOINTS.ADMIN.SERIALES}/${id}`);
      if (response.error) {
        throw new Error(response.mensaje);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-serial-registry'] });
      queryClient.invalidateQueries({ queryKey: ['admin-serial-stats'] });
      toast.success('Serial eliminado');
    },
    onError: (error: Error) => {
        toast.error('Error: ' + error.message);
    }
  });

  // Bulk import mutation (Multipart)
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('archivo', file);
      // Use postFormData instead of post
      const response = await apiService.postFormData<string>(API_ENDPOINTS.ADMIN.SERIALES_CARGAR_CSV, formData);
      
      if (response.error) {
        throw new Error(response.mensaje);
      }
      return response.data; 
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-serial-registry'] });
      queryClient.invalidateQueries({ queryKey: ['admin-serial-stats'] });
      toast.success(data || 'Importación exitosa');
      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error: Error) => {
      toast.error('Error en importación: ' + error.message);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSerial(null);
    setFormData({
      numeroSerie: '',
      productoId: '',
      container: '',
      seal: '',
      hojaRegistro: '',
      invoice: '',
      dateInvoice: '',
      bloqueado: false,
      motivoBloqueo: ''
    });
  };

  const openEdit = (serial: SerialRegistry) => {
    setEditingSerial(serial);
    setFormData({
      numeroSerie: serial.numeroSerie,
      productoId: serial.producto?.id.toString() || '',
      container: serial.container || '',
      seal: serial.seal || '',
      hojaRegistro: serial.hojaRegistro || '',
      invoice: serial.invoice || '',
      dateInvoice: serial.dateInvoice ? serial.dateInvoice.split('T')[0] : '', // Extract YYYY-MM-DD
      bloqueado: serial.bloqueado,
      motivoBloqueo: serial.motivoBloqueo || ''
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      numeroSerie: formData.numeroSerie.trim().toUpperCase(),
      productoId: formData.productoId ? parseInt(formData.productoId) : null,
      container: formData.container,
      seal: formData.seal,
      hojaRegistro: formData.hojaRegistro,
      invoice: formData.invoice,
      dateInvoice: formData.dateInvoice || null,
      bloqueado: formData.bloqueado,
      motivoBloqueo: formData.motivoBloqueo
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // We send directly to backend, but maybe show confirmation first? 
    // Backend returns count. For simplicity, we just trigger mutation on confirm or direct?
    // User flow: select file -> parse locally for preview? 
    // Backend logic handles the heavy lifting. Parsing locally might differ from backend.
    // Let's just confirm and send.
    // Or parse first few lines for preview.
    
    setImporting(true);
    // basic preview
    try {
        const text = await file.text();
        const lines = text.split('\n').slice(0, 6); // Preview first 5 lines
        setImportPreview(lines.map(l => ({ raw: l })));
    } catch(e) {/* ignore */}
    setImporting(false);
  };

  const confirmImport = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
        importMutation.mutate(file);
    }
  };

  const handleDownloadTemplate = () => {
    // CSV Header matching backend expectation: numero_serie, modelo, inches, container, seal, hoja_registro, invoice, date_invoice
    const headers = ['numero_serie', 'modelo', 'pulgadas', 'container', 'seal', 'hoja_registro', 'invoice', 'date_invoice'];
    const sampleRow = ['2560345M00000', 'G6600H', '60', 'CONT-001', 'SEAL-99', 'HR-2024-001', 'INV-555', '2024-01-01'];
    
    const csvContent = [
        headers.join(','),
        sampleRow.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_seriales.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    toast.info('Generando reporte... Esto puede tomar un momento.');
    
    try {
        const success = await apiService.downloadBlob(
          API_ENDPOINTS.ADMIN.SERIALES_EXPORTAR_EXCEL,
          `seriales_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
        );
        if (success) {
            toast.success('Archivo descargado correctamente');
        } else {
            toast.error('Error al descargar el archivo');
        }
    } catch (error) {
        toast.error('Error al descargar el archivo');
    } finally {
        setIsExporting(false);
    }
  };

  const getStatusBadge = (serial: SerialRegistry) => {
    if (serial.bloqueado) return <Badge variant="destructive">Bloqueado</Badge>;
    if (serial.registroComprador) return <Badge variant="secondary">Usado</Badge>;
    return <Badge className="bg-green-500 hover:bg-green-600">Disponible</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <HardDrive className="h-8 w-8 text-primary" />
          Registro de Seriales
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadExcel} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {isExporting ? 'Generando...' : 'Descargar datos'}
          </Button>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Descargar Plantilla
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
            <DialogContent className="bg-muted border-border max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editingSerial ? 'Editar Serial' : 'Nuevo Serial'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label className="text-foreground">Número de Serie *</Label>
                    <Input
                        value={formData.numeroSerie}
                        onChange={(e) => setFormData({ ...formData, numeroSerie: e.target.value })}
                        placeholder="SN123456789"
                        required
                        className="bg-background border-border text-foreground uppercase"
                    />
                    </div>
                    <div className="space-y-2">
                    <Label className="text-foreground">Producto</Label>
                    <Select 
                        value={formData.productoId || "__none__"} 
                        onValueChange={(v) => v === "__none__" ? setFormData({ ...formData, productoId: '' }) : setFormData({ ...formData, productoId: v })}
                    >
                        <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent className="bg-muted border-border">
                        <SelectItem value="__none__" className="text-foreground">Sin producto</SelectItem>
                        {products?.map(product => (
                            <SelectItem key={product.id} value={product.id.toString()} className="text-foreground">
                            {product.modelo}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-foreground">Container</Label>
                        <Input value={formData.container} onChange={(e) => setFormData({...formData, container: e.target.value})} className="bg-background text-foreground" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-foreground">Seal</Label>
                        <Input value={formData.seal} onChange={(e) => setFormData({...formData, seal: e.target.value})} className="bg-background text-foreground" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-foreground">Hoja Registro</Label>
                        <Input value={formData.hojaRegistro} onChange={(e) => setFormData({...formData, hojaRegistro: e.target.value})} className="bg-background text-foreground" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-foreground">Invoice</Label>
                        <Input value={formData.invoice} onChange={(e) => setFormData({...formData, invoice: e.target.value})} className="bg-background text-foreground" />
                    </div>
                     <div className="space-y-2">
                        <Label className="text-foreground">Fecha Invoice</Label>
                        <Input type="date" value={formData.dateInvoice} onChange={(e) => setFormData({...formData, dateInvoice: e.target.value})} className="bg-background text-foreground" />
                    </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="bloqueado"
                        checked={formData.bloqueado}
                        onChange={(e) => setFormData({...formData, bloqueado: e.target.checked})}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="bloqueado" className="text-foreground">Bloqueado</Label>
                  </div>
                  {formData.bloqueado && (
                      <Input 
                        placeholder="Motivo del bloqueo" 
                        value={formData.motivoBloqueo} 
                        onChange={(e) => setFormData({...formData, motivoBloqueo: e.target.value})}
                        className="mt-2"
                      />
                  )}
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
              <p className="text-3xl font-bold text-secondary">{stats?.disponibles || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Usados</p>
              <p className="text-3xl font-bold text-blue-400">{stats?.usados || 0}</p>
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
              Confirmar Importación
            </CardTitle>
            <CardDescription>
              Vista previa de las primeras líneas del archivo:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-60 overflow-auto rounded border border-border p-4 font-mono text-sm bg-black/50 text-white">
               {importPreview.map((line, i) => (
                   <div key={i} className="whitespace-pre-wrap">{line.raw}</div>
               ))}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => {setImportPreview(null); if(fileInputRef.current) fileInputRef.current.value = '';}} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-orange-500">
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
            placeholder="Buscar por número de serie o modelo..."
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
            <SelectItem value="AVAILABLE" className="text-foreground">Disponible</SelectItem>
            <SelectItem value="USED" className="text-foreground">Usado</SelectItem>
            <SelectItem value="BLOCKED" className="text-foreground">Bloqueado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-muted border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground transition-colors hover:text-primary">Serial</TableHead>
                <TableHead className="text-muted-foreground transition-colors hover:text-primary">Modelo</TableHead>
                <TableHead className="text-muted-foreground transition-colors hover:text-primary">Producto</TableHead>
                <TableHead className="text-muted-foreground transition-colors hover:text-primary">Estado</TableHead>
                <TableHead className="text-muted-foreground transition-colors hover:text-primary">Comprador</TableHead>
                <TableHead className="text-muted-foreground transition-colors hover:text-primary">Vendedor</TableHead>
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
              ) : filteredSerials && filteredSerials.length > 0 ? (
                filteredSerials.map((serial: SerialRegistry) => (
                  <TableRow key={serial.id} className="border-border group hover:bg-muted/50 transition-colors">
                    <TableCell className="text-foreground font-mono font-medium">{serial.numeroSerie}</TableCell>
                    <TableCell className="text-foreground">{serial.producto?.modelo || '-'}</TableCell>
                    <TableCell className="text-foreground/80 text-sm">{serial.producto?.nombre || '-'}</TableCell>
                    <TableCell>{getStatusBadge(serial)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {serial.registroComprador ? (
                        <div className="flex flex-col">
                            <span className="text-blue-400">{serial.registroComprador.nombre}</span>
                            <span className="text-[10px]">{serial.registroComprador.fechaRegistro ? format(new Date(serial.registroComprador.fechaRegistro), 'dd/MM/yy') : ''}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {serial.registroVendedor ? (
                        <div className="flex flex-col">
                            <span className="text-orange-400">{serial.registroVendedor.vendedor?.nombre || 'Vendedor'}</span>
                            <span className="text-[10px]">{serial.fechaRegistroVendedor ? format(new Date(serial.fechaRegistroVendedor), 'dd/MM/yy HH:mm') : '-'}</span>
                        </div>
                      ) : '-'}
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
                        disabled={!!serial.registroComprador}
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
        
        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-4 border-t border-border bg-muted/50">
            <div className="flex items-center gap-4 text-sm text-foreground font-medium">
              <span>Mostrando <span className="text-primary">{filteredSerials.length}</span> de <span className="text-primary">{totalElements}</span> resultados (Página {page + 1} de {totalPages})</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Filas:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setPage(0); // Reset to first page on size change
                  }}
                >
                  <SelectTrigger className="h-8 w-16 bg-background border-border text-foreground">
                    <SelectValue placeholder={pageSize.toString()} />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    {[10, 20, 50, 100].map(size => (
                      <SelectItem key={size} value={size.toString()} className="text-foreground">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0 || isLoading}
                    className="text-foreground border-border hover:bg-secondary/20"
                >
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1 || isLoading}
                    className="text-foreground border-border hover:bg-secondary/20"
                >
                    Siguiente
                </Button>
            </div>
        </div>
      </Card>
    </div>
  );
}
