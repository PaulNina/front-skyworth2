import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { API_ENDPOINTS, KnowledgeBaseItem } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bot, Plus, Pencil, Trash2, Search, MessageCircle, Loader2 } from 'lucide-react';

const CATEGORIES = ['PRODUCTO', 'SORTEO', 'REGISTRO', 'GENERAL'];

export default function AdminKnowledgeBase() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeBaseItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<KnowledgeBaseItem[] | null>(null);
  const [testing, setTesting] = useState(false);
  const [formData, setFormData] = useState({
    pregunta: '',
    respuesta: '',
    categoria: 'GENERAL',
    keywords: '',
    activo: true
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['admin-kb-items'],
    queryFn: async () => {
      const response = await apiService.get<KnowledgeBaseItem[]>(API_ENDPOINTS.ADMIN.KB.LIST);
      if (response.error) throw new Error(response.mensaje);
      return response.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (item: Partial<KnowledgeBaseItem>) => {
      let res;
      if (editingItem) {
        res = await apiService.put(API_ENDPOINTS.ADMIN.KB.UPDATE(editingItem.id), item);
      } else {
        res = await apiService.post(API_ENDPOINTS.ADMIN.KB.CREATE, item);
      }
      if (res.error) throw new Error(res.mensaje);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kb-items'] });
      toast.success(editingItem ? 'Item actualizado' : 'Item creado');
      closeDialog();
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiService.delete(API_ENDPOINTS.ADMIN.KB.DELETE(id));
      if (res.error) throw new Error(res.mensaje);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kb-items'] });
      toast.success('Item eliminado');
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({
      pregunta: '',
      respuesta: '',
      categoria: 'GENERAL',
      keywords: '',
      activo: true
    });
  };

  const openEdit = (item: KnowledgeBaseItem) => {
    setEditingItem(item);
    setFormData({
      pregunta: item.pregunta,
      respuesta: item.respuesta,
      categoria: item.categoria || 'GENERAL',
      keywords: item.keywords || '',
      activo: item.activo
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      pregunta: formData.pregunta,
      respuesta: formData.respuesta,
      categoria: formData.categoria,
      keywords: formData.keywords,
      activo: formData.activo
    });
  };

  const runTestQuery = async () => {
    if (!testQuery.trim()) return;
    setTesting(true);
    try {
      const res = await apiService.post<KnowledgeBaseItem[]>(API_ENDPOINTS.ADMIN.KB.SEARCH, { query_text: testQuery });
        if (res.error) throw new Error(res.mensaje);
        setTestResults(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error en búsqueda: ' + message);
    } finally {
      setTesting(false);
    }
  };

  const filteredItems = items?.filter(item => {
      if (filterCategory !== 'all' && item.categoria !== filterCategory) return false;
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          return item.pregunta.toLowerCase().includes(lower) || item.respuesta.toLowerCase().includes(lower);
      }
      return true;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          Base de Conocimientos
        </h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Item
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-muted border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingItem ? 'Editar Item' : 'Nuevo Item de Conocimiento'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-2">
                  <Label className="text-foreground">Categoría</Label>
                  <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-foreground">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              <div className="space-y-2">
                <Label className="text-foreground">Pregunta / Título</Label>
                <Input
                  value={formData.pregunta}
                  onChange={(e) => setFormData({ ...formData, pregunta: e.target.value })}
                  placeholder="¿Cómo puedo participar?"
                  required
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Respuesta / Contenido</Label>
                <Textarea
                  value={formData.respuesta}
                  onChange={(e) => setFormData({ ...formData, respuesta: e.target.value })}
                  placeholder="Para participar debes comprar un TV Skyworth..."
                  required
                  rows={6}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Keywords (separados por coma)</Label>
                <Input
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="promoción, registro, sorteo"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <Label className="text-foreground">Activo</Label>
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

      {/* Test Query */}
      <Card className="bg-muted border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Probar Consulta del Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="¿Cómo puedo ganar? ¿Cuáles son los premios?"
              className="flex-1 bg-background border-border text-foreground"
              onKeyDown={(e) => e.key === 'Enter' && runTestQuery()}
            />
            <Button onClick={runTestQuery} disabled={testing} className="bg-secondary text-secondary-foreground">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Buscar</span>
            </Button>
          </div>
          {testResults && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{testResults.length} resultados encontrados</p>
              {testResults.map((result, i) => (
                <div key={result.id} className="p-3 rounded-lg bg-background/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">#{i + 1}</Badge>
                    <span className="text-foreground font-medium">{result.pregunta}</span>
                    <Badge variant="secondary" className="text-xs">{result.categoria}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm line-clamp-2">{result.respuesta}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por pregunta o respuesta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background border-border text-foreground"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48 bg-background border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border">
            <SelectItem value="all" className="text-foreground">Todas las categorías</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-foreground">{cat}</SelectItem>
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
                <TableHead className="text-muted-foreground">Categoría</TableHead>
                <TableHead className="text-muted-foreground">Pregunta</TableHead>
                <TableHead className="text-muted-foreground">Keywords</TableHead>
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
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell>
                      <Badge variant="secondary">{item.categoria}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground font-medium max-w-xs truncate">
                      {item.pregunta}
                    </TableCell>
                    <TableCell>
                      <div className="truncate max-w-[200px] text-xs text-muted-foreground">{item.keywords}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.activo ? 'default' : 'secondary'}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('¿Eliminar este item permanentemente?')) {
                            deleteMutation.mutate(item.id);
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
                    No hay items en la base de conocimientos. Crea el primero.
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
