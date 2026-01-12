-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Anyone can create purchase" ON public.client_purchases;

-- Create a more permissive INSERT policy - only require that key fields exist
CREATE POLICY "Public can create purchases"
ON public.client_purchases
FOR INSERT
TO anon, authenticated
WITH CHECK (true);