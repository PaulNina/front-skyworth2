
-- =============================================
-- STORAGE BUCKET PARA DOCUMENTOS
-- =============================================

-- Bucket para documentos de compras (CI, facturas)
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-documents', 'purchase-documents', false);

-- Políticas para el bucket de documentos
-- Cualquiera puede subir documentos (registro público)
CREATE POLICY "Anyone can upload purchase documents"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'purchase-documents');

-- Solo admins pueden ver los documentos
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'purchase-documents' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Solo admins pueden eliminar documentos
CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'purchase-documents' 
  AND public.has_role(auth.uid(), 'admin')
);
