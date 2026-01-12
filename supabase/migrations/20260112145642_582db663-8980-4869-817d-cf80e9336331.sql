-- Fix rpc_register_buyer_serial array subscript issue
CREATE OR REPLACE FUNCTION public.rpc_register_buyer_serial(
  p_serial_number text, 
  p_full_name text, 
  p_email text, 
  p_phone text, 
  p_ci_number text, 
  p_birth_date date, 
  p_city text, 
  p_department text, 
  p_invoice_number text, 
  p_purchase_date date, 
  p_ci_front_url text DEFAULT NULL, 
  p_ci_back_url text DEFAULT NULL, 
  p_invoice_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_serial RECORD;
  v_product RECORD;
  v_purchase_id UUID;
  v_coupon_count INTEGER;
  v_coupons TEXT[] := ARRAY[]::TEXT[];
  v_new_code TEXT;
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

  -- Generar cupones usando array_append
  FOR i IN 1..v_coupon_count LOOP
    INSERT INTO public.coupons (
      code, serial_number, owner_type, owner_purchase_id,
      owner_name, owner_email, owner_phone, product_id, status, issued_at
    ) VALUES (
      public.generate_coupon_code(),
      UPPER(TRIM(p_serial_number)),
      'BUYER',
      v_purchase_id,
      p_full_name, p_email, p_phone, v_serial.product_id, 'ACTIVE', now()
    )
    RETURNING code INTO v_new_code;
    
    v_coupons := array_append(v_coupons, v_new_code);
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
$function$;

-- Fix rpc_register_seller_serial - NO coupons for sellers, only sale registration
CREATE OR REPLACE FUNCTION public.rpc_register_seller_serial(
  p_serial_number text, 
  p_seller_id uuid, 
  p_client_name text, 
  p_client_phone text DEFAULT NULL, 
  p_invoice_number text DEFAULT NULL, 
  p_sale_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_serial RECORD;
  v_product RECORD;
  v_seller RECORD;
  v_sale_id UUID;
  v_points INTEGER;
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

  -- NO generamos cupón para vendedores - solo registramos la venta

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
    'message', 'Venta registrada exitosamente'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este número de serie ya fue registrado por un vendedor');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;