import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  notificationLogId?: string;
  templateKey?: string;
  templateData?: Record<string, string>;
}

// Professional HTML email template for coupons - Gmail compatible
function generateCouponEmailHtml(data: {
  nombre: string;
  cupones: string;
  cantidad: string;
  productName?: string;
}): string {
  const couponList = data.cupones.split(", ").map(coupon => `
    <tr>
      <td style="padding: 8px 0;">
        <div style="background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%); border-radius: 8px; padding: 16px; text-align: center;">
          <span style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #ffffff; letter-spacing: 2px;">${coupon}</span>
        </div>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Tus Cupones Skyworth</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #1565c0 0%, #0d47a1 50%, #1a237e 100%); padding: 40px 30px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">⚽🏆</div>
                    <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 10px 0; font-weight: bold;">¡FELICITACIONES!</h1>
                    <p style="color: #bbdefb; font-size: 16px; margin: 0;">Tu registro ha sido aprobado</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding: 40px 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="color: #333333; font-size: 18px; margin: 0 0 20px 0;">
                      Hola <strong style="color: #1565c0;">${data.nombre}</strong>,
                    </p>
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                      ¡Excelente noticia! Tu compra de producto <strong>Skyworth</strong> ha sido verificada exitosamente. 
                      Has recibido <strong style="color: #1565c0; font-size: 20px;">${data.cantidad} cupón(es)</strong> para participar en el 
                      <strong>Gran Sorteo Mundial Skyworth 2026</strong>.
                    </p>
                  </td>
                </tr>
                
                <!-- Coupon badge -->
                <tr>
                  <td style="padding: 20px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #e3f2fd; border-radius: 12px; border: 2px dashed #1565c0;">
                      <tr>
                        <td style="padding: 25px;">
                          <p style="color: #1565c0; font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 0 0 15px 0; text-align: center; letter-spacing: 1px;">
                            🎫 Tus Cupones para el Sorteo
                          </p>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            ${couponList}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Info box -->
                <tr>
                  <td style="padding: 20px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff8e1; border-radius: 8px; border-left: 4px solid #ffc107;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #f57c00; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">
                            📋 IMPORTANTE - GUARDA TUS CUPONES
                          </p>
                          <ul style="color: #666666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                            <li>Estos códigos son únicos e intransferibles</li>
                            <li>Serán usados para el sorteo del Mundial 2026</li>
                            <li>Te notificaremos si resultas ganador</li>
                            <li>Consulta los resultados en nuestra página oficial</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- CTA Button -->
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <a href="https://skyworth-promo.lovable.app/resultados" style="display: inline-block; background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 50px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(21, 101, 192, 0.4);">
                      Ver Resultados del Sorteo
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #263238; padding: 30px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="color: #90a4ae; font-size: 14px; margin: 0 0 10px 0;">
                      <strong style="color: #ffffff;">SKYWORTH Bolivia</strong>
                    </p>
                    <p style="color: #78909c; font-size: 12px; margin: 0 0 15px 0;">
                      Promoción Mundial 2026 ⚽
                    </p>
                    <p style="color: #546e7a; font-size: 11px; margin: 0;">
                      Este correo fue enviado porque registraste una compra Skyworth.<br>
                      © 2026 Skyworth Bolivia. Todos los derechos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// HTML template for rejection email
function generateRejectionEmailHtml(data: {
  nombre: string;
  motivo: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Estado de tu Registro - Skyworth</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #455a64 0%, #37474f 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 10px;">ℹ️</div>
              <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Estado de tu Registro</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 18px; margin: 0 0 20px 0;">
                Hola <strong>${data.nombre}</strong>,
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Lamentamos informarte que tu registro no pudo ser aprobado en esta ocasión.
              </p>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffebee; border-radius: 8px; border-left: 4px solid #ef5350;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #c62828; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Motivo:</p>
                    <p style="color: #666666; font-size: 14px; margin: 0;">${data.motivo}</p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 25px 0;">
                Puedes intentar registrarte nuevamente asegurándote de que los documentos sean claros y legibles.
              </p>
              
              <p style="text-align: center; margin: 30px 0 0 0;">
                <a href="https://skyworth-promo.lovable.app/registro-cliente" style="display: inline-block; background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 50px; font-size: 16px; font-weight: bold;">
                  Intentar Nuevamente
                </a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #263238; padding: 25px; text-align: center;">
              <p style="color: #90a4ae; font-size: 14px; margin: 0 0 5px 0;">
                <strong style="color: #ffffff;">SKYWORTH Bolivia</strong>
              </p>
              <p style="color: #546e7a; font-size: 11px; margin: 0;">
                © 2026 Skyworth Bolivia. Todos los derechos reservados.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { to, subject, body, isHtml = false, notificationLogId, templateKey, templateData }: SendEmailRequest = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "to is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get settings from secure_settings
    const { data: settings } = await supabase
      .from("secure_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", 
        "EMAIL_ENABLED", "RESEND_API_KEY",
        "smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from",
        "email_enabled", "resend_api_key"
      ]);

    const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);
    
    // Check if EMAIL is ENABLED first
    const emailEnabled = settingsMap.get("EMAIL_ENABLED") || settingsMap.get("email_enabled");
    if (emailEnabled === "false") {
      if (notificationLogId) {
        await supabase
          .from("notification_log")
          .update({
            status: "SKIPPED",
            error_message: "Email sending is disabled",
            sent_at: new Date().toISOString()
          })
          .eq("id", notificationLogId);
      }

      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Email sending is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Resend API key - either from environment or settings
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || 
                         settingsMap.get("RESEND_API_KEY") || 
                         settingsMap.get("resend_api_key");
    
    // Get SMTP from email
    const smtpFrom = settingsMap.get("SMTP_FROM") || settingsMap.get("smtp_from") || 
                     settingsMap.get("SMTP_USER") || settingsMap.get("smtp_user") ||
                     "onboarding@resend.dev";

    if (!resendApiKey) {
      // Log the failure
      if (notificationLogId) {
        await supabase
          .from("notification_log")
          .update({
            status: "FAILED",
            error_message: "RESEND_API_KEY not configured. Please add your Resend API key in admin settings.",
            retry_count: 1
          })
          .eq("id", notificationLogId);
      }

      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          error: "Email service not configured. Add RESEND_API_KEY in admin settings or as a secret.",
          details: "Deno Edge Functions cannot use SMTP directly. Use Resend (resend.com) for email delivery."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine email content - use built-in templates or custom templates
    let finalSubject = subject;
    let finalBody = body;
    let finalIsHtml = isHtml;

    // Check for built-in templates first
    if (templateKey === "purchase_approved" && templateData) {
      // Use built-in professional HTML template for approved purchases
      finalSubject = "🎫 ¡Tus cupones para el Mundial Skyworth 2026!";
      finalBody = generateCouponEmailHtml({
        nombre: templateData.nombre || "Cliente",
        cupones: templateData.cupones || "",
        cantidad: templateData.cantidad || "0",
        productName: templateData.producto
      });
      finalIsHtml = true;
      console.log("Using built-in purchase_approved template");
    } else if (templateKey === "purchase_rejected" && templateData) {
      // Use built-in rejection template
      finalSubject = "ℹ️ Estado de tu registro - Skyworth 2026";
      finalBody = generateRejectionEmailHtml({
        nombre: templateData.nombre || "Cliente",
        motivo: templateData.motivo || "Los documentos no pudieron ser validados"
      });
      finalIsHtml = true;
      console.log("Using built-in purchase_rejected template");
    } else if (templateKey) {
      // Try to get custom template from database
      const { data: template } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("template_key", templateKey)
        .eq("channel", "EMAIL")
        .eq("is_active", true)
        .maybeSingle();

      if (template) {
        finalSubject = template.subject || subject;
        
        // Replace placeholders in content
        let content = template.content_html || template.content_text;
        if (templateData) {
          for (const [key, value] of Object.entries(templateData)) {
            content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
          }
        }
        
        finalBody = content;
        finalIsHtml = !!template.content_html;
      }
    }

    if (!finalSubject || !finalBody) {
      return new Response(
        JSON.stringify({ error: "subject and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending email to ${to} via Resend`);

    // Initialize Resend client
    const resend = new Resend(resendApiKey);

    // Send email using Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: smtpFrom.includes("@") ? smtpFrom : `Skyworth <${smtpFrom}>`,
      to: [to],
      subject: finalSubject,
      html: finalIsHtml ? finalBody : `<p>${finalBody.replace(/\n/g, '<br>')}</p>`,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      
      if (notificationLogId) {
        await supabase
          .from("notification_log")
          .update({
            status: "FAILED",
            error_message: emailError.message || "Failed to send email",
            retry_count: 1
          })
          .eq("id", notificationLogId);
      }

      return new Response(
        JSON.stringify({ error: emailError.message || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailData);

    // Update notification log
    if (notificationLogId) {
      await supabase
        .from("notification_log")
        .update({
          status: "SENT",
          sent_at: new Date().toISOString()
        })
        .eq("id", notificationLogId);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Email send error:", error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});