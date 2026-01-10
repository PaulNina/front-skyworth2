
-- =============================================
-- 1) ENUM PARA ROLES
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'seller', 'user');

-- =============================================
-- 2) TABLA DE ROLES DE USUARIO
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3) FUNCIÓN SECURITY DEFINER PARA VERIFICAR ROLES
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =============================================
-- 4) CONFIGURACIÓN DE CAMPAÑA
-- =============================================
CREATE TABLE public.campaign_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name TEXT NOT NULL DEFAULT 'Gana el Mundial Skyworth 2026',
    campaign_subtitle TEXT DEFAULT 'Registra tu compra y participa por increíbles premios',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    draw_date TIMESTAMP WITH TIME ZONE NOT NULL,
    preselected_count INTEGER DEFAULT 20,
    finalists_count INTEGER DEFAULT 5,
    min_age INTEGER DEFAULT 18,
    terms_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5) PRODUCTOS PARTICIPANTES
-- =============================================
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,
    description TEXT,
    screen_size INTEGER,
    tier TEXT NOT NULL CHECK (tier IN ('T1', 'T2', 'T3')),
    ticket_multiplier INTEGER DEFAULT 1 CHECK (ticket_multiplier >= 1 AND ticket_multiplier <= 3),
    points_value INTEGER DEFAULT 1,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6) POOL DE TICKETS
-- =============================================
CREATE TABLE public.ticket_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code TEXT UNIQUE NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('T1', 'T2', 'T3')),
    is_assigned BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.ticket_pool ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7) PERFILES DE USUARIO (para clientes y vendedores)
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    ci_number TEXT,
    city TEXT,
    department TEXT,
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8) VENDEDORES
-- =============================================
CREATE TABLE public.sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    store_name TEXT NOT NULL,
    store_city TEXT NOT NULL,
    store_department TEXT,
    total_points INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9) COMPRAS DE CLIENTES
-- =============================================
CREATE TABLE public.client_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    ci_number TEXT NOT NULL,
    city TEXT NOT NULL,
    department TEXT,
    birth_date DATE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    serial_number TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    ci_front_url TEXT,
    ci_back_url TEXT,
    invoice_url TEXT,
    ia_status TEXT DEFAULT 'PENDING' CHECK (ia_status IN ('PENDING', 'VALID', 'INVALID', 'REVIEW')),
    ia_score DECIMAL(3,2),
    ia_detail JSONB,
    admin_status TEXT DEFAULT 'PENDING' CHECK (admin_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    terms_accepted BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (serial_number, invoice_number)
);

ALTER TABLE public.client_purchases ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 10) TICKETS ASIGNADOS
-- =============================================
CREATE TABLE public.tickets_assigned (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.ticket_pool(id) NOT NULL,
    purchase_id UUID REFERENCES public.client_purchases(id),
    sale_id UUID,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('CLIENT', 'SELLER')),
    owner_name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    owner_phone TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.tickets_assigned ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 11) VENTAS DE VENDEDORES
-- =============================================
CREATE TABLE public.seller_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    serial_number TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    sale_date DATE NOT NULL,
    points_earned INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (seller_id, serial_number, invoice_number)
);

ALTER TABLE public.seller_sales ENABLE ROW LEVEL SECURITY;

-- Agregar FK después de crear seller_sales
ALTER TABLE public.tickets_assigned 
ADD CONSTRAINT fk_tickets_assigned_sale 
FOREIGN KEY (sale_id) REFERENCES public.seller_sales(id);

