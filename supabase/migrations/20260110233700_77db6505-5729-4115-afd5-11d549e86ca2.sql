-- Política para leer plantillas públicamente (necesario para mostrar en frontend)
CREATE POLICY "Anyone can read active templates"
ON public.notification_templates
FOR SELECT
USING (is_active = true);

-- La tabla rate_limits no necesita políticas públicas ya que solo se accede desde edge functions con service role