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
    const { purchaseId, adminMode = false } = await req.json();

    if (!purchaseId) {
      return new Response(
        JSON.stringify({ error: "purchaseId es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get purchase details
    const { data: purchase, error: purchaseError } = await supabase
      .from("client_purchases")
      .select("*, products(model_name, tier, ticket_multiplier)")
      .eq("id", purchaseId)
      .single();

    if (purchaseError || !purchase) {
      return new Response(
        JSON.stringify({ error: "Compra no encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize IA result
    let iaStatus = "REVIEW";
    let iaScore = 50;
    let iaDetail: Record<string, unknown> = {};

    // Get Lovable AI API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (LOVABLE_API_KEY && purchase.invoice_url) {
      try {
        // Download invoice image from storage
        const { data: fileData } = await supabase.storage
          .from("purchase-documents")
          .createSignedUrl(purchase.invoice_url, 60);

        if (fileData?.signedUrl) {
          // Call Lovable AI Gateway for document validation
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: `Eres un validador de documentos para una promoción. Debes analizar la imagen y determinar:
1. Si es un documento real (no una foto de un objeto, mesa, etc.)
2. Si parece ser una factura de compra válida
3. Si contiene información típica de una factura (número, fecha, monto, productos)

Responde SOLO con un JSON con esta estructura:
{
  "is_document": true/false,
  "is_invoice": true/false,
  "confidence": 0-100,
  "details": "Breve explicación"
}`,
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Analiza esta imagen y determina si es una factura de compra válida:",
                    },
                    {
                      type: "image_url",
                      image_url: { url: fileData.signedUrl },
                    },
                  ],
                },
              ],
              max_tokens: 300,
              temperature: 0.1,
            }),
          });

          if (response.ok) {
            const aiData = await response.json();
            const content = aiData.choices?.[0]?.message?.content || "";
            
            // Parse AI response
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                iaDetail = parsed;
                iaScore = parsed.confidence || 50;

                if (parsed.is_document && parsed.is_invoice && parsed.confidence >= 70) {
                  iaStatus = "VALID";
                } else if (parsed.confidence < 40 || !parsed.is_document) {
                  iaStatus = "INVALID";
                } else {
                  iaStatus = "REVIEW";
                }
              }
            } catch (parseError) {
              console.error("Error parsing AI response:", parseError);
              iaDetail = { raw: content, parseError: true };
            }
          } else {
            console.error("AI response error:", response.status);
            iaDetail = { error: "AI service unavailable" };
          }
        }
      } catch (aiError) {
        console.error("AI validation error:", aiError);
        iaDetail = { error: String(aiError) };
      }
    } else {
      iaDetail = { message: "No AI key configured or no invoice URL" };
    }

    // Update purchase with IA results
    const updateData: Record<string, unknown> = {
      ia_status: iaStatus,
      ia_score: iaScore,
      ia_detail: iaDetail,
    };

    // If IA says VALID, auto-approve
    if (iaStatus === "VALID" && !adminMode) {
      updateData.admin_status = "APPROVED";
      updateData.reviewed_at = new Date().toISOString();
    }

    await supabase
      .from("client_purchases")
      .update(updateData)
      .eq("id", purchaseId);

    // If approved (either by IA or admin mode), assign tickets
    let assignedTickets: string[] = [];
    const shouldAssignTickets = iaStatus === "VALID" || adminMode;
    
    if (shouldAssignTickets && purchase.products) {
      const ticketCount = purchase.products.ticket_multiplier || 1;
      const tier = purchase.products.tier || "T1";

      // Check if tickets already assigned
      const { data: existingTickets } = await supabase
        .from("tickets_assigned")
        .select("id")
        .eq("purchase_id", purchaseId);

      if (!existingTickets || existingTickets.length === 0) {
        try {
          const { data: ticketResult, error: ticketError } = await supabase.rpc(
            "rpc_assign_tickets",
            {
              p_count: ticketCount,
              p_tier: tier,
              p_purchase_id: purchaseId,
              p_owner_name: purchase.full_name,
              p_owner_email: purchase.email,
              p_owner_phone: purchase.phone,
            }
          );

          if (ticketError) {
            console.error("Ticket assignment error:", ticketError);
          } else if (ticketResult) {
            assignedTickets = ticketResult.map((t: { ticket_code: string }) => t.ticket_code);
          }
        } catch (rpcError) {
          console.error("RPC error:", rpcError);
        }
      } else {
        // Get existing ticket codes
        const { data: existingCodes } = await supabase
          .from("tickets_assigned")
          .select("ticket_id")
          .eq("purchase_id", purchaseId);

        if (existingCodes) {
          const ticketIds = existingCodes.map((t) => t.ticket_id);
          const { data: ticketPool } = await supabase
            .from("ticket_pool")
            .select("ticket_code")
            .in("id", ticketIds);
          
          assignedTickets = ticketPool?.map((t) => t.ticket_code) || [];
        }
      }
    }

    // Log notification (would send actual notifications in production)
    if (assignedTickets.length > 0) {
      await supabase.from("notification_log").insert({
        notification_type: "email",
        recipient: purchase.email,
        subject: "🎫 Tus tickets para el Mundial Skyworth 2026",
        content: `¡Felicitaciones ${purchase.full_name}! Tus ${assignedTickets.length} ticket(s) han sido asignados: ${assignedTickets.join(", ")}`,
        status: "PENDING",
        related_purchase_id: purchaseId,
      });

      if (purchase.phone) {
        await supabase.from("notification_log").insert({
          notification_type: "whatsapp",
          recipient: purchase.phone,
          content: `🎉 ¡Felicitaciones! Has recibido ${assignedTickets.length} ticket(s) para el sorteo Mundial Skyworth 2026: ${assignedTickets.join(", ")}`,
          status: "PENDING",
          related_purchase_id: purchaseId,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        iaStatus,
        iaScore,
        iaDetail,
        ticketsAssigned: assignedTickets,
        message: iaStatus === "VALID" 
          ? `¡Documentos validados! ${assignedTickets.length} ticket(s) asignados.`
          : iaStatus === "INVALID"
          ? "Los documentos no pudieron ser validados. Por favor revisa e intenta nuevamente."
          : "Tu compra está en revisión. Te notificaremos cuando sea aprobada.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process purchase error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
