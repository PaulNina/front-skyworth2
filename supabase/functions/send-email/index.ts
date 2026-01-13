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