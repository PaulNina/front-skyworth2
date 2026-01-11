-- =====================================================
-- 1. Function to request seller role (security definer)
-- This allows a user to request the seller role ONLY for themselves
-- =====================================================
CREATE OR REPLACE FUNCTION public.rpc_request_seller_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_seller boolean;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user already has seller role
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = v_user_id AND role = 'seller'
  ) INTO v_has_seller;
  
  IF v_has_seller THEN
    RETURN true; -- Already has role
  END IF;
  
  -- Check if user has a seller record (required)
  IF NOT EXISTS (SELECT 1 FROM sellers WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'Must create seller record first';
  END IF;
  
  -- Insert seller role
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'seller');
  
  RETURN true;
END;
$$;

-- =====================================================
-- 2. Create tv_serial_registry table for serial validation
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tv_serial_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text NOT NULL UNIQUE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  tier text NOT NULL DEFAULT 'SILVER',
  ticket_multiplier integer NOT NULL DEFAULT 1 CHECK (ticket_multiplier BETWEEN 1 AND 3),
  status text NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'USED', 'RESERVED')),
  registered_at timestamp with time zone,
  registered_by_purchase_id uuid REFERENCES public.client_purchases(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for tv_serial_registry
ALTER TABLE public.tv_serial_registry ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage serial registry"
  ON public.tv_serial_registry FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Public can check if serial exists (for validation)
CREATE POLICY "Anyone can check serial availability"
  ON public.tv_serial_registry FOR SELECT
  USING (true);

-- =====================================================
-- 3. Add participant_tickets table for tracking issued tickets
-- =====================================================
CREATE TABLE IF NOT EXISTS public.participant_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES public.client_purchases(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES public.ticket_pool(id) ON DELETE CASCADE,
  ticket_code text NOT NULL,
  tier text NOT NULL,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(ticket_id)
);

-- RLS for participant_tickets
ALTER TABLE public.participant_tickets ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage participant tickets"
  ON public.participant_tickets FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 4. Function to validate serial number
-- =====================================================
CREATE OR REPLACE FUNCTION public.rpc_validate_serial(p_serial text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_registry record;
BEGIN
  SELECT * INTO v_registry
  FROM tv_serial_registry
  WHERE serial_number = UPPER(TRIM(p_serial));
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Serial number not found in registry'
    );
  END IF;
  
  IF v_registry.status != 'AVAILABLE' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Serial number already used',
      'status', v_registry.status
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'serial_number', v_registry.serial_number,
    'product_id', v_registry.product_id,
    'tier', v_registry.tier,
    'ticket_multiplier', v_registry.ticket_multiplier
  );
END;
$$;

-- =====================================================
-- 5. Function for public rankings (security definer)
-- =====================================================
CREATE OR REPLACE FUNCTION public.rpc_public_rankings()
RETURNS TABLE (
  ranking_type text,
  rank_position bigint,
  display_name text,
  store_city text,
  total_points integer,
  total_sales integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    'seller'::text as ranking_type,
    ROW_NUMBER() OVER (ORDER BY s.total_points DESC NULLS LAST) as rank_position,
    COALESCE(s.store_name, 'Vendedor Anónimo') as display_name,
    s.store_city,
    COALESCE(s.total_points, 0) as total_points,
    COALESCE(s.total_sales, 0) as total_sales
  FROM sellers s
  WHERE s.is_active = true
  ORDER BY s.total_points DESC NULLS LAST
  LIMIT 100;
$$;

-- =====================================================
-- 6. Function for city rankings
-- =====================================================
CREATE OR REPLACE FUNCTION public.rpc_city_rankings()
RETURNS TABLE (
  city text,
  total_sellers bigint,
  total_points bigint,
  total_sales bigint,
  rank_position bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.store_city as city,
    COUNT(DISTINCT s.id) as total_sellers,
    COALESCE(SUM(s.total_points), 0) as total_points,
    COALESCE(SUM(s.total_sales), 0) as total_sales,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(s.total_points), 0) DESC) as rank_position
  FROM sellers s
  WHERE s.is_active = true
  GROUP BY s.store_city
  ORDER BY total_points DESC
  LIMIT 50;
$$;

-- =====================================================
-- 7. Add tickets_issued_at to client_purchases if not exists
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_purchases' 
    AND column_name = 'tickets_issued_at'
  ) THEN
    ALTER TABLE public.client_purchases ADD COLUMN tickets_issued_at timestamp with time zone;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_purchases' 
    AND column_name = 'tickets_count'
  ) THEN
    ALTER TABLE public.client_purchases ADD COLUMN tickets_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_purchases' 
    AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE public.client_purchases ADD COLUMN terms_accepted_at timestamp with time zone;
  END IF;
END $$;

-- =====================================================
-- 8. Update trigger for sellers to recalculate totals
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_seller_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update seller totals after insert/update/delete on seller_sales
  IF TG_OP = 'DELETE' THEN
    UPDATE sellers SET
      total_sales = (SELECT COUNT(*) FROM seller_sales WHERE seller_id = OLD.seller_id),
      total_points = (SELECT COALESCE(SUM(points_earned), 0) FROM seller_sales WHERE seller_id = OLD.seller_id),
      updated_at = now()
    WHERE id = OLD.seller_id;
    RETURN OLD;
  ELSE
    UPDATE sellers SET
      total_sales = (SELECT COUNT(*) FROM seller_sales WHERE seller_id = NEW.seller_id),
      total_points = (SELECT COALESCE(SUM(points_earned), 0) FROM seller_sales WHERE seller_id = NEW.seller_id),
      updated_at = now()
    WHERE id = NEW.seller_id;
    RETURN NEW;
  END IF;
END;
$$;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_update_seller_totals ON seller_sales;
CREATE TRIGGER trg_update_seller_totals
  AFTER INSERT OR UPDATE OR DELETE ON seller_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_totals();