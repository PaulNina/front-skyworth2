-- Tighten rate_limits RLS by removing permissive policies flagged by the linter
DROP POLICY IF EXISTS "Allow anon insert for rate limiting" ON public.rate_limits;
DROP POLICY IF EXISTS "Allow system to read rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Allow system to update rate limits" ON public.rate_limits;

-- Keep: "Users can manage own rate limits" (applies to all commands and scopes by auth.uid() or CF IP header)
