import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type KbItem = Tables<'kb_items'>;

const ITEM_TYPES = ['FAQ', 'ARTICLE', 'DOCUMENT'];
const CATEGORIES = ['General', 'Promoción', 'Productos', 'Registro', 'Sorteo', 'Problemas', 'Premios'];

export default function AdminKnowledgeBase() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KbItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [testing, setTesting] = useState(false);
  const [formData, setFormData] = useState({
    item_type: 'FAQ',
    title: '',
    content: '',
    category: 'General',
    tags: '',
    is_active: true
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['admin-kb-items', searchTerm, filterCategory],
    queryFn: async () => {
      let query = supabase
        .from('kb_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as KbItem[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (item: TablesInsert<'kb_items'>) => {
      if (editingItem) {
        const { error } = await supabase
          .from('kb_items')
          .update(item)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('kb_items').insert(item);
        if (error) throw error;
      }
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kb_items').delete().eq('id', id);
      if (error) throw error;
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
      item_type: 'FAQ',
      title: '',
      content: '',
      category: 'General',
      tags: '',
      is_active: true
    });
  };

  const openEdit = (item: KbItem) => {
    setEditingItem(item);
    setFormData({
      item_type: item.item_type,
      title: item.title,
      content: item.content,
      category: item.category || 'General',
      tags: item.tags?.join(', ') || '',
      is_active: item.is_active ?? true
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      item_type: formData.item_type,
      title: formData.title,
      content: formData.content,
      category: formData.category,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null,
      is_active: formData.is_active
    });
  };

  const runTestQuery = async () => {
    if (!testQuery.trim()) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.rpc('rpc_kb_search', {
        query_text: testQuery,
        max_results: 5
      });
      if (error) throw error;
      setTestResults(data || []);
    } catch (err: any) {
      toast.error('Error en búsqueda: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'FAQ': return 'bg-blue-500 text-white';
      case 'ARTICLE': return 'bg-purple-500 text-white';
      case 'DOCUMENT': return 'bg-green-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Tipo</Label>
                  <Select value={formData.item_type} onValueChange={(v) => setFormData({ ...formData, item_type: v })}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border">
                      {ITEM_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="text-foreground">{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Categoría</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
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
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Título / Pregunta</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="¿Cómo puedo participar?"
                  required
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Contenido / Respuesta</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Para participar debes comprar un TV Skyworth participante..."
                  required
                  rows={6}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Tags (separados por coma)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="promoción, registro, sorteo"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
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
                    <span className="text-foreground font-medium">{result.title}</span>
                    <Badge variant="secondary" className="text-xs">{result.category}</Badge>
                    <span className="text-muted-foreground text-xs ml-auto">Score: {result.rank?.toFixed(4)}</span>
                  </div>
                  <p className="text-muted-foreground text-sm line-clamp-2">{result.content}</p>
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
            placeholder="Buscar por título o contenido..."
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
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-muted-foreground">Título</TableHead>
                <TableHead className="text-muted-foreground">Categoría</TableHead>
                <TableHead className="text-muted-foreground">Tags</TableHead>
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
              ) : items && items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell>
                      <Badge className={getTypeBadgeClass(item.item_type)}>{item.item_type}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground font-medium max-w-xs truncate">
                      {item.title}
                    </TableCell>
                    <TableCell className="text-foreground">{item.category}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? 'default' : 'secondary'}>
                        {item.is_active ? 'Activo' : 'Inactivo'}
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
                          if (confirm('¿Eliminar este item?')) {
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
