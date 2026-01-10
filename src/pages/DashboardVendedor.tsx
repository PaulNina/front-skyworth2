import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Loader2, Calendar, User, Phone, Award
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

  // Fetch seller data
  const { data: seller, isLoading: loadingSeller } = useQuery({
    queryKey: ['seller', user?.id],
    queryFn: async (): Promise<Seller | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
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

  // Register sale mutation
  const registerSale = useMutation({
    mutationFn: async () => {
      if (!seller) throw new Error('No seller found');
      
      const product = products?.find(p => p.id === formData.productId);
      if (!product) throw new Error('Producto no encontrado');

      const { error } = await supabase
        .from('seller_sales')
        .insert({
          seller_id: seller.id,
          product_id: formData.productId,
          serial_number: formData.serialNumber,
          invoice_number: formData.invoiceNumber,
          client_name: formData.clientName,
          client_phone: formData.clientPhone || null,
          sale_date: formData.saleDate,
          points_earned: product.points_value,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Esta venta ya fue registrada');
        }
        throw error;
      }
    },
    onSuccess: () => {
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
        description: 'Los puntos han sido añadidos a tu cuenta.',
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

  if (loadingSeller) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-skyworth-gold" />
      </div>
    );
  }

  // Si el usuario no tiene perfil de vendedor, mostrar mensaje
  if (!seller) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <Store className="h-16 w-16 text-skyworth-gold mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">No tienes perfil de vendedor</h1>
            <p className="text-gray-400 mb-6">
              Para acceder al panel de vendedor, primero debes registrarte como vendedor.
            </p>
            <Button 
              className="btn-cta-primary"
              onClick={() => window.location.href = '/registro-vendedor'}
            >
              Registrarme como Vendedor
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-skyworth-dark flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Panel de <span className="text-skyworth-gold">Vendedor</span>
              </h1>
              <p className="text-gray-400 flex items-center gap-2 mt-1">
                <Store className="h-4 w-4" />
                {seller?.store_name} • {seller?.store_city}
              </p>
            </div>
            <div className="flex gap-3">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-cta-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Venta
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-skyworth-dark border-white/10">
                  <DialogHeader>
                    <DialogTitle className="text-white">Nueva Venta</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Modelo de TV *</Label>
                      <Select value={formData.productId} onValueChange={(v) => handleChange('productId', v)}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.model_name} ({product.points_value} pts)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">N° Serie *</Label>
                        <Input
                          value={formData.serialNumber}
                          onChange={(e) => handleChange('serialNumber', e.target.value)}
                          required
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">N° Factura *</Label>
                        <Input
                          value={formData.invoiceNumber}
                          onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                          required
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
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
                onClick={() => signOut()}
                className="border-white/20 text-white hover:bg-white/10"
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
                    onClick={() => window.location.href = '/rankings'}
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
