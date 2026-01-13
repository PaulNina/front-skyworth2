import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessRequest {
  purchaseId: string;
  adminMode?: boolean;
  adminAction?: 'APPROVE' | 'REJECT';
  adminNotes?: string;
  adminUserId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { purchaseId, adminMode = false, adminAction, adminNotes, adminUserId }: ProcessRequest = await req.json();

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
      .select("*, products(model_name, tier, ticket_multiplier, points_value)")
      .eq("id", purchaseId)
      .single();

    if (purchaseError || !purchase) {
      return new Response(
        JSON.stringify({ error: "Compra no encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // STEP 1: Validate serial number against tv_serial_registry
    // =====================================================
    let serialValidation = { valid: false, error: '', tier: '', ticket_multiplier: 1 };
    
    const { data: serialData } = await supabase
      .from("tv_serial_registry")
      .select("*")
      .eq("serial_number", purchase.serial_number.toUpperCase().trim())
      .maybeSingle();

    if (serialData) {
      if (serialData.status === 'AVAILABLE') {
        serialValidation = {
          valid: true,
          error: '',
          tier: serialData.tier,
          ticket_multiplier: serialData.ticket_multiplier
        };
      } else {
        serialValidation = {
          valid: false,
          error: `Serial ya registrado (status: ${serialData.status})`,
          tier: serialData.tier,
          ticket_multiplier: serialData.ticket_multiplier
        };
      }
    } else {
      // Serial not in registry - we'll allow but flag for review
      serialValidation = {
        valid: true, // Allow but flag for admin review
        error: 'Serial no encontrado en registro oficial',
        tier: purchase.products?.tier || 'SILVER',
        ticket_multiplier: purchase.products?.ticket_multiplier || 1
      };
    }

    // =====================================================
    // STEP 2: AI Document Validation
    // =====================================================
    let iaStatus = "PENDING";
    let iaScore = 0;
    let iaDetail: Record<string, unknown> = {};

    // Only run IA validation if not already done
    if (purchase.ia_status === 'PENDING' || !purchase.ia_status) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      
      if (LOVABLE_API_KEY && purchase.invoice_url) {
        try {
          // Generate signed URL for invoice
          const { data: fileData } = await supabase.storage
            .from("purchase-documents")
            .createSignedUrl(purchase.invoice_url, 120);

          if (fileData?.signedUrl) {
            // Call Lovable AI Gateway for document validation
            const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: `Eres un experto validador de documentos para una promoción de Skyworth Bolivia.
Tu trabajo es analizar imágenes de facturas/boletas de compra y determinar si son válidas.

Criterios de validación:
1. ¿Es la imagen un documento real (no una foto de una mesa, persona, paisaje, etc.)?
2. ¿Parece ser una factura, boleta o recibo de compra?
3. ¿Contiene información típica de una factura (fecha, monto, detalle de productos)?
4. ¿Menciona productos Skyworth o electrónicos/TVs?
5. Calidad de la imagen (legible, no borrosa)

Responde ÚNICAMENTE con un JSON con esta estructura exacta:
{
  "is_document": true/false,
  "is_invoice": true/false,
  "mentions_skyworth": true/false,
  "is_readable": true/false,
  "confidence": 0-100,
  "detected_text": "extracto breve del texto detectado",
  "rejection_reason": "razón si se rechaza, null si es válido",
  "recommendation": "VALID" | "REVIEW" | "INVALID"
}`
                  },
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: "Analiza esta imagen de un documento de compra. Verifica si es una factura válida para una promoción de televisores Skyworth:"
                      },
                      {
                        type: "image_url",
                        image_url: { url: fileData.signedUrl }
                      }
                    ]
                  }
                ],
                max_tokens: 500,
                temperature: 0.1
              })
            });

            if (response.ok) {
              const aiData = await response.json();
              const content = aiData.choices?.[0]?.message?.content || "";
              
              try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  iaDetail = parsed;
                  iaScore = parsed.confidence || 0;

                  // Determine IA status based on analysis
                  if (parsed.recommendation === "VALID" || 
                      (parsed.is_document && parsed.is_invoice && parsed.confidence >= 70)) {
                    iaStatus = "VALID";
                  } else if (parsed.recommendation === "INVALID" || 
                             parsed.confidence < 30 || !parsed.is_document) {
                    iaStatus = "INVALID";
                  } else {
                    iaStatus = "REVIEW";
                  }
                }
              } catch (parseError) {
                console.error("Error parsing AI response:", parseError);
                iaDetail = { raw: content, parseError: true };
                iaStatus = "REVIEW";
              }
            } else {
              console.error("AI response error:", response.status);
              iaDetail = { error: "AI service unavailable", status: response.status };
              iaStatus = "REVIEW";
            }
          }
        } catch (aiError) {
          console.error("AI validation error:", aiError);
          iaDetail = { error: String(aiError) };
          iaStatus = "REVIEW";
        }
      } else {
        iaDetail = { message: "No AI key configured or no invoice URL" };
        iaStatus = "REVIEW";
      }
    } else {
      // Use existing IA results
      iaStatus = purchase.ia_status;
      iaScore = purchase.ia_score || 0;
      iaDetail = purchase.ia_detail || {};
    }

    // =====================================================
    // STEP 3: Determine final status and update purchase
    // =====================================================
    let finalAdminStatus = purchase.admin_status;
    let assignedTickets: string[] = [];
    const updateData: Record<string, unknown> = {
      ia_status: iaStatus,
      ia_score: iaScore,
      ia_detail: {
        ...iaDetail,
        serial_validation: serialValidation
      },
      updated_at: new Date().toISOString()
    };

    // Admin action override
    if (adminMode && adminAction) {
      if (adminAction === 'APPROVE') {
        finalAdminStatus = 'APPROVED';
        updateData.admin_status = 'APPROVED';
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = adminUserId;
        if (adminNotes) updateData.admin_notes = adminNotes;
      } else if (adminAction === 'REJECT') {
        finalAdminStatus = 'REJECTED';
        updateData.admin_status = 'REJECTED';
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = adminUserId;
        if (adminNotes) updateData.admin_notes = adminNotes;
      }
    } else if (!adminMode && iaStatus === "VALID" && serialValidation.valid) {
      // Auto-approve if IA says valid and serial is valid
      finalAdminStatus = 'APPROVED';
      updateData.admin_status = 'APPROVED';
      updateData.reviewed_at = new Date().toISOString();
    }

    // =====================================================
    // STEP 4: Assign tickets if approved
    // =====================================================
    if (finalAdminStatus === 'APPROVED') {
      // Check if tickets already assigned
      const { data: existingTickets } = await supabase
        .from("tickets_assigned")
        .select("id, ticket_id")
        .eq("purchase_id", purchaseId);

      if (!existingTickets || existingTickets.length === 0) {
        // Determine ticket count from serial registry or product
        const ticketCount = serialValidation.ticket_multiplier || purchase.products?.ticket_multiplier || 1;
        const tier = serialValidation.tier || purchase.products?.tier || "SILVER";

        try {
          const { data: ticketResult, error: ticketError } = await supabase.rpc(
            "rpc_assign_tickets",
            {
              p_count: ticketCount,
              p_tier: tier,
              p_purchase_id: purchaseId,
              p_owner_name: purchase.full_name,
              p_owner_email: purchase.email,
              p_owner_phone: purchase.phone
            }
          );

          if (ticketError) {
            console.error("Ticket assignment error:", ticketError);
          } else if (ticketResult) {
            assignedTickets = ticketResult.map((t: { ticket_code: string }) => t.ticket_code);
            
            // Save to participant_tickets for reference
            for (const ticket of ticketResult) {
              await supabase.from("participant_tickets").upsert({
                purchase_id: purchaseId,
                ticket_id: ticket.ticket_id || null,
                ticket_code: ticket.ticket_code,
                tier: tier,
                issued_at: new Date().toISOString()
              }, { onConflict: 'ticket_id', ignoreDuplicates: true });
            }

            // Update purchase with ticket info
            updateData.tickets_count = assignedTickets.length;
            updateData.tickets_issued_at = new Date().toISOString();
          }
        } catch (rpcError) {
          console.error("RPC error:", rpcError);
        }
      } else {
        // Get existing ticket codes
        const ticketIds = existingTickets.map((t) => t.ticket_id);
        const { data: ticketPool } = await supabase
          .from("ticket_pool")
          .select("ticket_code")
          .in("id", ticketIds);
        
        assignedTickets = ticketPool?.map((t) => t.ticket_code) || [];
      }

      // Mark serial as USED if in registry
      if (serialData && serialData.status === 'AVAILABLE') {
        await supabase
          .from("tv_serial_registry")
          .update({ 
            status: 'USED', 
            registered_at: new Date().toISOString(),
            registered_by_purchase_id: purchaseId,
            updated_at: new Date().toISOString()
          })
          .eq("id", serialData.id);
      }
    }

    // Update purchase record
    await supabase
      .from("client_purchases")
      .update(updateData)
      .eq("id", purchaseId);

    // =====================================================
    // STEP 5: Send notifications if approved
    // =====================================================
    if (finalAdminStatus === 'APPROVED' && assignedTickets.length > 0) {
      // Create EMAIL notification log entry
      const { data: emailLog } = await supabase.from("notification_log").insert({
        notification_type: "EMAIL",
        recipient: purchase.email,
        subject: "🎫 ¡Tus cupones para el Mundial Skyworth 2026!",
        content: `¡Felicitaciones ${purchase.full_name}! Tu compra ha sido aprobada. Has recibido ${assignedTickets.length} cupón(es) para el sorteo: ${assignedTickets.join(", ")}. ¡Mucha suerte!`,
        status: "PENDING",
        related_purchase_id: purchaseId
      }).select().single();

      // Invoke send-email function
      if (emailLog) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: purchase.email,
              subject: "🎫 ¡Tus cupones para el Mundial Skyworth 2026!",
              body: `¡Felicitaciones ${purchase.full_name}! Tu compra ha sido aprobada. Has recibido ${assignedTickets.length} cupón(es) para el sorteo: ${assignedTickets.join(", ")}. ¡Mucha suerte!`,
              isHtml: false,
              notificationLogId: emailLog.id,
              templateKey: "purchase_approved",
              templateData: {
                nombre: purchase.full_name,
                cupones: assignedTickets.join(", "),
                cantidad: String(assignedTickets.length)
              }
            }
          });
        } catch (emailError) {
          console.error("Error invoking send-email:", emailError);
        }
      }

      // Create WHATSAPP notification log entry
      if (purchase.phone) {
        const { data: waLog } = await supabase.from("notification_log").insert({
          notification_type: "WHATSAPP",
          recipient: purchase.phone,
          content: `🎉 ¡Felicitaciones ${purchase.full_name}! Tu compra Skyworth ha sido aprobada. Tus ${assignedTickets.length} cupón(es): ${assignedTickets.join(", ")}. ¡Buena suerte en el sorteo del Mundial 2026! ⚽🏆`,
          status: "PENDING",
          related_purchase_id: purchaseId
        }).select().single();

        // Invoke send-whatsapp function
        if (waLog) {
          try {
            await supabase.functions.invoke('send-whatsapp', {
              body: {
                to: purchase.phone,
                message: `🎉 ¡Felicitaciones ${purchase.full_name}! Tu compra Skyworth ha sido aprobada. Tus ${assignedTickets.length} cupón(es): ${assignedTickets.join(", ")}. ¡Buena suerte en el sorteo del Mundial 2026! ⚽🏆`,
                notificationLogId: waLog.id,
                templateKey: "purchase_approved",
                templateData: {
                  nombre: purchase.full_name,
                  cupones: assignedTickets.join(", "),
                  cantidad: String(assignedTickets.length)
                }
              }
            });
          } catch (waError) {
            console.error("Error invoking send-whatsapp:", waError);
          }
        }
      }
    } else if (finalAdminStatus === 'REJECTED') {
      // Rejection notification
      const rejectionReason = adminNotes || (iaDetail as Record<string, string>).rejection_reason || 'Los documentos no pudieron ser validados';
      
      const { data: emailLog } = await supabase.from("notification_log").insert({
        notification_type: "EMAIL",
        recipient: purchase.email,
        subject: "ℹ️ Estado de tu registro - Skyworth 2026",
        content: `Hola ${purchase.full_name}, lamentamos informarte que tu registro no pudo ser aprobado. Motivo: ${rejectionReason}. Puedes intentar registrarte nuevamente con documentos válidos.`,
        status: "PENDING",
        related_purchase_id: purchaseId
      }).select().single();

      // Invoke send-email for rejection
      if (emailLog) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: purchase.email,
              subject: "ℹ️ Estado de tu registro - Skyworth 2026",
              body: `Hola ${purchase.full_name}, lamentamos informarte que tu registro no pudo ser aprobado. Motivo: ${rejectionReason}. Puedes intentar registrarte nuevamente con documentos válidos.`,
              isHtml: false,
              notificationLogId: emailLog.id,
              templateKey: "purchase_rejected",
              templateData: {
                nombre: purchase.full_name,
                motivo: rejectionReason
              }
            }
          });
        } catch (emailError) {
          console.error("Error invoking send-email for rejection:", emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        iaStatus,
        iaScore,
        iaDetail: { ...iaDetail, serial_validation: serialValidation },
        adminStatus: finalAdminStatus,
        ticketsAssigned: assignedTickets,
        message: finalAdminStatus === 'APPROVED'
          ? `¡Compra aprobada! ${assignedTickets.length} cupón(es) asignados: ${assignedTickets.join(', ')}`
          : finalAdminStatus === 'REJECTED'
          ? 'Tu registro no pudo ser aprobado. Revisa el motivo en tu correo.'
          : iaStatus === 'REVIEW'
          ? 'Tu compra está en revisión manual. Te notificaremos pronto.'
          : 'Procesando tu compra...'
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
