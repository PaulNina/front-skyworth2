import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Users, Eye, Search, Store, Plus, Pencil, AlertTriangle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiService } from '@/services/apiService';
import { API_ENDPOINTS, Vendedor } from '@/config/api';
import { validateBolivianPhone } from '@/lib/phoneValidation';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

const CITIES = ["La Paz", "Cochabamba", "Santa Cruz"];

export default function AdminSellers() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<Vendedor | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  // Create Dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({
    nombre: '',
    ci: '',
    email: '',
    password: '',
    tienda: '',
    ciudad: '',
    telefono: '',
    fechaNacimiento: '',
    rolNombre: 'VENDEDOR'
  });

  // Edit Dialog
  const [editingSeller, setEditingSeller] = useState<Vendedor | null>(null);
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    ci: '',
    email: '',
    password: '',
    tienda: '',
    ciudad: '',
    telefono: '',
    rolNombre: 'VENDEDOR',  
    activo: true,
    fechaNacimiento: ''
  });

  const { data: sellers, isLoading } = useQuery({
    queryKey: ['admin-sellers'],
    queryFn: async () => {
      const response = await apiService.get<Vendedor[]>(API_ENDPOINTS.ADMIN.VENDEDORES);
      if (response.error) throw new Error(response.mensaje);
      return response.data;
    }
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof editFormData }) => {
        // Remove password if empty to avoid hashing empty string/changing it
        const payload = { ...data };
        if (!payload.password || payload.password.trim() === '') {
            payload.password = null;
        }

        const res = await apiService.put(API_ENDPOINTS.ADMIN.VENDEDOR_UPDATE(id), payload);
        if (res.error) throw new Error(res.mensaje);
        return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      toast.success('Vendedor actualizado exitosamente');
      setEditingSeller(null);
    },
    onError: (error) => {
      toast.error('Error al actualizar: ' + error.message);
    }
  });

  // Reusing update mutation logic for toggle but simplified
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
        const sellerToUpdate = sellers?.find(s => s.id === id);
        if (!sellerToUpdate) throw new Error("Vendedor no encontrado localmente");

        const updateData = {
           nombre: sellerToUpdate.nombre,
           ci: sellerToUpdate.ci,
           tienda: sellerToUpdate.tienda,
           ciudad: sellerToUpdate.ciudad,
           email: sellerToUpdate.email,
           // Password null to keep existing
           password: null, 
           activo: isActive,
           rolNombre: "VENDEDOR"
        };
        
        // Call the same endpoint
        const res = await apiService.put(API_ENDPOINTS.ADMIN.VENDEDOR_UPDATE(id), updateData);
        if (res.error) throw new Error(res.mensaje);
        return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      toast.success('Estado actualizado correctamente');
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: typeof newVendor) => {
      const res = await apiService.post(API_ENDPOINTS.ADMIN.VENDEDOR_CREAR, data);
      if (res.error) throw new Error(res.mensaje);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      toast.success('Vendedor creado exitosamente');
      setIsCreateDialogOpen(false);
      setPhoneError(null);
      setNewVendor({
        nombre: '',
        ci: '',
        email: '',
        password: '',
        tienda: '',
        ciudad: '',
        telefono: '',
        fechaNacimiento: '',
        rolNombre: 'VENDEDOR'
      });
    },
    onError: (error) => {
      toast.error('Error al crear vendedor: ' + error.message);
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.nombre || !newVendor.email || !newVendor.password || !newVendor.tienda || !newVendor.ciudad) {
        toast.error('Por favor complete todos los campos requeridos');
        return;
    }
    
    // Validar teléfono si está presente
    if (newVendor.telefono) {
      const phoneValidation = validateBolivianPhone(newVendor.telefono);
      if (!phoneValidation.isValid) {
        toast.error(phoneValidation.error || 'Número de teléfono inválido');
        return;
      }
    }
    
    setPhoneError(null);
    createVendorMutation.mutate(newVendor);
  };

  const handleEditClick = (seller: Vendedor) => {
      setPhoneError(null);
      setEditingSeller(seller);
      setEditFormData({
          nombre: seller.nombre,
          ci: seller.ci,
          email: seller.email,
          password: '', // Blank by default, only fill if changing
          tienda: seller.tienda,
          ciudad: seller.ciudad,
          telefono: seller.telefono || '',
          rolNombre: 'VENDEDOR', // Assuming
          activo: seller.activo,
          fechaNacimiento: seller.fechaNacimiento || ''
      });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingSeller) return;
      
      // Validar teléfono si está presente
      if (editFormData.telefono) {
        const phoneValidation = validateBolivianPhone(editFormData.telefono);
        if (!phoneValidation.isValid) {
          toast.error(phoneValidation.error || 'Número de teléfono inválido');
          return;
        }
      }
      
      setPhoneError(null);
      updateVendorMutation.mutate({ id: editingSeller.id, data: editFormData });
  };

  const filteredSellers = sellers?.filter(seller => {
    // Status filter
    if (statusFilter === 'active' && !seller.activo) return false;
    if (statusFilter === 'inactive' && seller.activo) return false;
    
    // Department filter
    if (departmentFilter !== 'all') {
      const sellerDepartment = seller.departamento || seller.ciudad;
      if (sellerDepartment !== departmentFilter) return false;
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        seller.nombre.toLowerCase().includes(searchLower) ||
        seller.tienda.toLowerCase().includes(searchLower) ||
        (seller.departamento && seller.departamento.toLowerCase().includes(searchLower)) ||
        seller.ciudad.toLowerCase().includes(searchLower) ||
        (seller.telefono && seller.telefono.toLowerCase().includes(searchLower)) ||
        seller.email.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  }) || [];

  // Calculate department counts
  const departmentCounts = filteredSellers.reduce((acc, seller) => {
    const department = seller.departamento || seller.ciudad;
    acc[department] = (acc[department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Export to Excel function
  const exportToExcel = () => {
    try {
      const exportData = filteredSellers.map(seller => ({
        'Nombre': seller.nombre,
        'CI': seller.ci,
        'Email': seller.email,
        'Teléfono': seller.telefono || '',
        'Tienda': seller.tienda,
        'Ciudad/Departamento': seller.departamento || seller.ciudad,
        'Estado': seller.activo ? 'Activo' : 'Inactivo',
        'Fecha Registro': seller.fechaRegistro 
          ? format(new Date(seller.fechaRegistro), 'dd/MM/yyyy', { locale: es })
          : ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendedores');
      
      const today = format(new Date(), 'yyyy-MM-dd');
      XLSX.writeFile(workbook, `vendedores_${today}.xlsx`);
      
      toast.success(`Excel exportado exitosamente (${filteredSellers.length} vendedores)`);
    } catch (error) {
      toast.error('Error al exportar a Excel');
      console.error('Error exporting:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          Vendedores
        </h1>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline" className="border-border text-foreground hover:bg-muted">
            <Download className="mr-2 h-4 w-4" />
            Exportar a Excel
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Registrar Vendedor
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, tienda, departamento o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background border-border text-foreground"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-48 bg-background border-border text-foreground">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border">
            <SelectItem value="all" className="text-foreground">Todos los departamentos</SelectItem>
            {CITIES.map((city) => (
              <SelectItem key={city} value={city} className="text-foreground">
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Department Counter */}
      <Card className="bg-muted border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Total:</span>
              <Badge variant="default" className="bg-primary">
                {filteredSellers.length}
              </Badge>
            </div>
            {CITIES.map((dept) => (
              <div key={dept} className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">{dept}:</span>
                <Badge variant="secondary">
                  {departmentCounts[dept] || 0}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-muted border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Vendedor</TableHead>
                <TableHead className="text-muted-foreground">Tienda</TableHead>
                <TableHead className="text-muted-foreground">Departamento</TableHead>
                <TableHead className="text-muted-foreground">Teléfono</TableHead>
                <TableHead className="text-muted-foreground text-center">Estado</TableHead>
                <TableHead className="text-muted-foreground text-center">Activo</TableHead>
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
              ) : filteredSellers.length > 0 ? (
                filteredSellers.map((seller) => (
                  <TableRow key={seller.id} className="border-border">
                    <TableCell className="text-foreground">
                      <div>
                        <p className="font-medium">{seller.nombre}</p>
                        <p className="text-muted-foreground text-xs">{seller.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground font-medium">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        {seller.tienda}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">{seller.departamento || seller.ciudad}</TableCell>
                    <TableCell className="text-foreground">{seller.telefono || '-'}</TableCell>
                    <TableCell className="text-center">
                        <Badge variant={seller.activo ? "default" : "secondary"} className={seller.activo ? "bg-green-600" : ""}>
                            {seller.activo ? "Activo" : "Inactivo"}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={seller.activo}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: seller.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(seller)}>
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedSeller(seller)}>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay vendedores registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSeller} onOpenChange={(open) => !open && setSelectedSeller(null)}>
        <DialogContent className="bg-muted border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Store className="h-5 w-5" />
              Detalle de Vendedor
            </DialogTitle>
          </DialogHeader>
          {selectedSeller && (
            <div className="space-y-6">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Nombre</p>
                  <p className="text-foreground font-medium">{selectedSeller.nombre}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">CI</p>
                  <p className="text-foreground font-medium">{selectedSeller.ci}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Email</p>
                  <p className="text-foreground font-medium">{selectedSeller.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Teléfono</p>
                  <p className="text-foreground font-medium">{selectedSeller.telefono || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Tienda</p>
                  <p className="text-foreground font-medium">{selectedSeller.tienda}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Departamento</p>
                  <p className="text-foreground font-medium">{selectedSeller.departamento || selectedSeller.ciudad}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Fecha Registro</p>
                  <p className="text-foreground font-medium">
                    {selectedSeller.fechaRegistro 
                        ? format(new Date(selectedSeller.fechaRegistro), 'dd/MM/yyyy', { locale: es })
                        : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-background border-border max-w-lg">
            <DialogHeader>
                <DialogTitle>Registrar Nuevo Vendedor</DialogTitle>
                <DialogDescription>
                    Complete el formulario para registrar un nuevo vendedor en el sistema.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre Completo</Label>
                        <Input 
                            id="nombre" 
                            value={newVendor.nombre}
                            onChange={(e) => setNewVendor({...newVendor, nombre: e.target.value})}
                            placeholder="Juan Pérez"
                            required
                        />
                    </div>
                <div className="space-y-2">
                    <Label htmlFor="ci">Cédula de Identidad</Label>
                    <Input 
                        id="ci" 
                        value={newVendor.ci}
                        onChange={(e) => setNewVendor({...newVendor, ci: e.target.value})}
                        placeholder="1234567"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
                    <Input 
                        id="fechaNacimiento" 
                        type="date"
                        min="1900-01-01"
                        max={new Date().toISOString().split('T')[0]}
                        value={newVendor.fechaNacimiento}
                        onChange={(e) => setNewVendor({...newVendor, fechaNacimiento: e.target.value})}
                        required
                    />
                </div>
                </div>

                 <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input 
                        id="email" 
                        type="email"
                        value={newVendor.email}
                        onChange={(e) => setNewVendor({...newVendor, email: e.target.value})}
                        placeholder="juan@ejemplo.com"
                        required
                    />
                </div>

                 <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input 
                        id="telefono" 
                        value={newVendor.telefono}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, '');
                          if (cleaned.length <= 8) {
                            setNewVendor({...newVendor, telefono: cleaned});
                            if (cleaned.length > 0) {
                              const validation = validateBolivianPhone(cleaned);
                              if (!validation.isValid && cleaned.length === 8) {
                                setPhoneError(validation.error || null);
                              } else if (cleaned.length < 8) {
                                setPhoneError('Debe tener 8 dígitos');
                              } else {
                                setPhoneError(null);
                              }
                            } else {
                              setPhoneError(null);
                            }
                          }
                        }}
                        placeholder="7XXXXXXX (8 dígitos)"
                        maxLength={8}
                        className={phoneError ? 'border-red-500 focus:ring-red-500' : ''}
                    />
                    {phoneError && (
                      <p className="text-sm text-red-500 mt-1 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {phoneError}
                      </p>
                    )}
                </div>

                 <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input 
                        id="password" 
                        type="password"
                        value={newVendor.password}
                        onChange={(e) => setNewVendor({...newVendor, password: e.target.value})}
                        placeholder="********"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="tienda">Nombre de Tienda</Label>
                        <Input 
                            id="tienda" 
                            value={newVendor.tienda}
                            onChange={(e) => setNewVendor({...newVendor, tienda: e.target.value})}
                            placeholder="Samsung Store"
                            required
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="ciudad">Ciudad</Label>
                        <Select
                            value={newVendor.ciudad}
                            onValueChange={(val) => setNewVendor({...newVendor, ciudad: val})}>
                            <SelectTrigger id="ciudad">
                                <SelectValue placeholder="Seleccione una ciudad" />
                            </SelectTrigger>
                            <SelectContent>
                                {CITIES.map(city => (
                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={createVendorMutation.isPending}>
                        {createVendorMutation.isPending ? 'Registrando...' : 'Registrar Vendedor'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
       <Dialog open={!!editingSeller} onOpenChange={(open) => !open && setEditingSeller(null)}>
        <DialogContent className="bg-background border-border max-w-lg">
            <DialogHeader>
                <DialogTitle>Editar Vendedor</DialogTitle>
                <DialogDescription>
                    Modifique los datos del vendedor. Deje la contraseña en blanco para mantener la actual.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-nombre">Nombre Completo</Label>
                        <Input 
                            id="edit-nombre" 
                            value={editFormData.nombre}
                            onChange={(e) => setEditFormData({...editFormData, nombre: e.target.value})}
                            required
                        />
                    </div>
                <div className="space-y-2">
                        <Label htmlFor="edit-ci">Cédula de Identidad</Label>
                        <Input 
                            id="edit-ci" 
                            value={editFormData.ci}
                            onChange={(e) => setEditFormData({...editFormData, ci: e.target.value})}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="edit-fechaNacimiento">Fecha de Nacimiento</Label>
                    <Input 
                        id="edit-fechaNacimiento" 
                        type="date"
                        min="1900-01-01"
                        max={new Date().toISOString().split('T')[0]}
                        value={editFormData.fechaNacimiento}
                        onChange={(e) => setEditFormData({...editFormData, fechaNacimiento: e.target.value})}
                        required
                    />
                </div>

                 <div className="space-y-2">
                    <Label htmlFor="edit-email">Correo Electrónico</Label>
                    <Input 
                        id="edit-email" 
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                        required
                    />
                </div>

                 <div className="space-y-2">
                    <Label htmlFor="edit-telefono">Teléfono</Label>
                    <Input 
                        id="edit-telefono" 
                        value={editFormData.telefono}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, '');
                          if (cleaned.length <= 8) {
                            setEditFormData({...editFormData, telefono: cleaned});
                            if (cleaned.length > 0) {
                              const validation = validateBolivianPhone(cleaned);
                              if (!validation.isValid && cleaned.length === 8) {
                                setPhoneError(validation.error || null);
                              } else if (cleaned.length < 8) {
                                setPhoneError('Debe tener 8 dígitos');
                              } else {
                                setPhoneError(null);
                              }
                            } else {
                              setPhoneError(null);
                            }
                          }
                        }}
                        placeholder="7XXXXXXX (8 dígitos)"
                        maxLength={8}
                        className={phoneError ? 'border-red-500 focus:ring-red-500' : ''}
                    />
                    {phoneError && (
                      <p className="text-sm text-red-500 mt-1 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {phoneError}
                      </p>
                    )}
                </div>

                 <div className="space-y-2">
                    <Label htmlFor="edit-password">Contraseña (Opcional)</Label>
                    <Input 
                        id="edit-password" 
                        type="password"
                        value={editFormData.password}
                        onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                        placeholder="Dejar en blanco para no cambiar"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="edit-tienda">Nombre de Tienda</Label>
                        <Input 
                            id="edit-tienda" 
                            value={editFormData.tienda}
                            onChange={(e) => setEditFormData({...editFormData, tienda: e.target.value})}
                            required
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="edit-ciudad">Ciudad</Label>
                        <Select
                            value={editFormData.ciudad}
                            onValueChange={(val) => setEditFormData({...editFormData, ciudad: val})}>
                            <SelectTrigger id="edit-ciudad">
                                <SelectValue placeholder="Seleccione una ciudad" />
                            </SelectTrigger>
                            <SelectContent>
                                {CITIES.map(city => (
                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <Switch
                        id="edit-activo"
                        checked={editFormData.activo}
                        onCheckedChange={(checked) => setEditFormData({...editFormData, activo: checked})}
                    />
                    <Label htmlFor="edit-activo">Vendedor Activo</Label>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setEditingSeller(null)}>Cancelar</Button>
                    <Button type="submit" disabled={updateVendorMutation.isPending}>
                        {updateVendorMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
