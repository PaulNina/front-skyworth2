-- Remove permissive public insert policy (was causing security warnings)
DROP POLICY IF EXISTS "Public can create purchases" ON public.client_purchases;

-- Only admins can insert directly (public inserts should go through rpc_register_buyer_serial)
CREATE POLICY "Admins can insert purchases"
ON public.client_purchases
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