-- =============================================
-- 12) BASE DE CONOCIMIENTOS (KB) PARA BOT
-- =============================================
CREATE TABLE public.kb_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type TEXT NOT NULL CHECK (item_type IN ('FAQ', 'ARTICLE', 'DOCUMENT')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    search_vector tsvector,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.kb_items ENABLE ROW LEVEL SECURITY;

-- Índice para búsqueda full-text
CREATE INDEX idx_kb_items_search ON public.kb_items USING GIN(search_vector);

-- Trigger para actualizar search_vector
CREATE OR REPLACE FUNCTION public.update_kb_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('spanish', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('spanish', COALESCE(NEW.category, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_kb_search_vector
BEFORE INSERT OR UPDATE ON public.kb_items
FOR EACH ROW
EXECUTE FUNCTION public.update_kb_search_vector();

-- =============================================
-- 13) LOG DE NOTIFICACIONES
-- =============================================
CREATE TABLE public.notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type TEXT NOT NULL CHECK (notification_type IN ('EMAIL', 'WHATSAPP')),
    recipient TEXT NOT NULL,
    subject TEXT,
    content TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'RETRY')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    related_purchase_id UUID REFERENCES public.client_purchases(id),
    related_sale_id UUID REFERENCES public.seller_sales(id),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 14) AUDITORÍA ADMIN
-- =============================================
CREATE TABLE public.admin_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 15) RESULTADOS DE SORTEO
-- =============================================
CREATE TABLE public.draw_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_participants INTEGER DEFAULT 0,
    total_tickets INTEGER DEFAULT 0,
    preselected_count INTEGER DEFAULT 20,
    finalists_count INTEGER DEFAULT 5,
    executed_by UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'EXECUTED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.draw_results ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 16) GANADORES DEL SORTEO
-- =============================================
CREATE TABLE public.draw_winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID REFERENCES public.draw_results(id) ON DELETE CASCADE NOT NULL,
    ticket_id UUID REFERENCES public.ticket_pool(id) NOT NULL,
    winner_type TEXT NOT NULL CHECK (winner_type IN ('PRESELECTED', 'FINALIST')),
    position INTEGER,
    owner_name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    owner_phone TEXT,
    prize_description TEXT,
    is_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.draw_winners ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 17) CONFIGURACIÓN SEGURA (API Keys, etc.)
-- =============================================
CREATE TABLE public.secure_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.secure_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 18) RLS POLICIES
-- =============================================

