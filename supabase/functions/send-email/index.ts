import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, isHtml = false, notificationLogId, templateKey, templateData }: SendEmailRequest = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "to is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get SMTP credentials from secure_settings - check BOTH uppercase and lowercase keys
    const { data: settings } = await supabase
      .from("secure_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_tls",
        "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SMTP_TLS",
        "EMAIL_ENABLED", "email_enabled"
      ]);

    const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);
    
    // Check if EMAIL is ENABLED first (check both uppercase and lowercase)
    const emailEnabled = settingsMap.get("EMAIL_ENABLED") || settingsMap.get("email_enabled");
    if (emailEnabled === "false") {
      // Update notification log to SKIPPED
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

    // Get SMTP credentials - prefer UPPERCASE then fall back to lowercase
    const smtpHost = settingsMap.get("SMTP_HOST") || settingsMap.get("smtp_host");
    const smtpPort = parseInt(settingsMap.get("SMTP_PORT") || settingsMap.get("smtp_port") || "587");
    const smtpUser = settingsMap.get("SMTP_USER") || settingsMap.get("smtp_user");
    const smtpPass = settingsMap.get("SMTP_PASS") || settingsMap.get("smtp_pass");
    const smtpFrom = settingsMap.get("SMTP_FROM") || settingsMap.get("smtp_from") || smtpUser;
    const smtpTls = (settingsMap.get("SMTP_TLS") || settingsMap.get("smtp_tls")) !== "false";

    if (!smtpHost || !smtpUser || !smtpPass) {
      // Log the failure
      if (notificationLogId) {
        await supabase
          .from("notification_log")
          .update({
            status: "FAILED",
            error_message: "SMTP credentials not configured",
            retry_count: 1
          })
          .eq("id", notificationLogId);
      }

      return new Response(
        JSON.stringify({ error: "SMTP credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine email content - use template if templateKey provided
    let finalSubject = subject;
    let finalBody = body;
    let finalIsHtml = isHtml;

    if (templateKey) {
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

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpTls,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    try {
      // Send email
      await client.send({
        from: smtpFrom,
        to: to,
        subject: finalSubject,
        content: finalIsHtml ? undefined : finalBody,
        html: finalIsHtml ? finalBody : undefined,
      });

      await client.close();

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

      console.log(`Email sent successfully to ${to}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (smtpError) {
      await client.close();
      throw smtpError;
    }
  } catch (error) {
    console.error("Email send error:", error);
    
    // Try to update notification log on error
    try {
      const body = await req.clone().json().catch(() => ({}));
      const notificationLogId = body.notificationLogId;
      if (notificationLogId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from("notification_log")
          .update({
            status: "FAILED",
            error_message: error instanceof Error ? error.message : "Unknown error",
            retry_count: 1
          })
          .eq("id", notificationLogId);
      }
    } catch (_) {
      // Ignore update errors
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
