import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { API_ENDPOINTS, ConfiguracionDTO } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, Calendar, Link2, MessageSquare, Shield, Save, RefreshCw, Loader2, Mail, Upload } from 'lucide-react';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('campaign');
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  // Fetch all configurations
  const { data: configs, isLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const res = await apiService.get<ConfiguracionDTO[]>(API_ENDPOINTS.ADMIN.CONFIGURACION);
      if (res.error) throw new Error(res.mensaje);
      return res.data;
    }
  });

  // Helper to get value
  const getConfig = (key: string, defaultVal: string = '') => {
    return configs?.find(c => c.clave === key)?.valor || defaultVal;
  };
  
  // Helper to get secret (might be masked)
  const getSecret = (key: string) => {
    return configs?.find(c => c.clave === key)?.valor || '';
  };

  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiService.put(API_ENDPOINTS.ADMIN.CONFIGURACION + `/${key}`, { valor: value });
      if (res.error) throw new Error(res.mensaje);
      return res.data;
    },
    onError: (err) => {
      toast.error(`Error actualizando ${err.message}`);
    }
  });

  const saveConfigs = async (settings: { key: string; value: string }[]) => {
    try {
      await Promise.all(settings.map(s => updateConfigMutation.mutateAsync(s)));
      await queryClient.invalidateQueries({ queryKey: ['admin-config'] });
      toast.success('Configuración guardada correctamente');
    } catch (error) {
       console.error(error);
    }
  };

  const testConnection = async (type: string) => {
    setTestingConnection(type);
    try {
        await new Promise(r => setTimeout(r, 1000));
        toast.success(`Prueba de conexión exitosa para ${type} (Simulado)`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error en ${type}: ${message}`);
    } finally {
      setTestingConnection(null);
    }
  };

  const CampaignTab = () => {
    const [form, setForm] = useState({
      campaign_name: '', campaign_subtitle: '', start_date: '', end_date: '', draw_date: '',
      preselected_count: '20', finalists_count: '5', min_age: '18', terms_url: '', is_active: 'true'
    });

    useEffect(() => {
        if (configs) {
            setForm({
                campaign_name: getConfig('campaign.name'),
                campaign_subtitle: getConfig('campaign.subtitle'),
                start_date: getConfig('campaign.start_date'),
                end_date: getConfig('campaign.end_date'),
                draw_date: getConfig('campaign.draw_date'),
                preselected_count: getConfig('campaign.preselected_count', '20'),
                finalists_count: getConfig('campaign.finalists_count', '5'),
                min_age: getConfig('campaign.min_age', '18'),
                terms_url: getConfig('campaign.terms_url'),
                is_active: getConfig('campaign.is_active', 'true')
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configs]);

    const handleSave = () => {
        saveConfigs([
            { key: 'campaign.name', value: form.campaign_name },
            { key: 'campaign.subtitle', value: form.campaign_subtitle },
            { key: 'campaign.start_date', value: form.start_date },
            { key: 'campaign.end_date', value: form.end_date },
            { key: 'campaign.draw_date', value: form.draw_date },
            { key: 'campaign.preselected_count', value: form.preselected_count },
            { key: 'campaign.finalists_count', value: form.finalists_count },
            { key: 'campaign.min_age', value: form.min_age },
            { key: 'campaign.terms_url', value: form.terms_url },
            { key: 'campaign.is_active', value: form.is_active }
        ]);
    };

    const handleUploadTerms = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const promise = apiService.postFormData<string>(API_ENDPOINTS.ADMIN.CONFIGURACION + '/upload-terms', formData);
            toast.promise(promise, {
                loading: 'Subiendo archivo...',
                success: (res) => {
                    const url = res.data; // URL returned by backend
                    setForm(prev => ({ ...prev, terms_url: url }));
                    return 'Archivo subido correctamente';
                },
                error: 'Error al subir archivo'
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
      <Card className="bg-muted border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Configuración de Campaña
          </CardTitle>
          <CardDescription>Edita los parámetros de la campaña activa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nombre de Campaña</Label><Input value={form.campaign_name} onChange={e => setForm({ ...form, campaign_name: e.target.value })} className="bg-background border-border text-foreground" /></div>
            <div className="space-y-2"><Label>Subtítulo</Label><Input value={form.campaign_subtitle} onChange={e => setForm({ ...form, campaign_subtitle: e.target.value })} className="bg-background border-border text-foreground" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Fecha Inicio</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="bg-background border-border text-foreground" /></div>
            <div className="space-y-2"><Label>Fecha Fin</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="bg-background border-border text-foreground" /></div>
            <div className="space-y-2"><Label>Fecha Sorteo</Label><Input type="date" value={form.draw_date} onChange={e => setForm({ ...form, draw_date: e.target.value })} className="bg-background border-border text-foreground" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Preseleccionados</Label><Input type="number" value={form.preselected_count} onChange={e => setForm({ ...form, preselected_count: e.target.value })} className="bg-background border-border text-foreground" /></div>
            <div className="space-y-2"><Label>Finalistas</Label><Input type="number" value={form.finalists_count} onChange={e => setForm({ ...form, finalists_count: e.target.value })} className="bg-background border-border text-foreground" /></div>
            <div className="space-y-2"><Label>Edad Mínima</Label><Input type="number" value={form.min_age} onChange={e => setForm({ ...form, min_age: e.target.value })} className="bg-background border-border text-foreground" /></div>
          </div>
          <div className="space-y-2">
            <Label>URL Términos</Label>
            <div className="flex gap-2">
                <Input value={form.terms_url} onChange={e => setForm({ ...form, terms_url: e.target.value })} className="bg-background border-border text-foreground" />
                <div className="relative shrink-0">
                    <Input 
                        type="file" 
                        accept=".pdf" 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        onChange={handleUploadTerms} 
                    />
                    <Button type="button" variant="outline" className="w-full">
                        <Upload className="h-4 w-4 mr-2" /> Subir PDF
                    </Button>
                </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3"><Switch checked={form.is_active === 'true'} onCheckedChange={c => setForm({ ...form, is_active: c.toString() })} /><Label>Campaña Activa</Label></div>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground"><Save className="h-4 w-4 mr-2" /> Guardar Campaña</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Define types for dynamic forms
  interface IntegrationForm {
    geminiKey: string;
    geminiModel: string;
    botEnabled: string;
    geminiMaxTokens: string;
    geminiValEnabled: string;
    geminiStrict: string;
    geminiVerifEnabled: string;
    waProvider: string;
    waApiUrl: string;
    waToken: string;
    waPhoneId: string;
    waEnabled: string;
    waSmsEnabled: string;
    waTplName: string;
    waTplLang: string;
    resendApiKey: string;
    smtpFrom: string;
    smtpEnabled: string;
    [key: string]: string; // Allow indexing
  }

  interface EmailForm {
    resendKey: string;
    mailUser: string;
    emailEnabled: string;
    mailProvider: string;
    gmailHost: string;
    gmailPort: string;
    gmailUser: string;
    gmailPass: string;
    gmailFrom: string;
    gmailFromName: string;
    contabolHost: string;
    contabolPort: string;
    contabolUser: string;
    contabolPass: string;
    contabolFrom: string;
    contabolFromName: string;
    springHost: string;
    springPort: string;
    springUser: string;
    springPass: string;
    [key: string]: string;
  }

  const IntegrationsTab = () => {
    // Local state for inputs
    const [form, setForm] = useState<IntegrationForm>({} as IntegrationForm);

    useEffect(() => {
        if (configs) {
            setForm({
                geminiKey: getSecret('gemini.api.key'),
                geminiModel: getConfig('gemini.model', 'gemini-pro-vision'),
                botEnabled: getConfig('bot.enabled', 'false'),
                geminiMaxTokens: getConfig('gemini.max.tokens', '2048'),
                geminiValEnabled: getConfig('gemini.validation.enabled', 'false'),
                geminiStrict: getConfig('gemini.validation.strict', 'false'),
                geminiVerifEnabled: getConfig('gemini.verification.enabled', 'false'),
                waProvider: getConfig('whatsapp.provider', 'meta'),
                waApiUrl: getConfig('whatsapp.api.url'),
                waToken: getSecret('whatsapp.bearer.token'),
                waPhoneId: getConfig('whatsapp.phone.number.id'),
                waEnabled: getConfig('whatsapp.enabled', 'false'),
                waSmsEnabled: getConfig('whatsapp.sms.enabled', 'false'),
                waTplName: getConfig('whatsapp.template.name'),
                waTplLang: getConfig('whatsapp.template.language', 'es_MX'),
                resendApiKey: getSecret('resend.api.key'),
                smtpFrom: getConfig('mail.username'),
                smtpEnabled: getConfig('email.enabled', 'false')
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configs]);

    return (
      <div className="space-y-6">
        <Card className="bg-muted border-border">
          <CardHeader><CardTitle className="flex items-center gap-2 text-foreground">🤖 Gemini AI</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-foreground">API Key</Label><Input type="password" value={form.geminiKey || ''} onChange={e => setForm({...form, geminiKey: e.target.value})} className="bg-background border-border text-foreground" /></div>
              <div className="space-y-2"><Label className="text-foreground">Modelo</Label><Input value={form.geminiModel || ''} onChange={e => setForm({...form, geminiModel: e.target.value})} className="bg-background border-border text-foreground" /></div>
              <div className="space-y-2"><Label className="text-foreground">Max Tokens</Label><Input value={form.geminiMaxTokens || ''} onChange={e => setForm({...form, geminiMaxTokens: e.target.value})} className="bg-background border-border text-foreground" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="flex items-center gap-2"><Switch checked={form.geminiValEnabled === 'true'} onCheckedChange={c => setForm({...form, geminiValEnabled: c.toString()})} /><Label className="text-foreground">Validación Imágenes</Label></div>
               <div className="flex items-center gap-2"><Switch checked={form.geminiStrict === 'true'} onCheckedChange={c => setForm({...form, geminiStrict: c.toString()})} /><Label className="text-foreground">Modo Estricto</Label></div>
               <div className="flex items-center gap-2"><Switch checked={form.geminiVerifEnabled === 'true'} onCheckedChange={c => setForm({...form, geminiVerifEnabled: c.toString()})} /><Label className="text-foreground">Verificación Secundaria</Label></div>
               <div className="flex items-center gap-2"><Switch checked={form.botEnabled === 'true'} onCheckedChange={c => setForm({...form, botEnabled: c.toString()})} /><Label className="text-foreground">Bot Activado (Legacy)</Label></div>
            </div>
            <Button onClick={() => saveConfigs([
                {key: 'gemini.api.key', value: form.geminiKey}, {key: 'gemini.model', value: form.geminiModel}, {key: 'gemini.max.tokens', value: form.geminiMaxTokens},
                {key: 'gemini.validation.enabled', value: form.geminiValEnabled}, {key: 'gemini.validation.strict', value: form.geminiStrict},
                {key: 'gemini.verification.enabled', value: form.geminiVerifEnabled}, {key: 'bot.enabled', value: form.botEnabled}
            ])} className="bg-primary text-primary-foreground"><Save className="h-4 w-4 mr-2" /> Guardar Gemini</Button>
          </CardContent>
        </Card>

        <Card className="bg-muted border-border">
          <CardHeader><CardTitle className="flex items-center gap-2 text-foreground">📱 WhatsApp</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-foreground">Proveedor</Label><Input value={form.waProvider || ''} onChange={e => setForm({...form, waProvider: e.target.value})} className="bg-background border-border text-foreground" /></div>
              <div className="space-y-2"><Label className="text-foreground">API URL</Label><Input value={form.waApiUrl || ''} onChange={e => setForm({...form, waApiUrl: e.target.value})} className="bg-background border-border text-foreground" /></div>
              <div className="space-y-2"><Label className="text-foreground">Token</Label><Input type="password" value={form.waToken || ''} onChange={e => setForm({...form, waToken: e.target.value})} className="bg-background border-border text-foreground" /></div>
              <div className="space-y-2"><Label className="text-foreground">Phone ID</Label><Input value={form.waPhoneId || ''} onChange={e => setForm({...form, waPhoneId: e.target.value})} className="bg-background border-border text-foreground" /></div>
              <div className="space-y-2"><Label className="text-foreground">Template Name</Label><Input value={form.waTplName || ''} onChange={e => setForm({...form, waTplName: e.target.value})} className="bg-background border-border text-foreground" /></div>
              <div className="space-y-2"><Label className="text-foreground">Template Lang</Label><Input value={form.waTplLang || ''} onChange={e => setForm({...form, waTplLang: e.target.value})} className="bg-background border-border text-foreground" /></div>
            </div>
            <div className="flex gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.waEnabled === 'true'} onCheckedChange={c => setForm({...form, waEnabled: c.toString()})} /><Label className="text-foreground">WhatsApp Habilitado</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.waSmsEnabled === 'true'} onCheckedChange={c => setForm({...form, waSmsEnabled: c.toString()})} /><Label className="text-foreground">Envío Mensajes Activo</Label></div>
            </div>
            <Button onClick={() => saveConfigs([
                {key: 'whatsapp.provider', value: form.waProvider}, {key: 'whatsapp.api.url', value: form.waApiUrl}, {key: 'whatsapp.bearer.token', value: form.waToken},
                {key: 'whatsapp.phone.number.id', value: form.waPhoneId}, {key: 'whatsapp.template.name', value: form.waTplName}, {key: 'whatsapp.template.language', value: form.waTplLang},
                {key: 'whatsapp.enabled', value: form.waEnabled}, {key: 'whatsapp.sms.enabled', value: form.waSmsEnabled}
            ])} className="bg-primary text-primary-foreground"><Save className="h-4 w-4 mr-2" /> Guardar WhatsApp</Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  const EmailTab = () => {
    const [form, setForm] = useState<EmailForm>({} as EmailForm);
    useEffect(() => {
        if (configs) {
            setForm({
                resendKey: getSecret('resend.api.key'),
                mailUser: getConfig('mail.username'),
                emailEnabled: getConfig('email.enabled', 'false'),
                mailProvider: getConfig('mail.provider', 'CONTABOL'),
                gmailHost: getConfig('gmail.email.smtp.host'),
                gmailPort: getConfig('gmail.email.smtp.port'),
                gmailUser: getConfig('gmail.email.smtp.username'),
                gmailPass: getSecret('gmail.email.smtp.password'),
                gmailFrom: getConfig('gmail.email.from.address'),
                gmailFromName: getConfig('gmail.email.from.name'),
                contabolHost: getConfig('contabol.email.smtp.host'),
                contabolPort: getConfig('contabol.email.smtp.port'),
                contabolUser: getConfig('contabol.email.smtp.username'),
                contabolPass: getSecret('contabol.email.smtp.password'),
                contabolFrom: getConfig('contabol.email.from.address'),
                contabolFromName: getConfig('contabol.email.from.name'),
                springHost: getConfig('spring.mail.host'),
                springPort: getConfig('spring.mail.port'),
                springUser: getConfig('spring.mail.username'),
                springPass: getSecret('spring.mail.password')
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configs]);

    interface SmtpField {
        label: string;
        key: string;
        stateKey: string;
        type?: string;
    }

    const renderSmtpCard = (title: string, prefix: string, fields: SmtpField[]) => (
        <Card className="bg-muted border-border">
            <CardHeader><CardTitle className="text-sm font-bold uppercase text-muted-foreground">{title}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fields.map((f) => (
                        <div key={f.key} className="space-y-2">
                            <Label className="text-foreground">{f.label}</Label>
                            <Input 
                                type={f.type || 'text'} 
                                value={form[f.stateKey] || ''} 
                                onChange={e => setForm({...form, [f.stateKey]: e.target.value})} 
                                className="bg-background border-border text-foreground"
                            />
                        </div>
                    ))}
                </div>
                <Button onClick={() => saveConfigs(fields.map((f) => ({ key: f.key, value: form[f.stateKey] })))} className="bg-primary text-primary-foreground">
                    <Save className="h-4 w-4 mr-2" /> Guardar {title}
                </Button>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <Card className="bg-muted border-border">
                <CardHeader><CardTitle className="text-foreground">General / Resend</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label className="text-foreground">Resend API Key</Label><Input type="password" value={form.resendKey || ''} onChange={e => setForm({...form, resendKey: e.target.value})} className="bg-background border-border text-foreground" /></div>
                        <div className="space-y-2"><Label className="text-foreground">Mail Username (Global)</Label><Input value={form.mailUser || ''} onChange={e => setForm({...form, mailUser: e.target.value})} className="bg-background border-border text-foreground" /></div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-foreground">Proveedor de Email Activo</Label>
                        <select 
                            value={form.mailProvider || 'CONTABOL'} 
                            onChange={e => setForm({...form, mailProvider: e.target.value})} 
                            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="GMAIL">Gmail</option>
                            <option value="CONTABOL">Contabol</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2"><Switch checked={form.emailEnabled === 'true'} onCheckedChange={c => setForm({...form, emailEnabled: c.toString()})} /><Label className="text-foreground">Email Habilitado (Global)</Label></div>
                    <Button onClick={() => saveConfigs([{key: 'resend.api.key', value: form.resendKey}, {key: 'mail.username', value: form.mailUser}, {key: 'email.enabled', value: form.emailEnabled}, {key: 'mail.provider', value: form.mailProvider}])} className="bg-primary text-primary-foreground">
                        <Save className="h-4 w-4 mr-2" /> Guardar General
                    </Button>
                </CardContent>
            </Card>

            {renderSmtpCard('Gmail', 'gmail', [
                {label: 'Host', key: 'gmail.email.smtp.host', stateKey: 'gmailHost'}, {label: 'Port', key: 'gmail.email.smtp.port', stateKey: 'gmailPort'},
                {label: 'User', key: 'gmail.email.smtp.username', stateKey: 'gmailUser'}, {label: 'Password', key: 'gmail.email.smtp.password', stateKey: 'gmailPass', type: 'password'},
                {label: 'From Addr', key: 'gmail.email.from.address', stateKey: 'gmailFrom'}, {label: 'From Name', key: 'gmail.email.from.name', stateKey: 'gmailFromName'}
            ])}

            {renderSmtpCard('Contabol', 'contabol', [
                {label: 'Host', key: 'contabol.email.smtp.host', stateKey: 'contabolHost'}, {label: 'Port', key: 'contabol.email.smtp.port', stateKey: 'contabolPort'},
                {label: 'User', key: 'contabol.email.smtp.username', stateKey: 'contabolUser'}, {label: 'Password', key: 'contabol.email.smtp.password', stateKey: 'contabolPass', type: 'password'},
                {label: 'From Addr', key: 'contabol.email.from.address', stateKey: 'contabolFrom'}, {label: 'From Name', key: 'contabol.email.from.name', stateKey: 'contabolFromName'}
            ])}

            {renderSmtpCard('Spring Mail', 'spring', [
                {label: 'Host', key: 'spring.mail.host', stateKey: 'springHost'}, {label: 'Port', key: 'spring.mail.port', stateKey: 'springPort'},
                {label: 'User', key: 'spring.mail.username', stateKey: 'springUser'}, {label: 'Password', key: 'spring.mail.password', stateKey: 'springPass', type: 'password'}
            ])}
        </div>
    );
  };

  const TemplatesTab = () => {
    const templateConfigs = configs?.filter(c => c.clave.startsWith('template.')) || [];
    return (
      <Card className="bg-muted border-border">
        <CardHeader><CardTitle className="text-foreground">Plantillas</CardTitle><CardDescription>Plantillas de sistema</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            {templateConfigs.length > 0 ? templateConfigs.map(conf => (
                <div key={conf.id} className="p-4 border border-border rounded-lg space-y-2">
                    <Label className="text-foreground">{conf.clave}</Label>
                    <Textarea defaultValue={conf.valor} onBlur={e => { if (e.target.value !== conf.valor) saveConfigs([{ key: conf.clave, value: e.target.value }]); }} className="bg-background border-border text-foreground font-mono text-sm" />
                    <p className="text-xs text-muted-foreground">{conf.descripcion}</p>
                </div>
            )) : <p className="text-muted-foreground">No hay plantillas con prefijo template.*</p>}
        </CardContent>
      </Card>
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
            <CardDescription>Configuración de seguridad y límites de uso (Gestionado por Backend)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="p-4 rounded-lg bg-background/50">
                <p className="text-muted-foreground">La seguridad es gestionada por el backend. Los límites están hardcoded o en variables de entorno.</p>
             </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"><Settings className="h-8 w-8 text-primary" /> Configuración</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted border-border">
          <TabsTrigger value="campaign" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Calendar className="h-4 w-4 mr-2" /> Campaña</TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Link2 className="h-4 w-4 mr-2" /> Integraciones</TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Mail className="h-4 w-4 mr-2" /> Email</TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><MessageSquare className="h-4 w-4 mr-2" /> Plantillas</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Shield className="h-4 w-4 mr-2" /> Seguridad</TabsTrigger>
        </TabsList>
        <TabsContent value="campaign" className="mt-6"><CampaignTab /></TabsContent>
        <TabsContent value="integrations" className="mt-6"><IntegrationsTab /></TabsContent>
        <TabsContent value="email" className="mt-6"><EmailTab /></TabsContent>
        <TabsContent value="templates" className="mt-6"><TemplatesTab /></TabsContent>
        <TabsContent value="security" className="mt-6"><SecurityTab /></TabsContent>
      </Tabs>
    </div>
  );
}
