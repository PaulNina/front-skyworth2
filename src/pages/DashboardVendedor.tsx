/**
 * Dashboard Vendedor - Skyworth Mundial 2026
 * 
 * Migrated from Supabase to custom backend API
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/services/apiService';
import { API_ENDPOINTS, ApiResponse } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Trophy, Store, TrendingUp, Package, Plus, LogOut, 
  Loader2, Calendar, User, Phone, Award, AlertTriangle, RefreshCw, Home, CheckCircle, Info, Search, ChevronLeft, ChevronRight, Eye, XCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface VendedorData {
  id: number;
  nombre: string;
  ci: string;
  tienda: string;
  ciudad: string;
  email: string;
  activo: boolean;
  fechaRegistro: string;
  totalVentas: number;
  totalPuntos: number;
}

// Matches backend map in VendedorController.obtenerMisVentas
interface Venta {
  id: number;
  serialNumber: string;
  clientName: string;
  clientPhone: string | null;
  productoModelo: string;
  productoNombre: string;
  fechaRegistro: string;
  cantidadCupones: number;
  estado: string;
  motivo?: string;
  tagPolizaPath?: string;
  polizaGarantiaPath?: string;
  notaVentaPath?: string;
}

interface MisVentasResponse {
  vendedor: {
    id: number;
    nombre: string;
    tienda: string;
    ciudad: string;
  };
  ventas: Venta[];
  totalVentas: number;
  totalPuntos: number;
}

// Matches backend RegistrarSerialVendedorResponse
interface RegistrarVentaResult {
  ventaId: number;
  serialNumber: string;
  modeloTv: string;
  puntosGanados: number;
  cuponesGenerados: number;
  clientName: string;
  mensaje: string;
}

export default function DashboardVendedor() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    serialNumber: '',
    saleDate: new Date().toISOString().split('T')[0],
  });
  const [files, setFiles] = useState<{
    tagPoliza: File | null;
    polizaGarantia: File | null;
    notaVenta: File | null;
  }>({
    tagPoliza: null,
    polizaGarantia: null,
    notaVenta: null,
  });

  // Detail Modal State
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [validatingSerial, setValidatingSerial] = useState(false);
  const [serialValidation, setSerialValidation] = useState<{
    valid: boolean;
    message: string;
    productId?: string;
    productName?: string;
    couponsCount?: number;
  } | null>(null);

  const [invalidSerialChar, setInvalidSerialChar] = useState<string | null>(null);

  // Validar serial en tiempo real con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      // Solo validar si tiene longitud suficiente y no está vacío
      if (formData.serialNumber && formData.serialNumber.length >= 4) {
        validateSerial(formData.serialNumber);
      } else {
         setSerialValidation(null);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.serialNumber]);

  // Validate serial number via backend API
  const validateSerial = async (serial: string) => {
    if (!serial || serial.length < 5) {
      setSerialValidation(null);
      return;
    }

    setValidatingSerial(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:7000"}${API_ENDPOINTS.REGISTRO.VALIDAR_SERIAL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serial: serial.toUpperCase().trim(),
          tipo: 'vendedor'
        }),
      });

      // Define local interface for this specific response if needed or reuse logic
      const result = await response.json();

      if (result.error) {
        setSerialValidation({
          valid: false,
          message: result.mensaje || 'Serial no disponible',
        });
        return;
      }

      const data = result.data;
      const couponCount = data.cantidadCupones || 1;
      
      setSerialValidation({
        valid: data.valido,
        message: data.valido 
          ? `✓ Serial válido - ${couponCount} punto${couponCount > 1 ? 's' : ''}`
          : data.error || data.mensaje || 'Serial no disponible',
        productId: data.productoId?.toString(),
        productName: data.modeloTv,
        couponsCount: couponCount,
      });

    } catch (err) {
      console.error('Serial validation error:', err);
      setSerialValidation({
        valid: false,
        message: 'Error al validar serial. Intenta de nuevo.',
      });
    } finally {
      setValidatingSerial(false);
    }
  };

  // Fetch vendor data from backend (Basic profile)
  const { 
    data: vendedor, 
    isLoading: loadingVendedor,
    error: vendedorError,
    refetch: refetchVendedor
  } = useQuery({
    queryKey: ['vendedor-perfil'],
    queryFn: async (): Promise<VendedorData | null> => {
      const response = await apiService.get<VendedorData>('/api/vendedor/perfil');
      if (response.error) {
        throw new Error(response.mensaje);
      }
      return response.data;
    },
    enabled: !!user,
    retry: 1,
  });

  // Fetch sales and extended stats from backend
  const { data: ventasData, isLoading: loadingVentas } = useQuery({
    queryKey: ['vendedor-ventas'],
    queryFn: async (): Promise<MisVentasResponse | null> => {
      const response = await apiService.get<MisVentasResponse>('/api/vendedor/mis-ventas');
      if (response.error) {
        throw new Error(response.mensaje);
      }
      return response.data;
    },
    enabled: !!vendedor,
  });

  const ventas = ventasData?.ventas || [];
  const stats = {
    totalPuntos: ventasData?.totalPuntos || 0,
    totalVentas: ventasData?.totalVentas || 0
  };

  // Pagination & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter sales
  const filteredVentas = ventas.filter(venta => 
    venta.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venta.productoModelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venta.productoNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venta.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (venta.estado && venta.estado.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredVentas.length / itemsPerPage);
  const paginatedVentas = filteredVentas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Register sale mutation
  const registerSale = useMutation({
    mutationFn: async (): Promise<RegistrarVentaResult> => {
      
      const data = new FormData();
      data.append('serialNumber', formData.serialNumber.toUpperCase().trim());
      data.append('saleDate', formData.saleDate);
      
      if (files.tagPoliza) data.append('tagPoliza', files.tagPoliza);
      if (files.polizaGarantia) data.append('polizaGarantia', files.polizaGarantia);
      if (files.notaVenta) data.append('notaVenta', files.notaVenta);

      // Validate files before sending (double check)
      if (!files.tagPoliza || !files.polizaGarantia || !files.notaVenta) {
         throw new Error("Todas las fotos son obligatorias (Tag, Póliza, Nota)");
      }

      const response = await apiService.postFormData<RegistrarVentaResult>(
        API_ENDPOINTS.VENDEDOR.REGISTRAR_SERIAL,
        data
      );

      if (response.error) {
        throw new Error(response.mensaje);
      }

      if (!response.data) {
        throw new Error('Error al registrar venta');
      }

      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['vendedor-ventas'] });
      queryClient.invalidateQueries({ queryKey: ['vendedor-perfil'] });
      setIsDialogOpen(false);
      setSerialValidation(null);
      setFormData({
        serialNumber: '',
        saleDate: new Date().toISOString().split('T')[0],
      });
      setFiles({
        tagPoliza: null,
        polizaGarantia: null,
        notaVenta: null,
      });
      toast({
        title: '¡Venta registrada!',
        description: `Ganaste ${result.puntosGanados} punto(s) y ${result.cuponesGenerados} cupón(es) para el sorteo.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleChange = (field: string, value: string) => {
    // Validar serial number - solo letras y números
    if (field === 'serialNumber') {
      // Detectar caracteres no permitidos
      const invalidChars = value.match(/[^a-zA-Z0-9]/g);
      if (invalidChars && invalidChars.length > 0) {
        // Mostrar mensaje con el símbolo inválido
        setInvalidSerialChar(invalidChars[0]);
        // Limpiar el mensaje después de 3 segundos
        setTimeout(() => setInvalidSerialChar(null), 3000);
        // No actualizar el valor si contiene caracteres inválidos
        return;
      }
      setInvalidSerialChar(null);
      setSerialValidation(null);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: keyof typeof files, file: File | null) => {
    setFiles(prev => ({ ...prev, [field]: file }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerSale.mutate();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  // Estado: Cargando
  if (loadingVendedor) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-skyworth-gold mx-auto mb-4" />
          <p className="text-gray-400">Cargando perfil de vendedor...</p>
        </div>
      </div>
    );
  }

  // Estado de ERROR técnico
  if (vendedorError) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-24 pb-8 px-4">
          <Card className="bg-white/10 border-red-500/30 max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <CardTitle className="text-xl text-white">Error técnico</CardTitle>
              <CardDescription className="text-gray-300">
                No se pudo cargar tu perfil de vendedor. Esto puede ser un problema temporal.
              </CardDescription>
              <p className="text-xs text-red-400 mt-2">
                {(vendedorError as Error).message}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button 
                onClick={() => refetchVendedor()}
                className="w-full bg-skyworth-gold hover:bg-skyworth-gold/90 text-black"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                <Home className="h-4 w-4 mr-2" />
                Ir al inicio
              </Button>
              <Button 
                variant="ghost"
                onClick={handleSignOut}
                className="w-full text-gray-400 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Estado: No existe perfil de vendedor
  if (!vendedor) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-24 pb-8 px-4">
          <Card className="bg-white/10 border-skyworth-green/30 max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-skyworth-green/20 rounded-full flex items-center justify-center">
                <Store className="h-8 w-8 text-skyworth-green" />
              </div>
              <CardTitle className="text-xl text-white">No tienes perfil de vendedor</CardTitle>
              <CardDescription className="text-gray-300">
                Tu cuenta existe pero no tienes un registro de vendedor. Completa tu registro para acceder al panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button 
                onClick={() => navigate('/ventas/registro')}
                className="w-full btn-cta-primary"
              >
                <Store className="h-4 w-4 mr-2" />
                Completar registro de vendedor
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                <Home className="h-4 w-4 mr-2" />
                Ir al inicio
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Estado: Dashboard normal
  return (
    <div className="min-h-screen bg-skyworth-dark flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Panel de <span className="text-skyworth-gold">Vendedor</span>
                </h1>
                <p className="text-gray-400 flex items-center gap-2 mt-1">
                  <Store className="h-4 w-4" />
                  {vendedor?.tienda} • {vendedor?.ciudad}
                </p>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-cta-primary flex-shrink-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Venta
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-skyworth-dark border-white/10 max-w-md mx-auto h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white">Nueva Venta</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Label className="text-white">N° Serie del TV *</Label>
                        <TooltipProvider>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-skyworth-gold cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-red-500 text-white border-red-500 text-xs font-bold px-3 py-2 max-w-[250px]">
                              <p>NO incluir el guión medio (-) al ingresar el serial.</p>
                              <p>Ejemplo: 2540400M00000</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        value={formData.serialNumber}
                        onChange={(e) => handleChange('serialNumber', e.target.value.toUpperCase())}
                        placeholder="Ingresa el número de serie"
                        required
                        className={`bg-white/10 border-white/20 text-white font-mono ${validatingSerial ? 'opacity-70' : ''}`}
                      />
                      {invalidSerialChar && (
                        <p className="text-sm text-red-400 mt-1 flex items-center gap-2 font-medium">
                          <AlertTriangle className="w-4 h-4" />
                          NO incluir el símbolo "{invalidSerialChar}" al ingresar el serial.
                        </p>
                      )}
                      {validatingSerial && (
                        <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Validando serial...
                        </p>
                      )}
                      {serialValidation && (
                        <div className={`mt-2 p-3 rounded-lg ${serialValidation.valid ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                          {serialValidation.valid ? (
                            <div className="space-y-1">
                              <p className="text-green-500 font-medium flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Serial válido
                              </p>
                              <p className="text-sm text-gray-300">
                                <span className="font-semibold">Modelo:</span> {serialValidation.productName}
                              </p>
                              <p className="text-sm text-skyworth-gold">
                                🎫 Genera {serialValidation.couponsCount} punto{(serialValidation.couponsCount || 1) > 1 ? 's' : ''}
                              </p>
                            </div>
                          ) : (
                            <p className="text-red-400">{serialValidation.message}</p>
                          )}
                        </div>
                      )}
                      {!serialValidation && !validatingSerial && (
                        <p className="text-xs text-gray-400">
                          El número de serie determina los puntos (modelo del TV)
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Fecha de Venta *</Label>
                      <Input
                        type="date"
                        value={formData.saleDate}
                        onChange={(e) => handleChange('saleDate', e.target.value)}
                        required
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                       <Label className="text-white">Foto del TAG de la Póliza * (Igual al serial)</Label>
                       <Input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => handleFileChange('tagPoliza', e.target.files?.[0] || null)}
                          required
                          className="bg-white/10 border-white/20 text-white file:bg-skyworth-gold file:text-black file:border-0 file:rounded-md file:mr-2 file:cursor-pointer"
                       />
                    </div>

                    <div className="space-y-2">
                       <Label className="text-white">Foto de Póliza de Garantía * (Coincidir datos)</Label>
                       <Input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => handleFileChange('polizaGarantia', e.target.files?.[0] || null)}
                          required
                          className="bg-white/10 border-white/20 text-white file:bg-skyworth-gold file:text-black file:border-0 file:rounded-md file:mr-2 file:cursor-pointer"
                       />
                    </div>

                    <div className="space-y-2">
                       <Label className="text-white">Foto de Nota de Venta/Factura * (Coincidir fecha)</Label>
                       <Input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => handleFileChange('notaVenta', e.target.files?.[0] || null)}
                          required
                          className="bg-white/10 border-white/20 text-white file:bg-skyworth-gold file:text-black file:border-0 file:rounded-md file:mr-2 file:cursor-pointer"
                       />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={registerSale.isPending}
                      className="w-full btn-cta-primary mt-4"
                    >
                      {registerSale.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Registrar Venta'
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="border-white/20 text-white hover:bg-white/10 flex-shrink-0"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-[#1a1a1a] border-skyworth-gold hover:border-skyworth-gold/80 transition-colors shadow-lg shadow-skyworth-gold/10">
                <CardHeader className="pb-2">
                  <CardDescription className="text-skyworth-gold font-medium">Puntos Aprobados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-skyworth-gold/20">
                      <Trophy className="h-8 w-8 text-skyworth-gold" />
                    </div>
                    <span className="text-4xl font-extrabold text-white">{stats.totalPuntos}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-[#1a1a1a] border-skyworth-green hover:border-skyworth-green/80 transition-colors shadow-lg shadow-skyworth-green/10">
                <CardHeader className="pb-2">
                  <CardDescription className="text-skyworth-green font-medium">Ventas Registradas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-skyworth-green/20">
                      <Package className="h-8 w-8 text-skyworth-green" />
                    </div>
                    <span className="text-4xl font-extrabold text-white">{stats.totalVentas}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-[#1a1a1a] border-blue-500 hover:border-blue-400 transition-colors shadow-lg shadow-blue-500/10 cursor-pointer" onClick={() => navigate('/ventas/ranking')}>
                <CardHeader className="pb-2">
                  <CardDescription className="text-blue-400 font-medium">Ver Ranking</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3">
                         <div className="p-3 rounded-full bg-blue-500/20">
                            <TrendingUp className="h-8 w-8 text-blue-400" />
                        </div>
                        <span className="text-lg font-medium text-white">Ver mi posición &rarr;</span>
                    </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sales History */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-skyworth-gold" />
                Historial de Ventas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  placeholder="Buscar por serial, modelo, cliente o estado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {loadingVentas ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-skyworth-gold mx-auto" />
                </div>
              ) : filteredVentas.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  {searchTerm ? (
                     <p>No se encontraron resultados para "{searchTerm}"</p>
                  ) : (
                    <>
                        <p>Aún no tienes ventas registradas</p>
                        <p className="text-sm">Registra tu primera venta para empezar a sumar puntos</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-md border border-white/10 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="text-gray-400">Fecha</TableHead>
                          <TableHead className="text-gray-400">Modelo / Producto</TableHead>
                          <TableHead className="text-gray-400">Serial</TableHead>
                          {/* <TableHead className="text-gray-400">Cliente</TableHead> */}
                          <TableHead className="text-gray-400">Estado</TableHead>
                          <TableHead className="text-gray-400">Motivo</TableHead>
                          <TableHead className="text-right text-gray-400">Puntos</TableHead>
                          <TableHead className="text-right text-gray-400">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedVentas.map((venta) => (
                          <TableRow key={venta.id} className="border-white/10 hover:bg-white/5 transition-colors">
                            <TableCell className="text-white">
                                {new Date(venta.fechaRegistro).toLocaleDateString('es-ES')}
                            </TableCell>
                            <TableCell className="text-white">
                                <span className="block font-medium">{venta.productoModelo}</span>
                                <span className="text-xs text-gray-500">{venta.productoNombre}</span>
                            </TableCell>
                            <TableCell className="text-gray-300 font-mono text-xs">
                                {venta.serialNumber}
                            </TableCell>
                            {/* Deleted Client Column */}
                            <TableCell>
                                {venta.estado === 'PENDIENTE' && (
                                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">Pendiente</Badge>
                                )}
                                {venta.estado === 'APROBADO' && (
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">Aprobado</Badge>
                                )}
                                {venta.estado === 'RECHAZADO' && (
                                    <Badge variant="destructive" className="bg-red-900/50 hover:bg-red-900 text-red-300 border-red-800">Rechazado</Badge>
                                )}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                                {venta.motivo ? (
                                    <span className="text-xs text-gray-400 line-clamp-2" title={venta.motivo}>
                                        {venta.motivo}
                                    </span>
                                ) : (
                                    <span className="text-gray-600">-</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <span className="font-bold text-skyworth-gold">+{venta.cantidadCupones}</span>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-gray-400 hover:text-white hover:bg-white/10"
                                    onClick={() => {
                                        setSelectedVenta(venta);
                                        setIsDetailOpen(true);
                                    }}
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {filteredVentas.length > itemsPerPage && (
                    <div className="flex items-center justify-between mt-4 text-sm text-gray-400 px-2">
                        <div>
                            Página {currentPage} de {totalPages} ({filteredVentas.length} registros)
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                            >
                                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
      
      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-skyworth-gold" />
              Detalle de Venta
            </DialogTitle>
          </DialogHeader>
          {selectedVenta && (
            <div className="space-y-6">
                {/* Status Banner */}
                <div className={`p-4 rounded-lg border ${
                    selectedVenta.estado === 'APROBADO' ? 'bg-green-500/10 border-green-500/30' :
                    selectedVenta.estado === 'RECHAZADO' ? 'bg-red-500/10 border-red-500/30' :
                    'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                    <div className="flex items-center gap-2 mb-2">
                        {selectedVenta.estado === 'APROBADO' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {selectedVenta.estado === 'RECHAZADO' && <XCircle className="h-5 w-5 text-red-500" />}
                        {selectedVenta.estado === 'PENDIENTE' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                        <span className={`font-bold ${
                            selectedVenta.estado === 'APROBADO' ? 'text-green-500' :
                            selectedVenta.estado === 'RECHAZADO' ? 'text-red-500' :
                            'text-yellow-500'
                        }`}>
                            {selectedVenta.estado}
                        </span>
                    </div>
                    {selectedVenta.motivo && (
                        <p className="text-sm text-gray-300">
                            <span className="font-semibold text-gray-400">Observaciones:</span> {selectedVenta.motivo}
                        </p>
                    )}
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Producto</p>
                  <p className="text-white font-medium">{selectedVenta.productoModelo}</p>
                  <p className="text-xs text-gray-500">{selectedVenta.productoNombre}</p>
                </div>
                 <div>
                  <p className="text-gray-400 text-sm">Serial</p>
                  <p className="text-white font-medium font-mono">{selectedVenta.serialNumber}</p>
                </div>
                 <div>
                  <p className="text-gray-400 text-sm">Fecha Registro</p>
                  <p className="text-white font-medium">{new Date(selectedVenta.fechaRegistro).toLocaleDateString('es-ES')}</p>
                </div>
                 <div>
                  <p className="text-gray-400 text-sm">Puntos Generados</p>
                  <p className="text-skyworth-gold font-bold text-lg">+{selectedVenta.cantidadCupones}</p>
                </div>
              </div>

               {/* Documents Preview */}
               <div className="pt-4 border-t border-white/10">
                  <p className="text-gray-400 text-sm mb-4">Fotos Adjuntas</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                          { label: 'Tag Póliza', path: selectedVenta.tagPolizaPath, type: 'tag_poliza' },
                          { label: 'Póliza Garantía', path: selectedVenta.polizaGarantiaPath, type: 'poliza_garantia' },
                          { label: 'Nota Venta', path: selectedVenta.notaVentaPath, type: 'nota_venta' }
                      ].map((doc, idx) => (
                          <div key={idx} className="border border-white/10 rounded-lg p-3 bg-white/5 flex flex-col items-center gap-3">
                              <span className="text-xs font-medium text-gray-300">{doc.label}</span>
                              {doc.path ? (
                                  <>
                                      <div className="relative w-full aspect-video bg-black rounded overflow-hidden group cursor-pointer border border-white/10"
                                           onClick={() => setZoomedImage(`${import.meta.env.VITE_API_URL || "http://localhost:7000"}/api/registro/${selectedVenta.id}/imagen/${doc.type}`)}
                                      >
                                          <img 
                                              src={`${import.meta.env.VITE_API_URL || "http://localhost:7000"}/api/registro/${selectedVenta.id}/imagen/${doc.type}`} 
                                              alt={doc.label}
                                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                              onError={(e) => {
                                                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=No+Image';
                                              }}
                                          />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                              <Eye className="w-8 h-8 text-white drop-shadow-md" />
                                          </div>
                                      </div>
                                      <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="w-full text-xs bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                                          onClick={() => setZoomedImage(`${import.meta.env.VITE_API_URL || "http://localhost:7000"}/api/registro/${selectedVenta.id}/imagen/${doc.type}`)}
                                      >
                                          <Eye className="w-3 h-3 mr-2" />
                                          Ver Imagen
                                      </Button>
                                  </>
                              ) : (
                                  <div className="w-full aspect-video bg-white/5 rounded flex flex-col items-center justify-center text-gray-500 gap-2">
                                      <p className="text-xs">No disponible</p>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Zoomed Image Lightbox */}
      <Dialog 
        open={!!zoomedImage} 
        onOpenChange={(open) => !open && setZoomedImage(null)}
      >
        <DialogContent 
            className="max-w-[100vw] max-h-[100vh] h-screen w-screen bg-transparent border-none shadow-none p-0 flex items-center justify-center [&>button]:hidden outline-none"
            onClick={() => setZoomedImage(null)}
        >
            <button 
                className="fixed top-6 right-6 z-[60] bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all hover:scale-105"
                onClick={(e) => {
                    e.stopPropagation();
                    setZoomedImage(null);
                }}
            >
                <XCircle className="h-10 w-10" />
            </button>
            {zoomedImage && (
                <img 
                    src={zoomedImage} 
                    alt="Zoomed document" 
                    className="max-w-[90vw] max-h-[90vh] object-contain rounded-md shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
