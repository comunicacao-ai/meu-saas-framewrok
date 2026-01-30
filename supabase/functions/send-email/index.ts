import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// O Freio (Sleep)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, to, subject, html, variables, audienceType, tags, campaignId } = await req.json();
    
    // Configurações
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // --- CENÁRIO 1: TESTE (Envio Único) ---
    if (type === 'test') {
      let finalHtml = html || "";
      if (variables) {
        Object.keys(variables).forEach(key => {
          finalHtml = finalHtml.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
        });
      }

      // Envio de teste também precisa da Tag para debug, embora não salve no banco
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Comunicados Framework <comunicacao@frwk.com.br>",
          to: [to],
          subject: subject || "Teste",
          html: finalHtml,
          tags: [{ name: 'campaign_id', value: 'teste_manual' }]
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(`Erro Resend: ${JSON.stringify(data)}`);
      
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- CENÁRIO 2: CAMPANHA ---
    if (type === 'campaign') {
      // 1. Busca TODO MUNDO que está ativo
      const { data: allContacts, error } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('status', 'active');

      if (error || !allContacts || allContacts.length === 0) throw new Error("Sem contatos ativos.");

      // 2. APLICA O FILTRO (AQUI ESTÁ A LÓGICA QUE VOCÊ PEDIU) 🧠
      let targetContacts = allContacts;

      if (audienceType === 'tags' && tags && tags.length > 0) {
        console.log(`[FILTRO] Filtrando por tags: ${tags.join(', ')}`);
        
        targetContacts = allContacts.filter(contact => {
          // Verifica se o contato tem tags e se alguma delas bate com as tags da campanha
          return contact.tags && Array.isArray(contact.tags) && contact.tags.some((t: string) => tags.includes(t));
        });
      } else {
        console.log(`[FILTRO] Enviando para TODOS (${allContacts.length} contatos)`);
      }

      console.log(`[RESUMO] Total Filtrado: ${targetContacts.length} pessoas.`);

      let sentCount = 0;
      let errorCount = 0;

      // 3. Loop de Envio
      for (const contact of targetContacts) {
        if (!contact.email) continue;

        try {
          // Personalização
          let personalizedHtml = html || "";
          const fullName = contact.name || 'Colaborador';
          const firstName = contact.name ? contact.name.split(' ')[0] : 'Colaborador';
          
          personalizedHtml = personalizedHtml
            .replace(/\{\{name\}\}/g, fullName)
            .replace(/\{\{primeiro_nome\}\}/g, firstName)
            .replace(/\{\{email\}\}/g, contact.email);

          // Disparo
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Comunicados Framework <comunicacao@frwk.com.br>",
              to: [contact.email],
              subject: subject,
              html: personalizedHtml,
              // AQUI ESTÁ O CRACHÁ PARA O GRÁFICO FUNCIONAR
              tags: [{ name: 'campaign_id', value: String(campaignId) }] 
            }),
          });

          // Gravação do Log Técnico (Sent / Bounced)
          const eventType = res.ok ? 'sent' : 'bounced';
          
          await supabaseAdmin.from('campaign_events').insert({
              campaign_id: campaignId,
              contact_id: contact.id,
              email: contact.email, // Importante gravar o email!
              event_type: eventType,
              created_at: new Date()
          });

          if (res.ok) sentCount++;
          else {
             errorCount++;
             const errData = await res.json();
             console.error(`[ERRO RESEND] ${contact.email}:`, errData);
          }

        } catch (innerError) {
          errorCount++;
          console.error(innerError);
        }

        // Freio de 600ms
        await sleep(600); 
      }

      // Atualiza Status Final da Campanha
      if (campaignId) {
          await supabaseAdmin.from('campaigns').update({ status: 'sent', sent_at: new Date() }).eq('id', campaignId);
      }

      return new Response(JSON.stringify({ message: "Campanha finalizada", sent: sentCount, errors: errorCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Tipo inválido" }), { status: 400, headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});