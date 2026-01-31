import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Send, User, MessageCircle, Phone, Clock, Loader2, RefreshCcw, Zap, Megaphone, Trash2, Plus, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { API_ENDPOINTS, WhatsAppMessage, QuickReply, Campaign } from '@/config/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminWhatsApp() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("chat");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Quick Replies State ---
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [newQr, setNewQr] = useState({ keyword: '', messageContent: '' });
  const [showQrPicker, setShowQrPicker] = useState(false);

  // --- Campaign State ---
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ 
    name: '', 
    templateName: 'generic_notification', 
    filters: { ciudad: '' } 
  });

  // --- Fetch Data ---
  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ['whatsapp-conversations'],
    queryFn: async () => {
        try {
            const response = await apiService.get<string[]>(API_ENDPOINTS.WHATSAPP_CHAT.CONVERSATIONS);
            if (response.error) {
                console.error("Error fetching conversations:", response.mensaje);
                return [];
            }
            return response.data || [];
        } catch (e) {
            console.error("Fetch error:", e);
            return [];
        }
    },
    refetchInterval: 30000,
  });

  const { data: messagesPage, isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['whatsapp-messages', selectedPhone],
    queryFn: async () => {
      if (!selectedPhone) return null;
      const response = await apiService.get<{ content: WhatsAppMessage[] }>(`${API_ENDPOINTS.WHATSAPP_CHAT.MESSAGES(selectedPhone)}?size=100`);
      return response.data;
    },
    enabled: !!selectedPhone,
    refetchInterval: 5000,
  });

  // ... (rest of queries) ...
  
  // (Assuming mutation logic is unchanged, skipping lines purely for brevity in this replacement block if possible, but I need to be careful with replace_file_content contiguous requirement. 
  // It seems safer to just replace the top part where state is defined, and then the return block where layout is defined.
  // I will split this into 2 edits.)

  // EDIT 1: State definition for isSidebarOpen


  const { data: quickReplies } = useQuery({
    queryKey: ['whatsapp-quick-replies'],
    queryFn: async () => {
      const res = await apiService.get<QuickReply[]>(API_ENDPOINTS.WHATSAPP_CHAT.QUICK_REPLIES);
      return res.data || [];
    }
  });

  const { data: campaigns } = useQuery({
    queryKey: ['whatsapp-campaigns'],
    queryFn: async () => {
      const res = await apiService.get<Campaign[]>(API_ENDPOINTS.WHATSAPP_CHAT.CAMPAIGNS);
      return res.data || [];
    }
  });

  const messages = messagesPage?.content 
    ? [...messagesPage.content].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateA - dateB;
    }) 
    : [];

  // --- Mutations ---
  const sendMessageMutation = useMutation({
    mutationFn: async ({ phone, text }: { phone: string; text: string }) => {
      const payload = { phoneNumber: phone, message: text };
      const res = await apiService.post(API_ENDPOINTS.WHATSAPP_CHAT.SEND, payload);
      if (res.error) throw new Error(res.mensaje);
      return res.data;
    },
    onSuccess: () => {
      setNewMessage('');
      setShowQrPicker(false);
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', selectedPhone] });
    },
    onError: (error) => toast.error('Error: ' + error.message)
  });

  const createQrMutation = useMutation({
    mutationFn: async (data: typeof newQr) => {
        const res = await apiService.post(API_ENDPOINTS.WHATSAPP_CHAT.QUICK_REPLIES, data);
        if (res.error) throw new Error(res.mensaje);
        return res.data;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies'] });
        setIsQrDialogOpen(false);
        setNewQr({ keyword: '', messageContent: '' });
        toast.success("Respuesta rápida creada");
    }
  });

  const deleteQrMutation = useMutation({
    mutationFn: async (id: number) => {
        await apiService.delete(`${API_ENDPOINTS.WHATSAPP_CHAT.QUICK_REPLIES}/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies'] })
  });

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
        const payload = {
            name: newCampaign.name,
            templateName: newCampaign.templateName,
            audienceFilters: JSON.stringify(newCampaign.filters.ciudad ? { ciudad: newCampaign.filters.ciudad } : {})
        };
        const res = await apiService.post(API_ENDPOINTS.WHATSAPP_CHAT.CAMPAIGNS, payload);
        if (res.error) throw new Error(res.mensaje);
        return res.data;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-campaigns'] });
        setIsCampaignDialogOpen(false);
        setNewCampaign({ name: '', templateName: 'generic_notification', filters: { ciudad: '' } });
        toast.success("Campaña creada");
    }
  });

  const executeCampaignMutation = useMutation({
      mutationFn: async (id: number) => {
          const res = await apiService.post(API_ENDPOINTS.WHATSAPP_CHAT.EXECUTE_CAMPAIGN(id), {});
          if (res.error) throw new Error(res.mensaje);
      },
      onSuccess: () => {
          toast.success("Campaña iniciada");
          setTimeout(() => queryClient.invalidateQueries({ queryKey: ['whatsapp-campaigns'] }), 2000);
      }
  });

  // --- Handlers ---
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhone || !newMessage.trim()) return;
    sendMessageMutation.mutate({ phone: selectedPhone, text: newMessage });
  };

  const insertQr = (text: string) => {
      setNewMessage(text);
      setShowQrPicker(false);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (isoString: string) => {
    try { return format(new Date(isoString), "d MMM HH:mm", { locale: es }); } catch { return isoString; }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <TabsList>
                <TabsTrigger value="chat" className="flex gap-2"><MessageCircle className="w-4 h-4"/> Chat</TabsTrigger>
                <TabsTrigger value="campaigns" className="flex gap-2"><Megaphone className="w-4 h-4"/> Campañas</TabsTrigger>
                <TabsTrigger value="tools" className="flex gap-2"><Zap className="w-4 h-4"/> Herramientas</TabsTrigger>
            </TabsList>
        </div>

        {/* --- CHAT TAB --- */}
        <TabsContent value="chat" className="flex-1 flex gap-4 overflow-hidden mt-0 data-[state=inactive]:hidden">
             {/* Sidebar - Collapsible with animation */}
            <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-full md:w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                <Card className="flex flex-col bg-muted/30 border-border h-full w-full min-w-[320px]">
                    <div className="p-4 border-b border-border bg-card flex justify-between items-center">
                        <h2 className="font-semibold text-sm">Chats ({conversations?.length || 0})</h2>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })}>
                                <RefreshCcw className={`w-3 h-3 ${loadingConversations ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSidebarOpen(false)} title="Ocultar barra lateral">
                                <PanelLeftClose className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 bg-card overflow-y-auto">
                        <div className="divide-y divide-border">
                        {conversations?.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">
                                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-xs">No hay conversaciones aún.</p>
                                <p className="text-[10px] opacity-70 mt-1">Los mensajes entrantes aparecerán aquí.</p>
                            </div>
                        )}
                        {conversations?.map((phone) => (
                            <button
                            key={phone}
                            onClick={() => {
                                setSelectedPhone(phone);
                                // Auto-close on mobile
                                if (window.innerWidth < 768) setIsSidebarOpen(false);
                            }}
                            className={`w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left ${
                                selectedPhone === phone ? 'bg-primary/10 border-l-4 border-primary' : ''
                            }`}
                            >
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-green-100 text-green-700 font-bold text-xs">
                                    <User className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <p className="font-medium text-sm truncate">{phone}</p>
                                <p className="text-[10px] text-muted-foreground">WhatsApp User</p>
                            </div>
                            </button>
                        ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Chat */}
            <Card className="flex-1 flex flex-col border-border h-full bg-card shadow-sm overflow-hidden transition-all duration-300">
                {selectedPhone ? (
                <>
                    <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
                        <div className="flex items-center gap-3">
                            {!isSidebarOpen && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 mr-2" onClick={() => setIsSidebarOpen(true)} title="Mostrar barra lateral">
                                    <PanelLeftOpen className="w-4 h-4" />
                                </Button>
                            )}
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                                {selectedPhone.slice(-2)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-semibold text-sm">{selectedPhone}</h3>
                                <p className="text-[10px] text-green-600 flex items-center gap-1">En línea</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => refetchMessages()}>
                            <RefreshCcw className={`w-3 h-3 ${loadingMessages ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>

                    <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-950/50 overflow-y-auto" ref={scrollRef}>
                        <div className="space-y-4">
                            {messages.map((msg) => {
                            const isMe = msg.direction === 'OUTBOUND';
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-xl px-3 py-2 shadow-sm text-sm ${
                                    isMe 
                                    ? 'bg-green-600 text-white rounded-tr-none' 
                                    : 'bg-white dark:bg-slate-800 border border-border rounded-tl-none'
                                }`}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                                        isMe ? 'text-green-100' : 'text-muted-foreground'
                                    }`}>
                                        <span>{formatTime(msg.timestamp)}</span>
                                        {isMe && <span>✓</span>}
                                    </div>
                                </div>
                                </div>
                            );
                            })}
                        </div>
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-border bg-card relative">
                        {showQrPicker && (
                            <div className="absolute bottom-full left-0 m-2 w-64 bg-popover border border-border shadow-lg rounded-lg max-h-48 overflow-y-auto z-10">
                                <div className="p-2 text-xs font-semibold text-muted-foreground border-b bg-muted/50">Respuestas Rápidas</div>
                                {quickReplies?.map(qr => (
                                    <button 
                                        key={qr.id}
                                        className="w-full text-left p-2 hover:bg-muted text-xs truncate"
                                        onClick={() => insertQr(qr.messageContent)}
                                    >
                                        <span className="font-bold text-primary mr-1">{qr.keyword}</span>
                                        {qr.messageContent.substring(0, 30)}...
                                    </button>
                                ))}
                            </div>
                        )}
                        <form onSubmit={handleSend} className="flex gap-2">
                             <Button 
                                type="button" 
                                size="icon" 
                                variant="outline"
                                onClick={() => setShowQrPicker(!showQrPicker)}
                                title="Respuestas Rápidas"
                            >
                                <Zap className="w-4 h-4 text-amber-500" />
                            </Button>
                            <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Escribe un mensaje..."
                                className="flex-1"
                                disabled={sendMessageMutation.isPending}
                            />
                            <Button 
                                type="submit" 
                                size="icon" 
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                            >
                                {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                            </Button>
                        </form>
                    </div>
                </>
                ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 bg-muted/10">
                    <div className="bg-muted/30 p-4 rounded-full mb-4">
                        <MessageCircle className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">WhatsApp Admin</h3>
                    <p className="text-sm max-w-xs text-center">Selecciona un chat de la izquierda para ver el historial y responder.</p>
                </div>
                )}
            </Card>
        </TabsContent>

        {/* --- CAMPAIGNS TAB --- */}
        <TabsContent value="campaigns" className="mt-0 h-full overflow-hidden flex flex-col data-[state=inactive]:hidden">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold">Campañas de Difusión</h2>
                    <p className="text-muted-foreground text-sm">Envía mensajes masivos a tus vendedores.</p>
                </div>
                <Button onClick={() => setIsCampaignDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Nueva Campaña
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-8">
                {campaigns?.map(campaign => (
                    <Card key={campaign.id} className="bg-card">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{campaign.name}</CardTitle>
                                <Badge variant={campaign.status === 'COMPLETED' ? 'default' : 'secondary'} 
                                       className={campaign.status === 'COMPLETED' ? 'bg-green-600' : ''}>
                                    {campaign.status}
                                </Badge>
                            </div>
                            <CardDescription className="text-xs">
                                Plantilla: <span className="font-mono">{campaign.templateName}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-3 gap-2 text-center text-sm mb-4">
                                <div className="bg-muted/50 p-2 rounded">
                                    <div className="font-bold">{campaign.totalTargets}</div>
                                    <div className="text-[10px] text-muted-foreground">Total</div>
                                </div>
                                <div className="bg-green-500/10 p-2 rounded text-green-600">
                                    <div className="font-bold">{campaign.successfulSends}</div>
                                    <div className="text-[10px]">Enviados</div>
                                </div>
                                <div className="bg-red-500/10 p-2 rounded text-red-600">
                                    <div className="font-bold">{campaign.failedSends}</div>
                                    <div className="text-[10px]">Fallidos</div>
                                </div>
                             </div>
                             {campaign.status === 'DRAFT' && (
                                 <Button 
                                    className="w-full" 
                                    size="sm"
                                    onClick={() => executeCampaignMutation.mutate(campaign.id)}
                                    disabled={executeCampaignMutation.isPending}
                                 >
                                     {executeCampaignMutation.isPending ? 'Procesando...' : 'Iniciar Envío'}
                                 </Button>
                             )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </TabsContent>

        {/* --- TOCS / TOOLS TAB --- */}
         <TabsContent value="tools" className="mt-0 h-full overflow-hidden flex flex-col data-[state=inactive]:hidden">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold">Respuestas Rápidas</h2>
                    <p className="text-muted-foreground text-sm">Gestiona atajos para respuestas frecuentes.</p>
                </div>
                <Button onClick={() => setIsQrDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Nueva Respuesta
                </Button>
            </div>

            <Card>
                <div className="p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Atajo</th>
                                <th className="px-6 py-3">Mensaje</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {quickReplies?.map(qr => (
                                <tr key={qr.id} className="hover:bg-muted/50">
                                    <td className="px-6 py-4 font-mono font-bold text-primary">{qr.keyword}</td>
                                    <td className="px-6 py-4 truncate max-w-md">{qr.messageContent}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                            onClick={() => deleteQrMutation.mutate(qr.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
         </TabsContent>
      </Tabs>

      {/* --- DIALOGS --- */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Nueva Respuesta Rápida</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
                <div>
                    <Label>Atajo (ej. /saludo)</Label>
                    <Input 
                        value={newQr.keyword} 
                        onChange={(e) => setNewQr({...newQr, keyword: e.target.value})}
                        placeholder="/atajo"
                    />
                </div>
                <div>
                     <Label>Mensaje</Label>
                    <Input 
                        value={newQr.messageContent} 
                        onChange={(e) => setNewQr({...newQr, messageContent: e.target.value})}
                        placeholder="El mensaje completo..."
                    />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={() => createQrMutation.mutate(newQr)}>Guardar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
        <DialogContent>
             <DialogHeader>
                <DialogTitle>Nueva Campaña de Difusión</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
                <div>
                    <Label>Nombre de la Campaña</Label>
                    <Input 
                        value={newCampaign.name} 
                        onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                        placeholder="Promoción Enero"
                    />
                </div>
                <div>
                    <Label>Filtrar por Ciudad (Opcional)</Label>
                    <Select 
                        value={newCampaign.filters.ciudad} 
                        onValueChange={(val) => setNewCampaign({...newCampaign, filters: { ciudad: val }})}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Todas las ciudades" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Todas</SelectItem>
                            <SelectItem value="Santa Cruz">Santa Cruz</SelectItem>
                            <SelectItem value="La Paz">La Paz</SelectItem>
                            <SelectItem value="Cochabamba">Cochabamba</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                     <Label>Plantilla (Template)</Label>
                    <Select 
                         value={newCampaign.templateName} 
                         onValueChange={(val) => setNewCampaign({...newCampaign, templateName: val})}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="generic_notification">Notificación Genérica</SelectItem>
                            <SelectItem value="promo_alert">Alerta de Promo</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Por ahora se usará un mensaje de texto simple para pruebas.</p>
                </div>
            </div>
             <DialogFooter>
                <Button onClick={() => createCampaignMutation.mutate()}>Crear Borrador</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
