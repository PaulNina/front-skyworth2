-- Add RLS policies for rate_limits table (used for spam protection)
CREATE POLICY "Allow anon insert for rate limiting"
ON public.rate_limits
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow system to update rate limits"
ON public.rate_limits
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow system to read rate limits"
ON public.rate_limits
FOR SELECT
TO anon, authenticated
USING (true);