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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, isHtml = false, notificationLogId }: SendEmailRequest = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "to, subject and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get SMTP credentials from secure_settings
    const { data: settings } = await supabase
      .from("secure_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_tls"]);

    const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);
    const smtpHost = settingsMap.get("smtp_host");
    const smtpPort = parseInt(settingsMap.get("smtp_port") || "587");
    const smtpUser = settingsMap.get("smtp_user");
    const smtpPass = settingsMap.get("smtp_pass");
    const smtpFrom = settingsMap.get("smtp_from") || smtpUser;
    const smtpTls = settingsMap.get("smtp_tls") !== "false";

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
        subject: subject,
        content: isHtml ? undefined : body,
        html: isHtml ? body : undefined,
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
      const { notificationLogId } = await req.json().catch(() => ({}));
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