import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendWhatsAppRequest {
  to: string;
  message: string;
  notificationLogId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, notificationLogId }: SendWhatsAppRequest = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "to and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get WhatsApp credentials from secure_settings
    const { data: settings } = await supabase
      .from("secure_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["whatsapp_token", "whatsapp_phone_number_id"]);

    const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);
    const whatsappToken = settingsMap.get("whatsapp_token");
    const phoneNumberId = settingsMap.get("whatsapp_phone_number_id");

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

    // Send WhatsApp message via Cloud API
    const waResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: { body: message }
        })
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
            content: message
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
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp", details: waResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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