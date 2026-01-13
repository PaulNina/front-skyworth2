import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, Calendar, Link2, MessageSquare, Shield, Save, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type CampaignSettings = Tables<'campaign_settings'>;
type SecureSetting = Tables<'secure_settings'>;
type NotificationTemplate = Tables<'notification_templates'>;

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('campaign');
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  // Fetch campaign settings
  const { data: campaign, isLoading: loadingCampaign } = useQuery({
    queryKey: ['admin-campaign-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data as CampaignSettings | null;
    }
  });

  // Fetch secure settings
  const { data: secureSettings, isLoading: loadingSecure } = useQuery({
    queryKey: ['admin-secure-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secure_settings')
        .select('*');
      if (error) throw error;
      return data as SecureSetting[];
    }
  });

  // Fetch notification templates
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['admin-notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('template_key');
      if (error) throw error;
      return data as NotificationTemplate[];
    }
  });

  const getSettingValue = (key: string) => {
    return secureSettings?.find(s => s.setting_key === key)?.setting_value || '';
  };

  // Campaign mutation
  const campaignMutation = useMutation({
    mutationFn: async (data: Partial<CampaignSettings>) => {
      if (!campaign?.id) throw new Error('No campaign found');
      const { error } = await supabase
        .from('campaign_settings')
        .update(data)
        .eq('id', campaign.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-settings'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-settings'] });
      toast.success('Campaña actualizada');
    },
    onError: (err) => toast.error('Error: ' + err.message)
  });

  // Secure settings mutation
  const secureSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: string; description?: string }) => {
      const existing = secureSettings?.find(s => s.setting_key === key);
      if (existing) {
        const { error } = await supabase
          .from('secure_settings')
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('secure_settings')
          .insert({ setting_key: key, setting_value: value, description });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-secure-settings'] });
      toast.success('Configuración guardada');
    },
    onError: (err) => toast.error('Error: ' + err.message)
  });

  // Template mutation
  const templateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<NotificationTemplate> & { id: string }) => {
      const { error } = await supabase
        .from('notification_templates')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notification-templates'] });
      toast.success('Plantilla actualizada');
    },
    onError: (err) => toast.error('Error: ' + err.message)
  });

  const testConnection = async (type: 'gemini' | 'whatsapp' | 'smtp') => {
    setTestingConnection(type);
    try {
      const { data, error } = await supabase.functions.invoke(`test-${type}`, {
        body: {}
      });
      if (error) throw error;
      toast.success(`Conexión ${type.toUpperCase()} exitosa`);
    } catch (err: any) {
      toast.error(`Error en ${type}: ${err.message}`);
    } finally {
      setTestingConnection(null);
    }
  };

  const CampaignTab = () => {
    const [form, setForm] = useState({
      campaign_name: campaign?.campaign_name || '',
      campaign_subtitle: campaign?.campaign_subtitle || '',
      start_date: campaign?.start_date?.split('T')[0] || '',
      end_date: campaign?.end_date?.split('T')[0] || '',
      draw_date: campaign?.draw_date?.split('T')[0] || '',
      preselected_count: campaign?.preselected_count || 20,
      finalists_count: campaign?.finalists_count || 5,
      min_age: campaign?.min_age || 18,
      terms_url: campaign?.terms_url || '',
      is_active: campaign?.is_active ?? true
    });

    return (
      <div className="space-y-6">
        <Card className="bg-muted border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Configuración de Campaña
            </CardTitle>
            <CardDescription>Edita los parámetros de la campaña activa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Nombre de Campaña</Label>
                <Input
                  value={form.campaign_name}
                  onChange={(e) => setForm({ ...form, campaign_name: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Subtítulo</Label>
                <Input
                  value={form.campaign_subtitle}
                  onChange={(e) => setForm({ ...form, campaign_subtitle: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Fecha Inicio</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Fecha Fin</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Fecha Sorteo</Label>
                <Input
                  type="date"
                  value={form.draw_date}
                  onChange={(e) => setForm({ ...form, draw_date: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Preseleccionados</Label>
                <Input
                  type="number"
                  value={form.preselected_count}
                  onChange={(e) => setForm({ ...form, preselected_count: parseInt(e.target.value) })}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Finalistas</Label>
                <Input
                  type="number"
                  value={form.finalists_count}
                  onChange={(e) => setForm({ ...form, finalists_count: parseInt(e.target.value) })}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Edad Mínima</Label>
                <Input
                  type="number"
                  value={form.min_age}
                  onChange={(e) => setForm({ ...form, min_age: parseInt(e.target.value) })}
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">URL Términos y Condiciones</Label>
              <Input
                value={form.terms_url}
                onChange={(e) => setForm({ ...form, terms_url: e.target.value })}
                placeholder="https://..."
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <Label className="text-foreground">Campaña Activa</Label>
              </div>
              <Button
                onClick={() => campaignMutation.mutate(form)}
                disabled={campaignMutation.isPending}
                className="bg-primary text-primary-foreground"
              >
                <Save className="h-4 w-4 mr-2" />
                {campaignMutation.isPending ? 'Guardando...' : 'Guardar Campaña'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const IntegrationsTab = () => {
    const [geminiKey, setGeminiKey] = useState(getSettingValue('GEMINI_API_KEY'));
    const [geminiModel, setGeminiModel] = useState(getSettingValue('GEMINI_MODEL') || 'gemini-pro-vision');
    const [botEnabled, setBotEnabled] = useState(getSettingValue('BOT_ENABLED') === 'true');
    const [waProvider, setWaProvider] = useState(getSettingValue('WHATSAPP_PROVIDER') || 'meta');
    const [waApiUrl, setWaApiUrl] = useState(getSettingValue('WHATSAPP_API_URL'));
    const [waToken, setWaToken] = useState(getSettingValue('WHATSAPP_TOKEN'));
    const [waPhoneId, setWaPhoneId] = useState(getSettingValue('WHATSAPP_PHONE_ID'));
    const [waEnabled, setWaEnabled] = useState(getSettingValue('WHATSAPP_ENABLED') === 'true');
    const [resendApiKey, setResendApiKey] = useState(getSettingValue('RESEND_API_KEY'));
    const [smtpFrom, setSmtpFrom] = useState(getSettingValue('SMTP_FROM'));
    const [smtpEnabled, setSmtpEnabled] = useState(getSettingValue('EMAIL_ENABLED') === 'true');

    const saveIntegration = (settings: { key: string; value: string; description?: string }[]) => {
      settings.forEach(s => secureSettingMutation.mutate(s));
    };

    return (
      <div className="space-y-6">
        {/* Gemini */}
        <Card className="bg-muted border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                🤖 Gemini AI
              </CardTitle>
              <Badge variant={botEnabled ? 'default' : 'secondary'}>
                {botEnabled ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">API Key</Label>
                <Input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Modelo</Label>
                <Input
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch checked={botEnabled} onCheckedChange={setBotEnabled} />
                <Label className="text-foreground">Bot Habilitado</Label>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => testConnection('gemini')}
                  disabled={testingConnection === 'gemini'}
                >
                  {testingConnection === 'gemini' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2">Probar</span>
                </Button>
                <Button
                  onClick={() => saveIntegration([
                    { key: 'GEMINI_API_KEY', value: geminiKey, description: 'Gemini API Key' },
                    { key: 'GEMINI_MODEL', value: geminiModel, description: 'Gemini Model' },
                    { key: 'BOT_ENABLED', value: botEnabled.toString(), description: 'Bot Enabled' }
                  ])}
                  className="bg-primary text-primary-foreground"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp */}
        <Card className="bg-muted border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                📱 WhatsApp
              </CardTitle>
              <Badge variant={waEnabled ? 'default' : 'secondary'}>
                {waEnabled ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Proveedor</Label>
                <Input
                  value={waProvider}
                  onChange={(e) => setWaProvider(e.target.value)}
                  placeholder="meta / twilio"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">API URL</Label>
                <Input
                  value={waApiUrl}
                  onChange={(e) => setWaApiUrl(e.target.value)}
                  placeholder="https://graph.facebook.com/v18.0"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Token</Label>
                <Input
                  type="password"
                  value={waToken}
                  onChange={(e) => setWaToken(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Phone ID</Label>
                <Input
                  value={waPhoneId}
                  onChange={(e) => setWaPhoneId(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch checked={waEnabled} onCheckedChange={setWaEnabled} />
                <Label className="text-foreground">WhatsApp Habilitado</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => testConnection('whatsapp')} disabled={testingConnection === 'whatsapp'}>
                  {testingConnection === 'whatsapp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2">Probar</span>
                </Button>
                <Button
                  onClick={() => saveIntegration([
                    { key: 'WHATSAPP_PROVIDER', value: waProvider },
                    { key: 'WHATSAPP_API_URL', value: waApiUrl },
                    { key: 'WHATSAPP_TOKEN', value: waToken },
                    { key: 'WHATSAPP_PHONE_ID', value: waPhoneId },
                    { key: 'WHATSAPP_ENABLED', value: waEnabled.toString() }
                  ])}
                  className="bg-primary text-primary-foreground"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email (Resend) */}
        <Card className="bg-muted border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                ✉️ Email (Resend)
              </CardTitle>
              <Badge variant={smtpEnabled ? 'default' : 'secondary'}>
                {smtpEnabled ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <CardDescription>
              Usa <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Resend</a> para enviar emails. 
              El API Key ya está configurado como secreto del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">API Key de Resend (opcional - ya configurado)</Label>
                <Input
                  type="password"
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  placeholder="re_xxxxxxxxxx (opcional si ya está en secretos)"
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Déjalo vacío para usar el secreto del sistema. Solo llena si quieres sobrescribirlo.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Email Remitente</Label>
                <Input
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="promo@skyworth.com"
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  El dominio debe estar verificado en Resend
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch checked={smtpEnabled} onCheckedChange={setSmtpEnabled} />
                <Label className="text-foreground">Email Habilitado</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => testConnection('smtp')} disabled={testingConnection === 'smtp'}>
                  {testingConnection === 'smtp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2">Probar</span>
                </Button>
                <Button
                  onClick={() => {
                    const settings = [
                      { key: 'SMTP_FROM', value: smtpFrom },
                      { key: 'EMAIL_ENABLED', value: smtpEnabled.toString() }
                    ];
                    if (resendApiKey) {
                      settings.push({ key: 'RESEND_API_KEY', value: resendApiKey });
                    }
                    saveIntegration(settings);
                  }}
                  className="bg-primary text-primary-foreground"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const TemplatesTab = () => {
    const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
    const [editForm, setEditForm] = useState({ subject: '', content_text: '', content_html: '' });

    const startEdit = (template: NotificationTemplate) => {
      setEditingTemplate(template);
      setEditForm({
        subject: template.subject || '',
        content_text: template.content_text,
        content_html: template.content_html || ''
      });
    };

    const saveTemplate = () => {
      if (!editingTemplate) return;
      templateMutation.mutate({
        id: editingTemplate.id,
        subject: editForm.subject || null,
        content_text: editForm.content_text,
        content_html: editForm.content_html || null
      });
      setEditingTemplate(null);
    };

    return (
      <div className="space-y-6">
        {templates?.map((template) => (
          <Card key={template.id} className="bg-muted border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">{template.template_name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{template.template_key}</Badge>
                    <Badge variant="secondary">{template.channel}</Badge>
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => startEdit(template)}>
                  Editar
                </Button>
              </div>
            </CardHeader>
            {editingTemplate?.id === template.id && (
              <CardContent className="space-y-4 border-t border-border pt-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Asunto (Email)</Label>
                  <Input
                    value={editForm.subject}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Contenido (Texto/WhatsApp)</Label>
                  <Textarea
                    value={editForm.content_text}
                    onChange={(e) => setEditForm({ ...editForm, content_text: e.target.value })}
                    rows={6}
                    className="bg-background border-border text-foreground font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Contenido HTML (Email)</Label>
                  <Textarea
                    value={editForm.content_html}
                    onChange={(e) => setEditForm({ ...editForm, content_html: e.target.value })}
                    rows={4}
                    className="bg-background border-border text-foreground font-mono text-sm"
                  />
                </div>
                <div className="text-muted-foreground text-sm">
                  Placeholders disponibles: {template.placeholders?.map(p => `{${p}}`).join(', ')}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancelar</Button>
                  <Button onClick={saveTemplate} className="bg-primary text-primary-foreground">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Plantilla
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const SecurityTab = () => {
    return (
      <div className="space-y-6">
        <Card className="bg-muted border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Rate Limiting & Antifraude
            </CardTitle>
            <CardDescription>Configuración de seguridad y límites de uso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-background/50">
                <h4 className="text-foreground font-medium mb-2">Validación IA</h4>
                <p className="text-muted-foreground text-sm">
                  Límite: 10 solicitudes por IP cada 15 minutos
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background/50">
                <h4 className="text-foreground font-medium mb-2">Chat Bot</h4>
                <p className="text-muted-foreground text-sm">
                  Límite: 20 mensajes por sesión cada 5 minutos
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background/50">
                <h4 className="text-foreground font-medium mb-2">Registro de Compras</h4>
                <p className="text-muted-foreground text-sm">
                  Límite: 3 intentos por IP cada hora
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background/50">
                <h4 className="text-foreground font-medium mb-2">Duplicados</h4>
                <p className="text-muted-foreground text-sm">
                  UNIQUE constraint en serial_number + invoice_number
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <h4 className="text-foreground font-medium mb-3">Validaciones Activas</h4>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-secondary text-secondary-foreground">✓ Edad +18 años</Badge>
                <Badge className="bg-secondary text-secondary-foreground">✓ Tickets únicos del pool</Badge>
                <Badge className="bg-secondary text-secondary-foreground">✓ RLS en todas las tablas</Badge>
                <Badge className="bg-secondary text-secondary-foreground">✓ Documentos privados</Badge>
                <Badge className="bg-secondary text-secondary-foreground">✓ Validación IA de facturas</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loadingCampaign || loadingSecure || loadingTemplates) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        Configuración
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted border-border">
          <TabsTrigger value="campaign" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            Campaña
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Link2 className="h-4 w-4 mr-2" />
            Integraciones
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MessageSquare className="h-4 w-4 mr-2" />
            Plantillas
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="h-4 w-4 mr-2" />
            Seguridad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaign" className="mt-6">
          <CampaignTab />
        </TabsContent>
        <TabsContent value="integrations" className="mt-6">
          <IntegrationsTab />
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="security" className="mt-6">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
