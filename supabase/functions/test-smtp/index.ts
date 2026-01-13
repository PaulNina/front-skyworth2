import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    let user = null;
    
    if (authHeader) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const { data, error: userError } = await userClient.auth.getUser();
      if (!userError && data?.user) {
        user = data.user;
      }
    }
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Usuario no autenticado. Por favor, recarga la página e inicia sesión." }),
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

    const { testEmail } = await req.json().catch(() => ({}));

    // Get settings
    const { data: settings } = await serviceClient
      .from("secure_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "EMAIL_ENABLED", "SMTP_FROM", "RESEND_API_KEY",
        "email_enabled", "smtp_from", "resend_api_key"
      ]);

    const settingsMap = new Map(
      (settings || []).map((s) => [s.setting_key, s.setting_value])
    );

    const emailEnabled = settingsMap.get("EMAIL_ENABLED") || settingsMap.get("email_enabled");
    if (emailEnabled !== "true") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email no está habilitado en la configuración" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || 
                         settingsMap.get("RESEND_API_KEY") || 
                         settingsMap.get("resend_api_key");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "RESEND_API_KEY no configurada. Deno Edge Functions no pueden usar SMTP directo. Usa Resend (resend.com) para enviar emails.",
          action: "Registra una cuenta en resend.com, crea una API key, y agrégala en configuración como RESEND_API_KEY"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpFrom = settingsMap.get("SMTP_FROM") || settingsMap.get("smtp_from") || "onboarding@resend.dev";
    const recipientEmail = testEmail || user.email;

    console.log(`Testing email with Resend to ${recipientEmail}`);

    // Initialize Resend and send test email
    const resend = new Resend(resendApiKey);

    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: smtpFrom.includes("@") ? smtpFrom : `Skyworth <${smtpFrom}>`,
        to: [recipientEmail],
        subject: "🎉 Prueba de Email - Skyworth Mundial 2026",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #001F3F;">¡Conexión Exitosa!</h1>
            <p>Este es un correo de prueba del sistema Skyworth Mundial 2026.</p>
            <p style="color: #FFD700; font-weight: bold; background: #001F3F; padding: 10px; border-radius: 5px;">
              ✅ La configuración de email está funcionando correctamente.
            </p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Enviado desde: ${smtpFrom}<br>
              Fecha: ${new Date().toLocaleString('es-BO')}
            </p>
          </div>
        `,
      });

      if (emailError) {
        console.error("Resend error:", emailError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Error de Resend: ${emailError.message}`,
            details: "Verifica que tu API key sea válida y el dominio esté verificado en resend.com"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Test email sent:", emailData);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Email de prueba enviado correctamente a ${recipientEmail}`,
          emailId: emailData?.id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (resendError) {
      console.error("Resend connection error:", resendError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error de conexión: ${resendError instanceof Error ? resendError.message : 'Error desconocido'}`,
          details: "Verifica tu conexión y API key de Resend"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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