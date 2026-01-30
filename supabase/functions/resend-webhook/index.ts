import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const event = await req.json();
    const type = event.type;
    const data = event.data;

    console.log(`[WEBHOOK] Recebi: ${type}`);

    // --- BLINDAGEM DO CÓDIGO ---
    // 1. Loga exatamente o que chegou nas tags para debug
    console.log(`[DEBUG TAGS] Conteúdo: ${JSON.stringify(data.tags)}`);

    let campaignId = null;

    // 2. Verifica SE existe tags e SE é uma lista (Array) antes de usar .find
    if (data.tags && Array.isArray(data.tags)) {
      const tag = data.tags.find((t: any) => t.name === 'campaign_id');
      campaignId = tag ? tag.value : null;
    } 
    // 3. Caso o Resend mande como objeto simples (fail-safe)
    else if (data.tags && typeof data.tags === 'object') {
      campaignId = data.tags['campaign_id'] || null;
    }

    const email = data.to && data.to[0];

    if (!email) {
      console.log("[AVISO] Evento sem e-mail. Ignorando.");
      return new Response("Sem email", { status: 200 });
    }

    if (!campaignId) {
       console.warn(`[ALERTA] ID da campanha não encontrado nas tags. Email: ${email}`);
       // Vamos continuar para salvar o evento mesmo sem ID, para você ver no banco
    }

    // Busca o contato
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email)
      .single();

    if (!contact) {
      console.log(`[AVISO] Contato não cadastrado: ${email}`);
      return new Response("Contato desconhecido", { status: 200 });
    }

    const simpleType = type.replace('email.', ''); 

    // Grava no Banco
    const { error: insertError } = await supabase.from('campaign_events').insert({
      campaign_id: campaignId || null, 
      contact_id: contact.id,
      email: email, 
      event_type: simpleType,
      created_at: event.created_at || new Date()
    });

    if (insertError) {
      console.error(`[ERRO BANCO] ${insertError.message}`);
    } else {
      console.log(`[SUCESSO] Gravado: ${simpleType} | Campanha: ${campaignId}`);
    }
    
    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error: any) {
    console.error(`[CRITICO] ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});