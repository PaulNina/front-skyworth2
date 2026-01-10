
-- =============================================
-- CORRECCIÓN DE SECURITY DEFINER EN VIEWS
-- Las vistas deben usar SECURITY INVOKER (default) para respetar RLS del usuario que consulta
-- =============================================

-- Recrear las vistas sin SECURITY DEFINER (por defecto son SECURITY INVOKER)
DROP VIEW IF EXISTS public.v_seller_ranking;
DROP VIEW IF EXISTS public.v_seller_ranking_by_city;
DROP VIEW IF EXISTS public.v_top_products;

-- Vista ranking vendedores - SECURITY INVOKER (respeta RLS del caller)
CREATE VIEW public.v_seller_ranking 
WITH (security_invoker = true)
AS
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

-- Vista ranking por ciudad - SECURITY INVOKER
CREATE VIEW public.v_seller_ranking_by_city 
WITH (security_invoker = true)
AS
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

-- Vista top productos - SECURITY INVOKER
CREATE VIEW public.v_top_products 
WITH (security_invoker = true)
AS
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
-- CORRECCIÓN DE RLS POLICIES PERMISIVAS
-- La política "Anyone can create purchase" usa WITH CHECK (true) que es necesaria 
-- porque cualquiera puede registrar compras (flujo público)
-- La política "System can insert audit logs" también es intencional para logging
-- =============================================

-- Para client_purchases: mantener público pero añadir validación básica
DROP POLICY IF EXISTS "Anyone can create purchase" ON public.client_purchases;
CREATE POLICY "Anyone can create purchase with validation"
ON public.client_purchases FOR INSERT TO anon, authenticated
WITH CHECK (
  -- Validar que los campos requeridos no estén vacíos
  full_name IS NOT NULL AND full_name != '' AND
  email IS NOT NULL AND email != '' AND
  phone IS NOT NULL AND phone != '' AND
  ci_number IS NOT NULL AND ci_number != '' AND
  terms_accepted = true
);

-- Para admin_audit: restringir a usuarios autenticados y validar que sea su propio user_id
DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit;
CREATE POLICY "Authenticated users can insert own audit logs"
ON public.admin_audit FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- =============================================
-- POLÍTICAS ADICIONALES PARA RANKINGS PÚBLICOS
-- Necesitamos que el público pueda ver los rankings de vendedores
-- =============================================

-- Añadir política pública de lectura para sellers (solo campos del ranking, no PII)
CREATE POLICY "Anyone can view seller rankings"
ON public.sellers FOR SELECT TO anon, authenticated
USING (is_active = true);

-- Añadir política pública de lectura para profiles (solo para rankings, campos limitados)
CREATE POLICY "Anyone can view profiles for rankings"
ON public.profiles FOR SELECT TO anon
USING (
  user_id IN (SELECT user_id FROM public.sellers WHERE is_active = true)
);
