import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendWhatsAppRequest {
  to: string;
  message?: string;
  notificationLogId?: string;
  templateKey?: string;
  templateData?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, notificationLogId, templateKey, templateData }: SendWhatsAppRequest = await req.json();

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

    // Get WhatsApp credentials from secure_settings - check both uppercase and lowercase
    const { data: settings } = await supabase
      .from("secure_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "whatsapp_token", "whatsapp_phone_number_id", "whatsapp_enabled",
        "WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_ENABLED", "WHATSAPP_API_URL",
        "WHATSAPP_TEMPLATE_NAME"
      ]);

    const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);
    
    // Check if WhatsApp is ENABLED
    const waEnabled = settingsMap.get("WHATSAPP_ENABLED") || settingsMap.get("whatsapp_enabled");
    if (waEnabled === "false") {
      // Update notification log to SKIPPED
      if (notificationLogId) {
        await supabase
          .from("notification_log")
          .update({
            status: "SKIPPED",
            error_message: "WhatsApp sending is disabled",
            sent_at: new Date().toISOString()
          })
          .eq("id", notificationLogId);
      }

      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "WhatsApp sending is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get WhatsApp credentials - prefer UPPERCASE then fall back to lowercase
    const whatsappToken = settingsMap.get("WHATSAPP_TOKEN") || settingsMap.get("whatsapp_token");
    const phoneNumberId = settingsMap.get("WHATSAPP_PHONE_ID") || settingsMap.get("whatsapp_phone_number_id");
    
    console.log(`WhatsApp config - Token: ${whatsappToken ? 'SET' : 'NOT SET'}, PhoneID: ${phoneNumberId || 'NOT SET'}`);

    if (!whatsappToken || !phoneNumberId) {
      // Log the failure
      if (notificationLogId) {
        await supabase
          .from("notification_log")
          .update({
            status: "FAILED",
            error_message: "WhatsApp credentials not configured",
            retry_count: 1
          })
          .eq("id", notificationLogId);
      }

      return new Response(
        JSON.stringify({ error: "WhatsApp credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number (remove + and ensure country code)
    let formattedPhone = to.replace(/[^0-9]/g, "");
    if (!formattedPhone.startsWith("591")) {
      formattedPhone = "591" + formattedPhone;
    }

    // Determine message type and content
    let waPayload: Record<string, unknown>;

    // Check if we should use a template
    if (templateKey) {
      // Fetch template from notification_templates
      const { data: template } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("template_key", templateKey)
        .eq("channel", "WHATSAPP")
        .eq("is_active", true)
        .maybeSingle();

      if (template) {
        // Get template name from secure_settings or use a default pattern
        const waTemplateName = settingsMap.get("WHATSAPP_TEMPLATE_NAME") || template.template_key.toLowerCase().replace(/_/g, '');
        
        // Build template parameters from templateData
        const bodyParams: Array<{ type: string; text: string }> = [];
        
        if (templateData) {
          // Get placeholders from template and map to parameters
          const placeholders = template.placeholders || [];
          for (const placeholder of placeholders) {
            const value = templateData[placeholder] || '';
            bodyParams.push({ type: "text", text: value });
          }
        }

        // Build WhatsApp template payload
        waPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: waTemplateName,
            language: { code: "es" },
            components: bodyParams.length > 0 ? [
              {
                type: "body",
                parameters: bodyParams
              }
            ] : []
          }
        };

        console.log(`Sending WhatsApp template "${waTemplateName}" to ${formattedPhone}`);
      } else {
        // Fallback to text message if template not found
        const finalMessage = message || "Mensaje de Skyworth";
        waPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: { body: finalMessage }
        };
      }
    } else if (message) {
      // Send as plain text message
      waPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: { body: message }
      };
    } else {
      return new Response(
        JSON.stringify({ error: "message or templateKey is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send WhatsApp message via Cloud API
    const waResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(waPayload)
      }
    );

    const waResult = await waResponse.json();

    // Update notification log
    if (notificationLogId) {
      if (waResponse.ok) {
        await supabase
          .from("notification_log")
          .update({
            status: "SENT",
            sent_at: new Date().toISOString(),
            content: message || `Template: ${templateKey}`
          })
          .eq("id", notificationLogId);
      } else {
        await supabase
          .from("notification_log")
          .update({
            status: "FAILED",
            error_message: JSON.stringify(waResult.error || waResult),
            retry_count: 1
          })
          .eq("id", notificationLogId);
      }
    }

    if (!waResponse.ok) {
      console.error("WhatsApp API error:", waResult);
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp", details: waResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`WhatsApp sent successfully to ${formattedPhone}`, waResult.messages?.[0]?.id);

    return new Response(
      JSON.stringify({ success: true, messageId: waResult.messages?.[0]?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
