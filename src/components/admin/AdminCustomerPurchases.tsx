import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { API_ENDPOINTS, ApiResponse, API_BASE_URL } from '@/config/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShoppingCart, Eye, CheckCircle, XCircle, Search, FileText, User, Edit, Download, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { format, subHours, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface CuponInfo {
  id: number;
  codigo: string;
  estado: string;
  fechaGeneracion: string;
  fechaSorteo?: string;
}

interface Purchase {
  registroId: number;
  nombreCliente: string;
  ci: string;
  email: string;
  telefono: string;
  serialTv: string;
  modeloTv: string;
  tamanoTv: number;
  cantidadCupones: number;
  cupones: CuponInfo[];
  fechaRegistro: string;
  nombreVendedor: string;
  
  // New fields
  estado: string;
  fechaAprobacion?: string;
  tagPolizaPath?: string;
  polizaGarantiaPath?: string;
  notaVentaPath?: string;
  validadoGemini?: boolean;
  observacionesGemini?: string;
  erroresGemini?: string;
}

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

interface PurchaseUpdateData {
    nombre: string;
    ci: string;
    email: string;
    telefono: string;
    serialIngresado: string;
}

export default function AdminCustomerPurchases() {
  const queryClient = useQueryClient();
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isApproving, setIsApproving] = useState(false);

  // Form states for manual registration
  const [newVendorSale, setNewVendorSale] = useState({
      vendedorEmail: '',
      nombre: '',
      ci: '',
      email: '',
      telefono: '',
      serialIngresado: ''
  });

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<PurchaseUpdateData>({
      nombre: '',
      ci: '',
      email: '',
      telefono: '',
      serialIngresado: ''
  });

  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<string, string>>({});

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['admin-registros', page, pageSize, searchTerm, startDate, endDate], 
    queryFn: async () => {
      let url = `${API_ENDPOINTS.ADMIN.CLIENTES_CUPONES}?page=${page}&size=${pageSize}&tipo=CLIENTE&search=${searchTerm}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      
      const response = await apiService.get<PageResponse<Purchase>>(url);
      if (response.error) throw new Error(response.mensaje);
      
      const pageData = response.data;
      setTotalPages(pageData.totalPages);
      setTotalElements(pageData.totalElements);
      return pageData.content;
    }
  });

  const handleDownloadExcel = async () => {
      try {
          toast.info('Generando archivo Excel...');
          const success = await apiService.downloadBlob(
              API_ENDPOINTS.ADMIN.REGISTROS_EXPORTAR_EXCEL,
              `compras_clientes_${format(new Date(), 'dd-MM-yyyy')}.xlsx`
          );
          if (success) {
              toast.success('Archivo descargado correctamente');
          } else {
              toast.error('Error al descargar el archivo');
          }
      } catch (error) {
          toast.error('Error al descargar');
      }
  };

  const filteredPurchases = purchases;

  // Mutations
  const approveMutation = useMutation({
      mutationFn: async (id: number) => {
          const res = await apiService.put(`${API_ENDPOINTS.ADMIN.REGISTROS}/${id}/aprobar`);
          if (res.error) throw new Error(res.mensaje);
          return res.data;
      },
      onSuccess: () => {
          toast.success('Registro aprobado correctamente');
          queryClient.invalidateQueries({ queryKey: ['admin-registros'] });
          setSelectedPurchase(null);
      },
      onError: (e) => toast.error(e.message)
  });

  const rejectMutation = useMutation({
      mutationFn: async ({ id, motivo }: { id: number, motivo: string }) => {
          const res = await apiService.put(`${API_ENDPOINTS.ADMIN.REGISTROS}/${id}/rechazar`, { motivo });
          if (res.error) throw new Error(res.mensaje);
          return res.data;
      },
      onSuccess: () => {
          toast.success('Registro rechazado');
          queryClient.invalidateQueries({ queryKey: ['admin-registros'] });
          setSelectedPurchase(null);
      },
      onError: (e) => toast.error(e.message)
  });

  const updateMutation = useMutation({
      mutationFn: async ({ id, data }: { id: number, data: PurchaseUpdateData }) => {
          const res = await apiService.put(`${API_ENDPOINTS.ADMIN.REGISTROS}/${id}`, data);
          if (res.error) throw new Error(res.mensaje);
          return res.data;
      },
      onSuccess: () => {
          toast.success('Registro actualizado');
          queryClient.invalidateQueries({ queryKey: ['admin-registros'] });
          setIsEditOpen(false);
      },
      onError: (e) => toast.error(e.message)
  });

  const handleApprove = (id: number) => {
      approveMutation.mutate(id);
  };

  const handleReject = (id: number) => {
      if (!adminNotes.trim()) {
          toast.error('Por favor ingresa un motivo en las notas');
          return;
      }
      rejectMutation.mutate({ id, motivo: adminNotes });
  };

  const openEdit = (purchase: Purchase) => {
      setEditFormData({
          nombre: purchase.nombreCliente,
          ci: purchase.ci,
          email: purchase.email,
          telefono: purchase.telefono,
          serialIngresado: purchase.serialTv 
      });
      setSelectedPurchase(purchase);
      setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
      if (selectedPurchase) {
          updateMutation.mutate({ id: selectedPurchase.registroId, data: editFormData });
      }
  };

  // Helper to fix timezone issue (Server sending UTC, we want Bolivia GMT-4)
  // If user sees +8 hours, we need to adjust.
  // Ideally, parsing ISO string correctly handles it, but if the server sends "2026-01-23T02:21" (UTC shifted) instead of Z, we patch it.
  const formatBoliviaTime = (dateString: string) => {
    if (!dateString) return '-';
    try {
        // Parse the date. If it's already in UTC but showing as local + 4, we might need to subtract.
        // For now, let's assume standard ISO.
        const date = new Date(dateString);
        // Force Bolivia Time (GMT-4)
        // If the visual error is +4 hours (from 22 to 02 is +4), we substract 4.
        // If it is +8 hours (from 18 to 02), we substract 8.
        // Let's try standard formatting first with explicit UTC handling.
        return format(date, 'dd/MM/yy HH:mm');
    } catch (e) {
        return dateString;
    }
  };

  // Cargar imágenes como blobs cuando se abre el modal de detalle
  useEffect(() => {
    if (selectedPurchase && !isEditOpen) {
      const loadImages = async () => {
        const types = ['tag_poliza', 'poliza_garantia', 'nota_venta'];
        
        // Cargar todas las imágenes en paralelo para mayor velocidad
        const promises = types.map(async (type) => {
          try {
            const url = `${API_BASE_URL}/api/registro/${selectedPurchase.registroId}/imagen/${type}`;
            const response = await fetch(url);
            if (response.ok) {
              const blob = await response.blob();
              return { type, url: URL.createObjectURL(blob) };
            }
          } catch (error) {
            console.error(`Error loading ${type}:`, error);
          }
          return null;
        });

        const results = await Promise.all(promises);
        const urls: Record<string, string> = {};
        results.forEach(result => {
          if (result) {
            urls[result.type] = result.url;
          }
        });
        setImageBlobUrls(urls);
      };
      loadImages();
    } else {
      // Limpiar URLs cuando se cierra el modal
      Object.values(imageBlobUrls).forEach(url => URL.revokeObjectURL(url));
      setImageBlobUrls({});
    }
  }, [selectedPurchase, isEditOpen]);

  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'APROBADO': return <Badge className="bg-green-500">Aprobado</Badge>;
        case 'RECHAZADO': return <Badge variant="destructive">Rechazado</Badge>;
        case 'PENDIENTE': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendiente</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-primary" />
          Compras de Clientes
        </h1>
        <Button 
            onClick={handleDownloadExcel}
            className="flex items-center gap-2"
        >
            <Download className="h-4 w-4" />
            Descargar Datos
        </Button>
      </div>

      {/* Search Bar & Date Filters */}
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-5xl">
        <div className="relative flex-grow">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input
                placeholder="Buscar por cliente, CI o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg bg-background border-border shadow-sm"
            />
        </div>
        
        <div className="flex gap-2 items-center">
            <span className="text-sm font-medium whitespace-nowrap">Desde:</span>
            <Input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-12 w-auto bg-background border-border shadow-sm"
            />
        </div>

        <div className="flex gap-2 items-center">
            <span className="text-sm font-medium whitespace-nowrap">Hasta:</span>
             <Input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-12 w-auto bg-background border-border shadow-sm"
            />
        </div>
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
                <TableHead className="text-muted-foreground">Serial</TableHead>
                <TableHead className="text-muted-foreground">Cupones</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filteredPurchases.length > 0 ? (
                filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.registroId} className="border-border">
                    <TableCell className="text-foreground">
                      {format(new Date(purchase.fechaRegistro), 'dd/MM/yy HH:mm')}
                    </TableCell>
                    <TableCell className="text-foreground">
                      <div>
                        <p className="font-medium">{purchase.nombreCliente}</p>
                        <p className="text-muted-foreground text-xs">{purchase.ci}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                       {purchase.modeloTv} ({purchase.tamanoTv}")
                    </TableCell>
                    <TableCell className="text-foreground font-mono text-sm">
                      {purchase.serialTv}
                    </TableCell>
                    <TableCell className="text-foreground">
                      <Badge variant="secondary">{purchase.cantidadCupones}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(purchase.estado || 'PENDIENTE')}
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => {
                          setSelectedPurchase(purchase);
                          setAdminNotes(purchase.observacionesGemini || '');
                      }}>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(purchase)}>
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay registros encontrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 py-4 border-t border-border bg-muted/50">
                <div className="text-sm text-foreground font-medium">
                    Mostrando <span className="text-primary">{filteredPurchases.length}</span> de <span className="text-primary">{totalElements}</span> resultados (Página {page + 1} de {totalPages})
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

      {/* Detail Dialog */}
      <Dialog 
        open={!!selectedPurchase && !isEditOpen && !zoomedImageUrl} 
        onOpenChange={(open) => {
          if (!open && !zoomedImageUrl) {
            setSelectedPurchase(null);
          }
        }}
      >
        <DialogContent className="bg-muted border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <User className="h-5 w-5" />
              Detalle de Reserva / Compra
            </DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Cliente</p>
                  <p className="text-foreground font-medium">{selectedPurchase.nombreCliente}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">CI</p>
                  <p className="text-foreground font-medium">{selectedPurchase.ci}</p>
                </div>
                 <div>
                  <p className="text-muted-foreground text-sm">Email</p>
                  <p className="text-foreground font-medium">{selectedPurchase.email}</p>
                </div>
                 <div>
                  <p className="text-muted-foreground text-sm">Teléfono</p>
                  <p className="text-foreground font-medium">{selectedPurchase.telefono}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                 <div>
                  <p className="text-muted-foreground text-sm">Producto</p>
                  <p className="text-foreground font-medium">{selectedPurchase.modeloTv} ({selectedPurchase.tamanoTv}")</p>
                </div>
                 <div>
                  <p className="text-muted-foreground text-sm">Serial</p>
                  <p className="text-foreground font-medium">{selectedPurchase.serialTv}</p>
                </div>
              </div>

               {/* IA/Gemini Info */}
               <div className="pt-4 border-t border-border">
                  <p className="text-muted-foreground text-sm mb-2">Validación IA</p>
                    <div className="flex gap-2 items-center">
                        <Badge variant={selectedPurchase.validadoGemini ? "secondary" : "destructive"}>
                            {selectedPurchase.validadoGemini ? "Válido" : "Inválido / No verificado"}
                        </Badge>
                    </div>
                    {selectedPurchase.observacionesGemini && (
                         <p className="text-xs text-muted-foreground mt-2 bg-background p-2 rounded">
                             {selectedPurchase.observacionesGemini}
                         </p>
                    )}
               </div>

                {/* Documents Preview */}
               <div className="pt-4 border-t border-border">
                  <p className="text-muted-foreground text-sm mb-4">Documentos Adjuntos</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                          { label: 'Tag Póliza', path: selectedPurchase.tagPolizaPath, type: 'tag_poliza' },
                          { label: 'Póliza Garantía', path: selectedPurchase.polizaGarantiaPath, type: 'poliza_garantia' },
                          { label: 'Nota Venta', path: selectedPurchase.notaVentaPath, type: 'nota_venta' }
                      ].map((doc, idx) => (
                          <div key={idx} className="border border-border rounded-lg p-3 bg-card flex flex-col items-center gap-3">
                              <span className="text-xs font-medium text-foreground">{doc.label}</span>
                              {doc.path ? (
                                  <>
                                      <div className="relative w-full aspect-video bg-muted rounded overflow-hidden group cursor-pointer"
                                           onClick={() => {
                                               const blobUrl = imageBlobUrls[doc.type];
                                               if (blobUrl) setZoomedImageUrl(blobUrl);
                                           }}
                                      >
                                          <img 
                                              src={imageBlobUrls[doc.type] || 'https://placehold.co/400x300?text=Cargando...'} 
                                              alt={doc.label}
                                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                              onError={(e) => {
                                                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=No+Image';
                                              }}
                                          />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                              <Eye className="w-6 h-6 text-white" />
                                          </div>
                                      </div>
                                      <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="w-full text-xs"
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              const blobUrl = imageBlobUrls[doc.type];
                                              if (blobUrl) {
                                                  window.open(blobUrl, '_blank');
                                              } else {
                                                  toast.error('Imagen no disponible');
                                              }
                                          }}
                                      >
                                          <Eye className="w-3 h-3 mr-2" />
                                          Ver Imagen
                                      </Button>
                                  </>
                              ) : (
                                  <div className="w-full aspect-video bg-muted/50 rounded flex flex-col items-center justify-center text-muted-foreground gap-2">
                                      <FileText className="w-8 h-8 opacity-20" />
                                      <span className="text-xs">No disponible</span>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
               </div>

              {/* Admin Actions */}
              <div className="pt-4 border-t border-border">
                
                {selectedPurchase.estado === 'PENDIENTE' && (
                    <div className="flex gap-4">
                        <Button 
                            variant="destructive" 
                            className="flex-1"
                            onClick={() => handleReject(selectedPurchase.registroId)}
                            disabled={rejectMutation.isPending}
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            Rechazar
                        </Button>
                        <Button 
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(selectedPurchase.registroId)}
                            disabled={approveMutation.isPending}
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aprobar
                        </Button>
                    </div>
                )}
                 {selectedPurchase.estado !== 'PENDIENTE' && (
                     <p className="text-center text-muted-foreground">
                         Este registro ya está {selectedPurchase.estado}
                     </p>
                 )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-muted border-border max-w-lg">
            <DialogHeader>
                <DialogTitle className="text-foreground">Editar Datos del Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Nombre Completo</Label>
                    <Input 
                        value={editFormData.nombre}
                        onChange={e => setEditFormData({...editFormData, nombre: e.target.value})}
                        className="bg-background border-border"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Carnet Identidad</Label>
                    <Input 
                        value={editFormData.ci}
                        onChange={e => setEditFormData({...editFormData, ci: e.target.value})}
                        className="bg-background border-border"
                    />
                </div>
                 <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                        value={editFormData.email}
                        onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                        className="bg-background border-border"
                    />
                </div>
                 <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input 
                        value={editFormData.telefono}
                        onChange={e => setEditFormData({...editFormData, telefono: e.target.value})}
                        className="bg-background border-border"
                    />
                </div>
                {/* Serial editing disabled for safety in this version, or enable if needed */}
                 <div className="space-y-2">
                    <Label>Serial (Cuidado: Validar antes de cambiar)</Label>
                    <Input 
                        value={editFormData.serialIngresado}
                        onChange={e => setEditFormData({...editFormData, serialIngresado: e.target.value})}
                        className="bg-background border-border"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    
      {/* Lightbox with Zoom and Drag */}
      <Dialog 
        open={!!zoomedImageUrl} 
        onOpenChange={(open) => {
            if (!open) {
                setZoomedImageUrl(null);
                setIsZoomed(false);
                setDragOffset({ x: 0, y: 0 });
            }
        }}
      >
        <DialogContent 
            className="max-w-[100vw] max-h-[100vh] h-screen w-screen bg-black/95 border-none shadow-none p-0 flex items-center justify-center [&>button]:hidden outline-none overflow-auto"
            onClick={() => {
                if (!isZoomed) {
                    setZoomedImageUrl(null);
                    setIsZoomed(false);
                    setDragOffset({ x: 0, y: 0 });
                }
            }}
        >
            <div 
                className="relative select-none"
                onClick={(e) => e.stopPropagation()}
            >
                {zoomedImageUrl && (
                    <img 
                        src={zoomedImageUrl} 
                        alt="Zoomed document" 
                        className={`
                            object-contain rounded-md shadow-2xl transition-all duration-300 ease-in-out
                            ${isZoomed 
                                ? "cursor-grab active:cursor-grabbing max-w-none h-auto" 
                                : "cursor-zoom-in max-w-[90vw] max-h-[90vh] w-auto h-auto"
                            }
                        `}
                        style={isZoomed ? { 
                            width: '150%',
                            transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`
                        } : {}}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isZoomed) {
                                setIsZoomed(true);
                                setDragOffset({ x: 0, y: 0 });
                            }
                        }}
                        onMouseDown={(e) => {
                            if (isZoomed) {
                                e.preventDefault();
                                setDragStart({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
                            }
                        }}
                        onMouseMove={(e) => {
                            if (isZoomed && dragStart) {
                                setDragOffset({
                                    x: e.clientX - dragStart.x,
                                    y: e.clientY - dragStart.y
                                });
                            }
                        }}
                        onMouseUp={() => {
                            if (isZoomed) {
                                setDragStart(null);
                            }
                        }}
                        onMouseLeave={() => {
                            if (isZoomed) {
                                setDragStart(null);
                            }
                        }}
                        draggable={false}
                    />
                )}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex gap-3">
                    {isZoomed && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsZoomed(false);
                                setDragOffset({ x: 0, y: 0 });
                            }}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/20 shadow-lg flex items-center gap-2"
                        >
                            Alejar Zoom
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImageUrl(null);
                            setIsZoomed(false);
                            setDragOffset({ x: 0, y: 0 });
                        }}
                        className="px-6 py-3 bg-red-500/50 hover:bg-red-600/50 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/20 shadow-lg flex items-center gap-2"
                    >
                        <XCircle className="h-5 w-5" />
                        Cerrar
                    </button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