-- user_roles: solo admins pueden ver/modificar
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- campaign_settings: público leer, admin modificar
CREATE POLICY "Anyone can view campaign settings"
ON public.campaign_settings FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage campaign settings"
ON public.campaign_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- products: público leer productos activos, admin CRUD
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage products"
ON public.products FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ticket_pool: solo admin
CREATE POLICY "Admins can manage ticket pool"
ON public.ticket_pool FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- profiles: usuarios ven su propio perfil, admin ve todos
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- sellers: vendedor ve su propio registro, admin ve todos
CREATE POLICY "Sellers can view own record"
ON public.sellers FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can update own record"
ON public.sellers FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated can create seller"
ON public.sellers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage sellers"
ON public.sellers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- client_purchases: público puede insertar, admin gestiona
CREATE POLICY "Anyone can create purchase"
ON public.client_purchases FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all purchases"
ON public.client_purchases FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update purchases"
ON public.client_purchases FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- tickets_assigned: admin gestiona, público puede ver sus propios tickets por email
CREATE POLICY "Admins can manage assigned tickets"
ON public.tickets_assigned FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- seller_sales: vendedor ve sus ventas, admin ve todas
CREATE POLICY "Sellers can view own sales"
ON public.seller_sales FOR SELECT TO authenticated
USING (
  seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Sellers can create sales"
ON public.seller_sales FOR INSERT TO authenticated
WITH CHECK (
  seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can manage all sales"
ON public.seller_sales FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- kb_items: solo admin
CREATE POLICY "Admins can manage kb items"
ON public.kb_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- notification_log: solo admin
CREATE POLICY "Admins can view notification logs"
ON public.notification_log FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- admin_audit: solo admin
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
ON public.admin_audit FOR INSERT TO authenticated
WITH CHECK (true);

-- draw_results: público puede ver ejecutados, admin gestiona
CREATE POLICY "Anyone can view executed draws"
ON public.draw_results FOR SELECT TO anon, authenticated
USING (status = 'EXECUTED');

CREATE POLICY "Admins can manage draws"
ON public.draw_results FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- draw_winners: público puede ver ganadores de sorteos ejecutados
CREATE POLICY "Anyone can view winners of executed draws"
ON public.draw_winners FOR SELECT TO anon, authenticated
USING (
  draw_id IN (SELECT id FROM public.draw_results WHERE status = 'EXECUTED')
);

CREATE POLICY "Admins can manage winners"
ON public.draw_winners FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- secure_settings: solo admin vía Edge Function
CREATE POLICY "Admins can manage secure settings"
ON public.secure_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 19) FUNCIONES RPC
-- =============================================

-- Función para buscar en KB (para el bot)
CREATE OR REPLACE FUNCTION public.rpc_kb_search(query_text TEXT, max_results INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  rank REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ki.id,
    ki.title,
    ki.content,
    ki.category,
    ts_rank(ki.search_vector, plainto_tsquery('spanish', query_text)) as rank
  FROM public.kb_items ki
  WHERE ki.is_active = true
    AND ki.search_vector @@ plainto_tsquery('spanish', query_text)
  ORDER BY rank DESC
  LIMIT max_results;
$$;

-- Función para asignar tickets transaccionalmente
CREATE OR REPLACE FUNCTION public.rpc_assign_tickets(
  p_purchase_id UUID,
  p_tier TEXT,
  p_count INTEGER,
  p_owner_name TEXT,
  p_owner_email TEXT,
  p_owner_phone TEXT DEFAULT NULL
)
RETURNS TABLE (ticket_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_assigned_count INTEGER := 0;
BEGIN
  -- Verificar que la compra existe y está aprobada
  IF NOT EXISTS (
    SELECT 1 FROM public.client_purchases 
    WHERE id = p_purchase_id 
    AND (admin_status = 'APPROVED' OR ia_status = 'VALID')
  ) THEN
    RAISE EXCEPTION 'Compra no válida o no aprobada';
  END IF;

  -- Asignar tickets del pool
  FOR v_ticket IN 
    SELECT tp.id, tp.ticket_code 
    FROM public.ticket_pool tp
    WHERE tp.tier = p_tier 
      AND tp.is_assigned = false
    ORDER BY RANDOM()
    LIMIT p_count
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Marcar ticket como asignado
    UPDATE public.ticket_pool 
    SET is_assigned = true, assigned_at = now()
    WHERE id = v_ticket.id;

    -- Crear registro de asignación
    INSERT INTO public.tickets_assigned (
      ticket_id, purchase_id, owner_type, 
      owner_name, owner_email, owner_phone
    ) VALUES (
      v_ticket.id, p_purchase_id, 'CLIENT',
      p_owner_name, p_owner_email, p_owner_phone
    );

    v_assigned_count := v_assigned_count + 1;
    ticket_code := v_ticket.ticket_code;
    RETURN NEXT;
  END LOOP;

  IF v_assigned_count < p_count THEN
    RAISE WARNING 'Solo se pudieron asignar % de % tickets solicitados', v_assigned_count, p_count;
  END IF;
END;
$$;

-- Función para ejecutar sorteo
CREATE OR REPLACE FUNCTION public.rpc_run_draw(
  p_draw_id UUID,
  p_preselected_count INTEGER DEFAULT 20,
  p_finalists_count INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_position INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Verificar que el usuario es admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden ejecutar sorteos';
  END IF;

  -- Seleccionar preseleccionados
  FOR v_ticket IN
    SELECT 
      ta.ticket_id,
      ta.owner_name,
      ta.owner_email,
      ta.owner_phone
    FROM public.tickets_assigned ta
    JOIN public.ticket_pool tp ON tp.id = ta.ticket_id
    WHERE ta.purchase_id IS NOT NULL
      OR ta.sale_id IS NOT NULL
    ORDER BY RANDOM()
    LIMIT p_preselected_count
  LOOP
    v_position := v_position + 1;
    INSERT INTO public.draw_winners (
      draw_id, ticket_id, winner_type, position,
      owner_name, owner_email, owner_phone
    ) VALUES (
      p_draw_id, v_ticket.ticket_id, 
      CASE WHEN v_position <= p_finalists_count THEN 'FINALIST' ELSE 'PRESELECTED' END,
      v_position,
      v_ticket.owner_name, v_ticket.owner_email, v_ticket.owner_phone
    );
  END LOOP;

  -- Actualizar estado del sorteo
  UPDATE public.draw_results 
  SET status = 'EXECUTED',
      preselected_count = v_position,
      finalists_count = LEAST(v_position, p_finalists_count)
  WHERE id = p_draw_id;

  SELECT jsonb_build_object(
    'success', true,
    'preselected', v_position,
    'finalists', LEAST(v_position, p_finalists_count)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Función para actualizar puntos de vendedor
CREATE OR REPLACE FUNCTION public.update_seller_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.sellers
  SET 
    total_points = total_points + NEW.points_earned,
    total_sales = total_sales + 1,
    updated_at = now()
  WHERE id = NEW.seller_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_seller_points
AFTER INSERT ON public.seller_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_seller_points();

-- Función para updated_at automático
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_campaign_settings_updated_at BEFORE UPDATE ON public.campaign_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_purchases_updated_at BEFORE UPDATE ON public.client_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kb_items_updated_at BEFORE UPDATE ON public.kb_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_secure_settings_updated_at BEFORE UPDATE ON public.secure_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 20) VIEWS PARA RANKINGS
-- =============================================

CREATE OR REPLACE VIEW public.v_seller_ranking AS
SELECT 
  s.id,
  p.full_name,
  s.store_name,
  s.store_city,
  s.total_points,
  s.total_sales,
  RANK() OVER (ORDER BY s.total_points DESC) as ranking_position
FROM public.sellers s
JOIN public.profiles p ON p.user_id = s.user_id
WHERE s.is_active = true
ORDER BY s.total_points DESC;

CREATE OR REPLACE VIEW public.v_seller_ranking_by_city AS
SELECT 
  s.id,
  p.full_name,
  s.store_name,
  s.store_city,
  s.total_points,
  s.total_sales,
  RANK() OVER (PARTITION BY s.store_city ORDER BY s.total_points DESC) as city_ranking
FROM public.sellers s
JOIN public.profiles p ON p.user_id = s.user_id
WHERE s.is_active = true
ORDER BY s.store_city, s.total_points DESC;

CREATE OR REPLACE VIEW public.v_top_products AS
SELECT 
  p.id,
  p.model_name,
  p.screen_size,
  p.tier,
  COUNT(cp.id) as total_registrations,
  RANK() OVER (ORDER BY COUNT(cp.id) DESC) as product_ranking
FROM public.products p
LEFT JOIN public.client_purchases cp ON cp.product_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.model_name, p.screen_size, p.tier
ORDER BY total_registrations DESC;

-- =============================================
-- 21) DATOS INICIALES
-- =============================================

-- Configuración inicial de campaña
INSERT INTO public.campaign_settings (
  campaign_name,
  campaign_subtitle,
  start_date,
  end_date,
  draw_date,
  preselected_count,
  finalists_count,
  min_age,
  is_active
) VALUES (
  'Gana el Mundial Skyworth 2026',
  'Registra tu compra de TV Skyworth y participa por increíbles premios para vivir el Mundial 2026',
  '2026-01-01 00:00:00+00',
  '2026-06-30 23:59:59+00',
  '2026-07-10 18:00:00+00',
  20,
  5,
  18,
  true
);

-- Productos de ejemplo
INSERT INTO public.products (model_name, description, screen_size, tier, ticket_multiplier, points_value, is_active) VALUES
('Skyworth 32E10', 'Smart TV HD 32 pulgadas', 32, 'T1', 1, 1, true),
('Skyworth 43G2', 'Smart TV FHD 43 pulgadas', 43, 'T1', 1, 2, true),
('Skyworth 50G2', 'Smart TV 4K 50 pulgadas', 50, 'T2', 2, 3, true),
('Skyworth 55G2', 'Smart TV 4K 55 pulgadas', 55, 'T2', 2, 4, true),
('Skyworth 65G2', 'Smart TV 4K 65 pulgadas', 65, 'T3', 3, 5, true),
('Skyworth 75G2', 'Smart TV 4K 75 pulgadas', 75, 'T3', 3, 6, true);
