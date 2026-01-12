import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

const TIERS = ['T1', 'T2', 'T3'];

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    model_name: '',
    tier: 'T1',
    screen_size: '',
    description: '',
    points_value: '',
    ticket_multiplier: '1',
    is_active: true
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('tier', { ascending: true })
        .order('screen_size', { ascending: true });
      if (error) throw error;
      return data as Product[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (product: TablesInsert<'products'>) => {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(product)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(product);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
      closeDialog();
    },
    onError: (error) => {
      toast.error('Error al guardar: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Producto eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar: ' + error.message);
    }
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    setFormData({
      model_name: '',
      tier: 'T1',
      screen_size: '',
      description: '',
      points_value: '',
      ticket_multiplier: '1',
      is_active: true
    });
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      model_name: product.model_name,
      tier: product.tier,
      screen_size: product.screen_size?.toString() || '',
      description: product.description || '',
      points_value: product.points_value?.toString() || '',
      ticket_multiplier: product.ticket_multiplier?.toString() || '1',
      is_active: product.is_active ?? true
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      model_name: formData.model_name,
      tier: formData.tier,
      screen_size: formData.screen_size ? parseFloat(formData.screen_size) : null,
      description: formData.description || null,
      points_value: formData.points_value ? parseInt(formData.points_value) : null,
      ticket_multiplier: formData.ticket_multiplier ? parseInt(formData.ticket_multiplier) : 1,
      is_active: formData.is_active
    });
  };

  const getTierBadgeClass = (tier: string) => {
    switch (tier) {
      case 'T3': return 'bg-primary text-primary-foreground';
      case 'T2': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          Gestión de Productos
        </h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-muted border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model_name" className="text-foreground">Modelo</Label>
                <Input
                  id="model_name"
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                  placeholder="Ej: SUE8600"
                  required
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tier" className="text-foreground">Tier</Label>
                  <Select value={formData.tier} onValueChange={(v) => setFormData({ ...formData, tier: v })}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border">
                      {TIERS.map((tier) => (
                        <SelectItem key={tier} value={tier} className="text-foreground">{tier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="screen_size" className="text-foreground">Pulgadas</Label>
                  <Input
                    id="screen_size"
                    type="number"
                    value={formData.screen_size}
                    onChange={(e) => setFormData({ ...formData, screen_size: e.target.value })}
                    placeholder="55"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="points_value" className="text-foreground">Puntos</Label>
                  <Input
                    id="points_value"
                    type="number"
                    value={formData.points_value}
                    onChange={(e) => setFormData({ ...formData, points_value: e.target.value })}
                    placeholder="100"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticket_multiplier" className="text-foreground">Cupones por compra (1-5)</Label>
                  <Input
                    id="ticket_multiplier"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.ticket_multiplier}
                    onChange={(e) => setFormData({ ...formData, ticket_multiplier: e.target.value })}
                    placeholder="1"
                    className="bg-background border-border text-foreground"
                  />
                  <p className="text-xs text-muted-foreground">Cantidad de cupones que recibe el comprador</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="text-foreground">Activo</Label>
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

      <Card className="bg-muted border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Modelo</TableHead>
                <TableHead className="text-muted-foreground">Tier</TableHead>
                <TableHead className="text-muted-foreground">Pulgadas</TableHead>
                <TableHead className="text-muted-foreground">Puntos</TableHead>
                <TableHead className="text-muted-foreground">Cupones</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Cargando productos...
                  </TableCell>
                </TableRow>
              ) : products && products.length > 0 ? (
                products.map((product) => (
                  <TableRow key={product.id} className="border-border">
                    <TableCell className="text-foreground font-medium">{product.model_name}</TableCell>
                    <TableCell>
                      <Badge className={getTierBadgeClass(product.tier)}>{product.tier}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{product.screen_size}"</TableCell>
                    <TableCell className="text-foreground">{product.points_value || '-'}</TableCell>
                    <TableCell className="text-foreground">x{product.ticket_multiplier || 1}</TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? 'default' : 'secondary'}>
                        {product.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('¿Eliminar este producto?')) {
                            deleteMutation.mutate(product.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay productos registrados. Crea el primero.
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
