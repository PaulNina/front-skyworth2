import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres el Asistente Virtual de la campaña "Gana el Mundial con Skyworth 2026" en Bolivia.

Tu rol es responder preguntas sobre la promoción de manera amable, clara y concisa.

INFORMACIÓN CLAVE DE LA CAMPAÑA:
- Promoción válida del 1 de enero al 30 de junio de 2026
- Sorteo: 15 de julio de 2026
- Premio: Viaje al Mundial 2026 (México/USA/Canadá)
- Se seleccionarán 20 preseleccionados y 5 finalistas ganadores

CÓMO PARTICIPAR:
1. Comprar un TV Skyworth en tiendas autorizadas
2. Registrar la compra en la web con factura y CI
3. Recibir tickets según el modelo:
   - 32": 1 ticket
   - 43"-50": 2 tickets
   - 55"-65": 3 tickets

REQUISITOS:
- Ser mayor de 18 años
- Residir en Bolivia
- Factura válida de compra
- CI vigente

VENDEDORES:
- Los vendedores también participan registrando sus ventas
- Acumulan puntos que se convierten en tickets
- Ranking de vendedores por ciudad

Responde SOLO sobre la campaña Skyworth Mundial 2026. Si te preguntan algo fuera de tema, amablemente indica que solo puedes ayudar con información de la promoción.

Si la información proporcionada por la base de conocimientos es relevante, úsala para dar respuestas más precisas.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [] } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "El mensaje es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Search knowledge base for relevant content
    let kbContext = "";
    try {
      const { data: kbResults } = await supabase.rpc("rpc_kb_search", {
        query_text: message,
        max_results: 3,
      });

      if (kbResults && kbResults.length > 0) {
        kbContext = "\n\nINFORMACIÓN RELEVANTE DE LA BASE DE CONOCIMIENTOS:\n" +
          kbResults.map((item: any) => `- ${item.title}: ${item.content}`).join("\n");
      }
    } catch (kbError) {
      console.error("KB search error:", kbError);
      // Continue without KB context
    }

    // Get Lovable AI API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build messages array
    const messages = [
      { role: "system", content: SYSTEM_PROMPT + kbContext },
      ...history.slice(-6), // Keep last 6 messages for context
      { role: "user", content: message },
    ];

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Por favor espera un momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Servicio temporalmente no disponible." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("Error al procesar la solicitud");
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "Lo siento, no pude procesar tu pregunta.";

    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
        kb_used: kbContext.length > 0 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Bot chat error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Error interno del servidor" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
