import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify user is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuario no autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roles } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Se requiere rol de administrador" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { testPhone } = await req.json();

    // Get WhatsApp settings from secure_settings
    const { data: settings } = await serviceClient
      .from("secure_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["WHATSAPP_ENABLED", "WHATSAPP_API_URL", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"]);

    const settingsMap = Object.fromEntries(
      (settings || []).map((s) => [s.setting_key, s.setting_value])
    );

    if (settingsMap["WHATSAPP_ENABLED"] !== "true") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "WhatsApp no está habilitado en la configuración" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = settingsMap["WHATSAPP_API_URL"];
    const token = settingsMap["WHATSAPP_TOKEN"];
    const phoneId = settingsMap["WHATSAPP_PHONE_ID"];

    if (!apiUrl || !token || !phoneId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuración de WhatsApp incompleta. Revisa API URL, Token y Phone ID." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test with WhatsApp Business API (Meta)
    const whatsappUrl = `${apiUrl}/${phoneId}/messages`;
    
    try {
      const response = await fetch(whatsappUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: testPhone || "0000000000", // Use test phone or dummy
          type: "text",
          text: {
            body: "🎉 Prueba de conexión Skyworth Mundial 2026 - Configuración exitosa!"
          }
        }),
      });

      if (response.ok || response.status === 400) {
        // Status 400 might mean invalid phone but connection works
        const data = await response.json();
        
        if (response.ok) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Mensaje de prueba enviado correctamente",
              messageId: data.messages?.[0]?.id 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Conexión verificada (error de número de prueba)",
              details: data 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        const errorData = await response.text();
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Error de API: ${response.status}`,
            details: errorData 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (fetchError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error de conexión: ${fetchError}` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Test WhatsApp error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Error desconocido" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
