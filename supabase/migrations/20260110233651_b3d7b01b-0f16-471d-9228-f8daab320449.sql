-- Tabla para plantillas de notificaciones editables desde admin
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  subject TEXT,
  content_text TEXT NOT NULL,
  content_html TEXT,
  channel TEXT NOT NULL DEFAULT 'email', -- 'email', 'whatsapp', 'both'
  placeholders TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Políticas: solo admin puede gestionar
CREATE POLICY "Admin can manage notification templates"
ON public.notification_templates
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar plantillas por defecto
INSERT INTO public.notification_templates (template_key, template_name, subject, content_text, content_html, channel, placeholders) VALUES
('client_tickets_approved', 'Tickets Emitidos - Cliente', '🎉 ¡Tus tickets para el Mundial Skyworth 2026!', 
'Hola {nombre},

¡Felicitaciones! Tu compra ha sido verificada exitosamente.

Has recibido {ticket_count} ticket(s) para el sorteo del Mundial Skyworth 2026:

{tickets}

Fecha del sorteo: {draw_date}
Días restantes: {dias_restantes}

¡Buena suerte!
Equipo Skyworth', 
'<h1>¡Felicitaciones {nombre}!</h1><p>Tu compra ha sido verificada exitosamente.</p><p>Has recibido <strong>{ticket_count}</strong> ticket(s):</p><ul>{tickets_html}</ul><p>Fecha del sorteo: <strong>{draw_date}</strong></p>', 
'both', 
ARRAY['nombre', 'ticket_count', 'tickets', 'tickets_html', 'draw_date', 'dias_restantes']),

('client_purchase_review', 'Compra en Revisión', '📋 Tu registro está en revisión', 
'Hola {nombre},

Hemos recibido tu registro de compra Skyworth.

Tu documentación está siendo revisada por nuestro equipo. Te notificaremos cuando sea aprobada y recibirás tus tickets.

Producto: {producto}
Factura: {factura}

Gracias por tu paciencia.
Equipo Skyworth', 
NULL, 
'both', 
ARRAY['nombre', 'producto', 'factura']),

('client_purchase_rejected', 'Compra Rechazada', '❌ Registro de compra no aprobado', 
'Hola {nombre},

Lamentamos informarte que tu registro de compra no pudo ser verificado.

Motivo: {motivo}

Puedes intentar registrar nuevamente con documentos válidos en nuestra página.

Equipo Skyworth', 
NULL, 
'both', 
ARRAY['nombre', 'motivo']),

('seller_welcome', 'Bienvenida Vendedor', '🏆 ¡Bienvenido al programa de vendedores Skyworth!', 
'Hola {nombre},

¡Bienvenido al programa de incentivos Skyworth 2026!

Tu cuenta de vendedor ha sido creada exitosamente.

Tienda: {tienda}
Ciudad: {ciudad}

Empieza a registrar tus ventas y acumula puntos para ganar premios.

Equipo Skyworth', 
NULL, 
'email', 
ARRAY['nombre', 'tienda', 'ciudad']);

-- Tabla para rate limiting (antifraude)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP, user_id, or email
  action_type TEXT NOT NULL, -- 'purchase_submit', 'bot_chat', 'document_validate'
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para consultas rápidas
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(identifier, action_type, window_start);

-- RLS: solo service role puede acceder
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No políticas públicas - solo acceso desde edge functions con service role