/**
 * Dashboard Vendedor - Skyworth Mundial 2026
 * 
 * CRITICAL FIX: Diferenciar "no existe vendedor" vs "error de consulta"
 * - Error técnico → mostrar UI de error con reintentar
 * - No existe registro → mostrar CTA para registrarse
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { 
  Trophy, Store, TrendingUp, Package, Plus, LogOut, 
  Loader2, Calendar, User, Phone, Award, AlertTriangle, RefreshCw, Home
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface Seller {
  id: string;
  store_name: string;
  store_city: string;
  total_points: number;
  total_sales: number;
}

interface Sale {
  id: string;
  serial_number: string;
  invoice_number: string;
  client_name: string;
  client_phone: string | null;
  sale_date: string;
  points_earned: number;
  created_at: string;
  products: {
    model_name: string;
    screen_size: number | null;
  };
}

export default function DashboardVendedor() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: products } = useProducts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    serialNumber: '',
    invoiceNumber: '',
    clientName: '',
    clientPhone: '',
    saleDate: new Date().toISOString().split('T')[0],
  });

  // CRITICAL: Fetch seller con manejo explícito de error vs no-existe
  const { 
    data: seller, 
    isLoading: loadingSeller,
    error: sellerError,
    refetch: refetchSeller
  } = useQuery({
    queryKey: ['seller', user?.id],
    queryFn: async (): Promise<Seller | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // CRITICAL: Propagar error para diferenciarlo de "no existe"
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    retry: 1,
  });

  // Fetch sales
  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ['seller-sales', seller?.id],
    queryFn: async (): Promise<Sale[]> => {
      if (!seller) return [];
      const { data, error } = await supabase
        .from('seller_sales')
        .select(`
          *,
          products (model_name, screen_size)
        `)
        .eq('seller_id', seller.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Sale[]) || [];
    },
    enabled: !!seller,
  });

  // Register sale mutation using RPC
  const registerSale = useMutation({
    mutationFn: async () => {
      if (!seller) throw new Error('No seller found');
      
      // Use the new RPC for atomic registration
      const { data, error } = await supabase.rpc('rpc_register_seller_serial', {
        p_seller_id: seller.id,
        p_serial_number: formData.serialNumber.toUpperCase().trim(),
        p_invoice_number: formData.invoiceNumber || undefined,
        p_client_name: formData.clientName,
        p_client_phone: formData.clientPhone || undefined,
        p_sale_date: formData.saleDate || undefined,
      });

      if (error) {
        // Handle specific error codes
        if (error.message.includes('ya registrado por vendedor')) {
          throw new Error('Este serial ya fue registrado por un vendedor');
        }
        if (error.message.includes('no existe')) {
          throw new Error('El número de serie no existe en el sistema');
        }
        if (error.message.includes('BLOQUEADO')) {
          throw new Error('Este serial está bloqueado y no puede registrarse');
        }
        throw error;
      }

      const result = data as { 
        success: boolean; 
        sale_id?: string;
        points?: number;
        coupons?: string[];
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || 'Error al registrar venta');
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['seller-sales'] });
      queryClient.invalidateQueries({ queryKey: ['seller'] });
      setIsDialogOpen(false);
      setFormData({
        productId: '',
        serialNumber: '',
        invoiceNumber: '',
        clientName: '',
        clientPhone: '',
        saleDate: new Date().toISOString().split('T')[0],
      });
      toast({
        title: '¡Venta registrada!',
        description: `Ganaste ${result.points} puntos y ${result.coupons?.length || 1} cupón(es) para el sorteo.`,
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
    setFormData(prev => ({ ...prev, [field]: value }));
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
  if (loadingSeller) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-skyworth-gold mx-auto mb-4" />
          <p className="text-gray-400">Cargando perfil de vendedor...</p>
        </div>
      </div>
    );
  }

  // CRITICAL: Estado de ERROR técnico (RLS, conexión, etc.)
  if (sellerError) {
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
                {(sellerError as Error).message}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button 
                onClick={() => refetchSeller()}
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

  // Estado: No existe perfil de vendedor (consulta exitosa, pero sin datos)
  if (!seller) {
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
                onClick={() => navigate('/registro-vendedor')}
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
                  {seller?.store_name} • {seller?.store_city}
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
                <DialogContent className="bg-skyworth-dark border-white/10 max-w-md mx-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white">Nueva Venta</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">N° Serie del TV *</Label>
                      <Input
                        value={formData.serialNumber}
                        onChange={(e) => handleChange('serialNumber', e.target.value.toUpperCase())}
                        placeholder="Ingresa el número de serie"
                        required
                        className="bg-white/10 border-white/20 text-white font-mono"
                      />
                      <p className="text-xs text-gray-400">
                        El producto se detectará automáticamente del serial
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">N° Factura</Label>
                      <Input
                        value={formData.invoiceNumber}
                        onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                        placeholder="Opcional"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Nombre del Cliente *</Label>
                      <Input
                        value={formData.clientName}
                        onChange={(e) => handleChange('clientName', e.target.value)}
                        required
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">Teléfono Cliente</Label>
                        <Input
                          value={formData.clientPhone}
                          onChange={(e) => handleChange('clientPhone', e.target.value)}
                          className="bg-white/10 border-white/20 text-white"
                        />
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
                    </div>
                    <Button 
                      type="submit" 
                      disabled={registerSale.isPending}
                      className="w-full btn-cta-primary"
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
              <Card className="bg-gradient-to-br from-skyworth-gold/20 to-skyworth-gold/5 border-skyworth-gold/30">
                <CardHeader className="pb-2">
                  <CardDescription className="text-skyworth-gold">Puntos Totales</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Trophy className="h-10 w-10 text-skyworth-gold" />
                    <span className="text-4xl font-bold text-white">{seller?.total_points || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-gradient-to-br from-skyworth-green/20 to-skyworth-green/5 border-skyworth-green/30">
                <CardHeader className="pb-2">
                  <CardDescription className="text-skyworth-green">Ventas Registradas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Package className="h-10 w-10 text-skyworth-green" />
                    <span className="text-4xl font-bold text-white">{seller?.total_sales || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30">
                <CardHeader className="pb-2">
                  <CardDescription className="text-blue-400">Ver Ranking</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-white hover:bg-white/10"
                    onClick={() => navigate('/rankings')}
                  >
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Ver mi posición
                  </Button>
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
              {loadingSales ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-skyworth-gold mx-auto" />
                </div>
              ) : sales?.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aún no tienes ventas registradas</p>
                  <p className="text-sm">Registra tu primera venta para empezar a sumar puntos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sales?.map((sale, idx) => (
                    <motion.div
                      key={sale.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="w-12 h-12 bg-skyworth-gold/20 rounded-lg flex items-center justify-center">
                        <Award className="h-6 w-6 text-skyworth-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white">
                          {sale.products?.model_name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {sale.client_name}
                          </span>
                          {sale.client_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {sale.client_phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(sale.sale_date).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Serie: {sale.serial_number} • Factura: {sale.invoice_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-skyworth-gold">+{sale.points_earned}</span>
                        <p className="text-xs text-gray-400">puntos</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
