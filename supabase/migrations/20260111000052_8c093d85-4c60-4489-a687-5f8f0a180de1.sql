-- Add policy for users to read their own roles
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Ensure kb_items can be read by edge functions for the chatbot
CREATE POLICY "Allow public read for chatbot kb items" 
ON public.kb_items 
FOR SELECT 
TO anon
USING (is_active = true);