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

    const { testEmail } = await req.json();

    // Get SMTP settings
    const { data: settings } = await serviceClient
      .from("secure_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "EMAIL_ENABLED", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", 
        "SMTP_PASS", "SMTP_FROM_EMAIL", "SMTP_FROM_NAME"
      ]);

    const settingsMap = Object.fromEntries(
      (settings || []).map((s) => [s.setting_key, s.setting_value])
    );

    if (settingsMap["EMAIL_ENABLED"] !== "true") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email no está habilitado en la configuración" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for Resend API key as alternative
    const resendKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendKey) {
      // Use Resend for sending
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: settingsMap["SMTP_FROM_EMAIL"] || "test@resend.dev",
            to: testEmail || user.email,
            subject: "🎉 Prueba de Email - Skyworth Mundial 2026",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #001F3F;">¡Conexión Exitosa!</h1>
                <p>Este es un correo de prueba del sistema Skyworth Mundial 2026.</p>
                <p style="color: #FFD700; font-weight: bold;">La configuración de email está funcionando correctamente.</p>
              </div>
            `,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Email de prueba enviado correctamente (vía Resend)",
              emailId: data.id 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          const errorData = await response.text();
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Error de Resend: ${response.status}`,
              details: errorData 
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (resendError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Error de conexión Resend: ${resendError}` 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // If no Resend, check SMTP config
    const smtpHost = settingsMap["SMTP_HOST"];
    const smtpPort = settingsMap["SMTP_PORT"];
    const smtpUser = settingsMap["SMTP_USER"];
    const smtpPass = settingsMap["SMTP_PASS"];

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuración SMTP incompleta. Configure RESEND_API_KEY o complete los datos SMTP." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Note: Direct SMTP from Deno Edge Functions is limited
    // In production, would use a service like Resend, SendGrid, etc.
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Configuración SMTP verificada (envío real requiere integración adicional)",
        config: {
          host: smtpHost,
          port: smtpPort,
          user: smtpUser ? "***configured***" : "missing",
          from: settingsMap["SMTP_FROM_EMAIL"]
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Test SMTP error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Error desconocido" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
