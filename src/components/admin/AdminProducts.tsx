import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/apiService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { Product } from '@/hooks/useProducts';

interface ProductFormData {
  nombre: string;
  modelo: string;
  tamanoPulgadas: string;
  multiplicadorCupones: string;
  descripcion: string;
  activo: boolean;
}

interface ApiError {
  response?: {
    data?: {
      mensaje?: string;
    };
  };
  message: string;
}

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    nombre: '',
    modelo: '',
    tamanoPulgadas: '',
    multiplicadorCupones: '1',
    descripcion: '',
    activo: true
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      // Fetch all products
      const response = await apiService.get<Product[]>('/api/admin/productos');
      return response.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (productData: ProductFormData) => {
      // Convert string inputs to numbers where necessary
      const payload = {
        ...productData,
        tamanoPulgadas: parseFloat(productData.tamanoPulgadas),
        multiplicadorCupones: parseInt(productData.multiplicadorCupones)
      };

      if (editingProduct) {
        await apiService.put(`/api/admin/productos/${editingProduct.id}`, payload);
      } else {
        await apiService.post('/api/admin/productos', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
      closeDialog();
    },
    onError: (error: ApiError) => {
      toast.error('Error al guardar: ' + (error.response?.data?.mensaje || error.message));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiService.delete(`/api/admin/productos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Producto eliminado (desactivado)');
    },
    onError: (error: ApiError) => {
      toast.error('Error al eliminar: ' + (error.response?.data?.mensaje || error.message));
    }
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    setFormData({
      nombre: '',
      modelo: '',
      tamanoPulgadas: '',
      multiplicadorCupones: '1',
      descripcion: '',
      activo: true
    });
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre,
      modelo: product.modelo,
      tamanoPulgadas: product.tamanoPulgadas.toString(),
      multiplicadorCupones: product.multiplicadorCupones.toString(),
      descripcion: product.descripcion || '',
      activo: product.activo
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
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
                <Label htmlFor="nombre" className="text-foreground">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Televisor 55 Ultra HD"
                  required
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modelo" className="text-foreground">Modelo</Label>
                  <Input
                    id="modelo"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    placeholder="Ej: SUE8600"
                    required
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tamanoPulgadas" className="text-foreground">Pulgadas</Label>
                  <Input
                    id="tamanoPulgadas"
                    type="number"
                    value={formData.tamanoPulgadas}
                    onChange={(e) => setFormData({ ...formData, tamanoPulgadas: e.target.value })}
                    placeholder="55"
                    required
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="multiplicadorCupones" className="text-foreground">Cupones por compra</Label>
                <Input
                  id="multiplicadorCupones"
                  type="number"
                  min="1"
                  value={formData.multiplicadorCupones}
                  onChange={(e) => setFormData({ ...formData, multiplicadorCupones: e.target.value })}
                  placeholder="1"
                  required
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">Cantidad de cupones que recibe el cliente por esta compra</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion" className="text-foreground">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción opcional"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <Label htmlFor="activo" className="text-foreground">Activo</Label>
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
                <TableHead className="text-muted-foreground">Nombre</TableHead>
                <TableHead className="text-muted-foreground">Modelo</TableHead>
                <TableHead className="text-muted-foreground">Pulgadas</TableHead>
                <TableHead className="text-muted-foreground">Cupones</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Cargando productos...
                  </TableCell>
                </TableRow>
              ) : products && products.length > 0 ? (
                products.map((product) => (
                  <TableRow key={product.id} className="border-border">
                    <TableCell className="text-foreground font-medium">{product.nombre}</TableCell>
                    <TableCell className="text-foreground">{product.modelo}</TableCell>
                    <TableCell className="text-foreground">{product.tamanoPulgadas}"</TableCell>
                    <TableCell className="text-foreground">x{product.multiplicadorCupones}</TableCell>
                    <TableCell>
                      <Badge variant={product.activo ? 'default' : 'secondary'}>
                        {product.activo ? 'Activo' : 'Inactivo'}
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
