-- =========================================
-- FIX: Ensure rpc_request_seller_role works properly
-- Creates or replaces the secure RPC function
-- =========================================

-- Drop if exists to recreate with correct logic
DROP FUNCTION IF EXISTS public.rpc_request_seller_role();

-- Create SECURITY DEFINER function that safely assigns seller role
CREATE OR REPLACE FUNCTION public.rpc_request_seller_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the current authenticated user
  v_user_id := auth.uid();
  
  -- If no user is authenticated, fail
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user';
  END IF;
  
  -- Check if user already has seller role
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_user_id AND role = 'seller'
  ) THEN
    -- Already has role, return success
    RETURN true;
  END IF;
  
  -- Insert seller role ONLY (never admin or other roles)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'seller');
  
  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: role was inserted by another request
    RETURN true;
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.rpc_request_seller_role() TO authenticated;

-- =========================================
-- FIX: RLS policy for user_roles to allow reading own roles
-- =========================================

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

-- Allow users to read only their own roles
CREATE POLICY "Users can read their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only admins can insert/update/delete roles (except via RPC)
CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- FIX: Add unique constraint on draw_winners to prevent re-execution
-- =========================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_draw_winner_ticket'
  ) THEN
    ALTER TABLE public.draw_winners 
    ADD CONSTRAINT unique_draw_winner_ticket UNIQUE (draw_id, ticket_id);
  END IF;
END $$;

-- =========================================
-- FIX: Ensure only one active campaign at a time
-- =========================================
-- Create a partial unique index for is_active = true
DROP INDEX IF EXISTS idx_unique_active_campaign;
CREATE UNIQUE INDEX idx_unique_active_campaign 
ON public.campaign_settings (is_active) 
WHERE is_active = true;

-- =========================================
-- FIX: Rate limits table - make more secure
-- =========================================
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow anon insert rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Allow anon select rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Allow authenticated update rate_limits" ON public.rate_limits;

-- Create isolated policies based on identifier
CREATE POLICY "Users can manage own rate limits"
ON public.rate_limits
FOR ALL
USING (identifier = COALESCE(auth.uid()::text, current_setting('request.headers', true)::json->>'cf-connecting-ip', 'unknown'))
WITH CHECK (identifier = COALESCE(auth.uid()::text, current_setting('request.headers', true)::json->>'cf-connecting-ip', 'unknown'));