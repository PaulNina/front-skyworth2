-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Anyone can create purchase with validation" ON public.client_purchases;

-- Create a simpler INSERT policy that allows public inserts with basic validation
CREATE POLICY "Anyone can create purchase"
ON public.client_purchases
FOR INSERT
TO anon, authenticated
WITH CHECK (
  full_name IS NOT NULL AND full_name <> '' AND
  email IS NOT NULL AND email <> '' AND
  phone IS NOT NULL AND phone <> '' AND
  ci_number IS NOT NULL AND ci_number <> '' AND
  serial_number IS NOT NULL AND serial_number <> '' AND
  terms_accepted = true
);