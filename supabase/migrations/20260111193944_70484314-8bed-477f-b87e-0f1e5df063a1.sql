-- Create trigger to auto-set terms_accepted_at when terms_accepted is true
CREATE OR REPLACE FUNCTION public.set_terms_accepted_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.terms_accepted = true AND (OLD IS NULL OR OLD.terms_accepted IS DISTINCT FROM NEW.terms_accepted) THEN
    NEW.terms_accepted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_set_terms_timestamp ON public.client_purchases;
CREATE TRIGGER trigger_set_terms_timestamp
  BEFORE INSERT OR UPDATE ON public.client_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_terms_accepted_timestamp();

-- Add index for faster serial lookup
CREATE INDEX IF NOT EXISTS idx_tv_serial_registry_serial 
ON public.tv_serial_registry(serial_number);

CREATE INDEX IF NOT EXISTS idx_tv_serial_registry_status 
ON public.tv_serial_registry(status);

-- Add RLS policy for tv_serial_registry - public can read available serials for validation
DROP POLICY IF EXISTS "Public can validate serials" ON public.tv_serial_registry;
CREATE POLICY "Public can validate serials"
ON public.tv_serial_registry
FOR SELECT
USING (true);

-- Only admins can modify serial registry
DROP POLICY IF EXISTS "Admins can manage serials" ON public.tv_serial_registry;
CREATE POLICY "Admins can manage serials"
ON public.tv_serial_registry
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);