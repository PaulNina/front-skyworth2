-- =====================================================
-- MIGRACIÓN: Sistema de Cupones Skyworth 2026
-- Reestructura seriales + tabla cupones + RPCs atómicos
-- =====================================================

-- 1. PRODUCTOS: Renombrar ticket_multiplier a coupon_multiplier (buyer)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS coupon_multiplier INTEGER DEFAULT 1 CHECK (coupon_multiplier >= 1 AND coupon_multiplier <= 5);

-- Copiar valores existentes de ticket_multiplier a coupon_multiplier
UPDATE public.products 
SET coupon_multiplier = COALESCE(ticket_multiplier, 1)
WHERE coupon_multiplier IS NULL OR coupon_multiplier = 1;

-- 2. TV_SERIAL_REGISTRY: Agregar columnas para buyer/seller independientes
ALTER TABLE public.tv_serial_registry
ADD COLUMN IF NOT EXISTS buyer_status TEXT DEFAULT 'NOT_REGISTERED' CHECK (buyer_status IN ('NOT_REGISTERED', 'REGISTERED')),
ADD COLUMN IF NOT EXISTS buyer_purchase_id UUID REFERENCES public.client_purchases(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS buyer_registered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS seller_status TEXT DEFAULT 'NOT_REGISTERED' CHECK (seller_status IN ('NOT_REGISTERED', 'REGISTERED')),
ADD COLUMN IF NOT EXISTS seller_sale_id UUID REFERENCES public.seller_sales(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS seller_registered_at TIMESTAMPTZ;

-- Renombrar status existente a status_serial para claridad
ALTER TABLE public.tv_serial_registry 
RENAME COLUMN status TO status_serial;

-- 3. CREAR TABLA DE CUPONES
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  serial_number TEXT NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('BUYER', 'SELLER')),
  owner_purchase_id UUID REFERENCES public.client_purchases(id) ON DELETE SET NULL,
  owner_sale_id UUID REFERENCES public.seller_sales(id) ON DELETE SET NULL,
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VOID', 'WON')),
  issued_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para cupones
CREATE INDEX IF NOT EXISTS idx_coupons_serial ON public.coupons(serial_number);
CREATE INDEX IF NOT EXISTS idx_coupons_owner_type ON public.coupons(owner_type);
CREATE INDEX IF NOT EXISTS idx_coupons_issued_at ON public.coupons(issued_at);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON public.coupons(status);

-- 4. HABILITAR RLS EN COUPONS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cupones
CREATE POLICY "Admins can manage all coupons"
ON public.coupons FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active coupons by email"
ON public.coupons FOR SELECT
USING (status = 'ACTIVE');

-- 5. CONSTRAINT: Un comprador por serial
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_buyer_per_serial 
ON public.tv_serial_registry(serial_number) 
WHERE buyer_status = 'REGISTERED';

-- CONSTRAINT: Un vendedor por serial  
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_seller_per_serial
ON public.tv_serial_registry(serial_number)
WHERE seller_status = 'REGISTERED';

-- 6. CONSTRAINT en client_purchases: unique serial para compradores
ALTER TABLE public.client_purchases
ADD CONSTRAINT unique_buyer_serial_number UNIQUE (serial_number);

-- 7. CONSTRAINT en seller_sales: unique serial para vendedores
ALTER TABLE public.seller_sales
ADD CONSTRAINT unique_seller_serial_number UNIQUE (serial_number);

-- 8. FUNCIÓN: Generar código de cupón único
CREATE OR REPLACE FUNCTION public.generate_coupon_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := 'CUP-2026-' || UPPER(SUBSTRING(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM public.coupons WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- 9. RPC: Registrar compra de comprador (ATÓMICO)
CREATE OR REPLACE FUNCTION public.rpc_register_buyer_serial(
  p_serial_number TEXT,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_ci_number TEXT,
  p_birth_date DATE,
  p_city TEXT,
  p_department TEXT,
  p_invoice_number TEXT,
  p_purchase_date DATE,
  p_ci_front_url TEXT DEFAULT NULL,
  p_ci_back_url TEXT DEFAULT NULL,
  p_invoice_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_serial RECORD;
  v_product RECORD;
  v_purchase_id UUID;
  v_coupon_count INTEGER;
  v_coupons TEXT[] := '{}';
  v_age INTEGER;
  i INTEGER;
BEGIN
  -- Validar edad >= 18
  v_age := EXTRACT(YEAR FROM age(CURRENT_DATE, p_birth_date));
  IF v_age < 18 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Debes ser mayor de 18 años para participar');
  END IF;

  -- Buscar y bloquear serial
  SELECT * INTO v_serial
  FROM public.tv_serial_registry
  WHERE serial_number = UPPER(TRIM(p_serial_number))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Número de serie no encontrado en el registro');
  END IF;

  IF v_serial.status_serial = 'BLOCKED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este número de serie está bloqueado');
  END IF;

  IF v_serial.buyer_status = 'REGISTERED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este número de serie ya fue registrado por un comprador');
  END IF;

  -- Obtener producto y multiplicador de cupones
  SELECT * INTO v_product
  FROM public.products
  WHERE id = v_serial.product_id;

  v_coupon_count := COALESCE(v_product.coupon_multiplier, v_product.ticket_multiplier, 1);

  -- Crear registro de compra
  INSERT INTO public.client_purchases (
    full_name, email, phone, ci_number, birth_date,
    city, department, invoice_number, purchase_date,
    serial_number, product_id, terms_accepted,
    ci_front_url, ci_back_url, invoice_url,
    admin_status, ia_status
  ) VALUES (
    p_full_name, p_email, p_phone, p_ci_number, p_birth_date,
    p_city, p_department, p_invoice_number, p_purchase_date,
    UPPER(TRIM(p_serial_number)), v_serial.product_id, true,
    p_ci_front_url, p_ci_back_url, p_invoice_url,
    'APPROVED', 'VALID'
  )
  RETURNING id INTO v_purchase_id;

  -- Actualizar serial como registrado por comprador
  UPDATE public.tv_serial_registry
  SET 
    buyer_status = 'REGISTERED',
    buyer_purchase_id = v_purchase_id,
    buyer_registered_at = now()
  WHERE id = v_serial.id;

  -- Generar cupones
  FOR i IN 1..v_coupon_count LOOP
    INSERT INTO public.coupons (
      code, serial_number, owner_type, owner_purchase_id,
      owner_name, owner_email, owner_phone, product_id
    ) VALUES (
      public.generate_coupon_code(),
      UPPER(TRIM(p_serial_number)),
      'BUYER',
      v_purchase_id,
      p_full_name, p_email, p_phone, v_serial.product_id
    )
    RETURNING code INTO v_coupons[i];
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'coupons', to_jsonb(v_coupons),
    'coupon_count', v_coupon_count
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este número de serie ya fue registrado');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 10. RPC: Registrar venta de vendedor (ATÓMICO)
CREATE OR REPLACE FUNCTION public.rpc_register_seller_serial(
  p_serial_number TEXT,
  p_seller_id UUID,
  p_client_name TEXT,
  p_client_phone TEXT DEFAULT NULL,
  p_invoice_number TEXT DEFAULT NULL,
  p_sale_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_serial RECORD;
  v_product RECORD;
  v_seller RECORD;
  v_sale_id UUID;
  v_points INTEGER;
  v_coupon_code TEXT;
BEGIN
  -- Verificar que el seller existe y está activo
  SELECT * INTO v_seller
  FROM public.sellers
  WHERE id = p_seller_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vendedor no encontrado o inactivo');
  END IF;

  -- Buscar y bloquear serial
  SELECT * INTO v_serial
  FROM public.tv_serial_registry
  WHERE serial_number = UPPER(TRIM(p_serial_number))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Número de serie no encontrado en el registro');
  END IF;

  IF v_serial.status_serial = 'BLOCKED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este número de serie está bloqueado');
  END IF;

  IF v_serial.seller_status = 'REGISTERED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este número de serie ya fue registrado por otro vendedor');
  END IF;

  -- Obtener producto y puntos
  SELECT * INTO v_product
  FROM public.products
  WHERE id = v_serial.product_id;

  v_points := COALESCE(v_product.points_value, 1);

  -- Crear registro de venta
  INSERT INTO public.seller_sales (
    seller_id, product_id, serial_number, invoice_number,
    client_name, client_phone, sale_date, points_earned, is_verified
  ) VALUES (
    p_seller_id, v_serial.product_id, UPPER(TRIM(p_serial_number)),
    p_invoice_number, p_client_name, p_client_phone, p_sale_date,
    v_points, true
  )
  RETURNING id INTO v_sale_id;

  -- Actualizar serial como registrado por vendedor
  UPDATE public.tv_serial_registry
  SET 
    seller_status = 'REGISTERED',
    seller_sale_id = v_sale_id,
    seller_id = p_seller_id,
    seller_registered_at = now()
  WHERE id = v_serial.id;

  -- Generar 1 cupón para el vendedor
  INSERT INTO public.coupons (
    code, serial_number, owner_type, owner_sale_id,
    owner_name, owner_email, product_id
  ) VALUES (
    public.generate_coupon_code(),
    UPPER(TRIM(p_serial_number)),
    'SELLER',
    v_sale_id,
    v_seller.store_name, NULL, v_serial.product_id
  )
  RETURNING code INTO v_coupon_code;

  -- Actualizar totales del vendedor
  UPDATE public.sellers
  SET 
    total_points = COALESCE(total_points, 0) + v_points,
    total_sales = COALESCE(total_sales, 0) + 1,
    updated_at = now()
  WHERE id = p_seller_id;

  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'points_earned', v_points,
    'coupon', v_coupon_code
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este número de serie ya fue registrado por un vendedor');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 11. RPC: Validar serial (público, para UI)
CREATE OR REPLACE FUNCTION public.rpc_validate_serial_v2(p_serial TEXT, p_for_type TEXT DEFAULT 'BUYER')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_serial RECORD;
  v_product RECORD;
BEGIN
  SELECT * INTO v_serial
  FROM public.tv_serial_registry
  WHERE serial_number = UPPER(TRIM(p_serial));
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Número de serie no encontrado');
  END IF;
  
  IF v_serial.status_serial = 'BLOCKED' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Número de serie bloqueado');
  END IF;

  IF p_for_type = 'BUYER' AND v_serial.buyer_status = 'REGISTERED' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este serial ya fue registrado por un comprador');
  END IF;

  IF p_for_type = 'SELLER' AND v_serial.seller_status = 'REGISTERED' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este serial ya fue registrado por un vendedor');
  END IF;

  -- Obtener info del producto
  SELECT model_name, coupon_multiplier, points_value INTO v_product
  FROM public.products WHERE id = v_serial.product_id;
  
  RETURN jsonb_build_object(
    'valid', true,
    'serial_number', v_serial.serial_number,
    'product_id', v_serial.product_id,
    'product_name', v_product.model_name,
    'coupon_count', COALESCE(v_product.coupon_multiplier, 1),
    'points_value', COALESCE(v_product.points_value, 1),
    'buyer_registered', v_serial.buyer_status = 'REGISTERED',
    'seller_registered', v_serial.seller_status = 'REGISTERED'
  );
END;
$$;