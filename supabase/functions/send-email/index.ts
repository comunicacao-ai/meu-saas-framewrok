import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// O Freio (Sleep) para não estourar limite do Resend
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, to, subject, html, variables, audienceType, tags, campaignId } = await req.json();
    
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Client Admin para ler todos os contatos
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // --- SEU REMETENTE ---
    const FROM_EMAIL = "Comunicacao Framework <comunicacao@frwk.com.br>";

    // CENÁRIO 1: TESTE
    if (type === 'test') {
      let finalHtml = html || "";
      if (variables) {
        Object.keys(variables).forEach(key => {
          finalHtml = finalHtml.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
        });
      }

      console.log(`[TESTE] Enviando para ${to}...`);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [to],
          subject: subject || "Teste de Envio",
          html: finalHtml,
          tags: [{ name: 'type', value: 'test' }]
        }),
      });

      const data = await res.json();
      if (!res.ok) {
          console.error("Erro Resend Teste:", data);
          throw new Error(`Erro Resend: ${JSON.stringify(data)}`);
      }
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // CENÁRIO 2: CAMPANHA REAL
    if (type === 'campaign') {
      console.log(`[CAMPANHA] Iniciando disparo ID: ${campaignId}`);

      // 1. CORREÇÃO: Busca contatos aceitando 'active' OU 'Ativo'
      const { data: allContacts, error } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .in('status', ['active', 'Ativo', 'ativo', 'Active']); // <--- LISTA AMPLIADA

      if (error) throw error;
      if (!allContacts || allContacts.length === 0) throw new Error("Nenhum contato ativo encontrado (Verifique se o status está 'Ativo' ou 'active').");

      // 2. Filtro de Tags
      let targetContacts = allContacts;

      if (audienceType === 'tags' && tags && tags.length > 0) {
        console.log(`[FILTRO] Filtrando por tags: ${tags.join(', ')}`);
        targetContacts = allContacts.filter(contact => {
          const contactTags = Array.isArray(contact.tags) ? contact.tags : [];
          return contactTags.some((t: string) => tags.includes(t));
        });
      } else {
        console.log(`[FILTRO] Enviando para TODOS (${allContacts.length} contatos)`);
      }

      console.log(`[RESUMO] Total Filtrado: ${targetContacts.length}`);

      let sentCount = 0;
      let errorCount = 0;

      // 3. Loop de Envio
      for (const contact of targetContacts) {
        if (!contact.email) continue;

        try {
          let personalizedHtml = html || "";
          const fullName = contact.name || 'Colaborador';
          const firstName = contact.name ? contact.name.split(' ')[0] : 'Colaborador';
          
          personalizedHtml = personalizedHtml
            .replace(/\{\{name\}\}/g, fullName)
            .replace(/\{\{primeiro_nome\}\}/g, firstName)
            .replace(/\{\{email\}\}/g, contact.email)
            .replace(/\{\{company\}\}/g, contact.team || 'Framework')
            .replace(/\{\{cargo\}\}/g, contact.role || '');

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [contact.email],
              subject: subject,
              html: personalizedHtml,
              tags: [{ name: 'campaign_id', value: String(campaignId) }] 
            }),
          });

          const eventType = res.ok ? 'sent' : 'bounced';
          
          await supabaseAdmin.from('campaign_events').insert({
              campaign_id: campaignId, 
              contact_id: contact.id,
              email: contact.email,
              event_type: eventType,
              created_at: new Date()
          });

          if (res.ok) {
              sentCount++;
          } else {
              errorCount++;
              const errData = await res.json();
              console.error(`[ERRO ENVIO] ${contact.email}:`, errData);
          }

        } catch (innerError) {
          errorCount++;
          console.error(`[ERRO CRÍTICO] ${contact.email}:`, innerError);
        }

        await sleep(500); 
      }

      // 4. Atualiza Status Final
      if (campaignId) {
          await supabaseAdmin
            .from('announcements')
            .update({ 
                status: 'sent', 
                sent_count: sentCount,
                updated_at: new Date() 
            })
            .eq('id', campaignId);
      }

      return new Response(JSON.stringify({ message: "Campanha finalizada", sent: sentCount, errors: errorCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Tipo inválido" }), { status: 400, headers: corsHeaders });

  } catch (error: any) {
    console.error("Erro fatal:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});