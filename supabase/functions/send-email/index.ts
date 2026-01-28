import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, to, subject, html, variables, audienceType, tags, campaignId, baseUrl } = await req.json();

    // 2. Retrieve Environment Variables
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing environment variables (RESEND_API_KEY, SUPABASE_URL, or SERVICE_ROLE_KEY)");
    }

    // 3. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- SCENARIO 1: TEST EMAIL (Single Send) ---
    if (type === 'test') {
      let finalHtml = html;
      
      if (variables) {
        Object.keys(variables).forEach(key => {
          finalHtml = finalHtml.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
        });
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Comunicados <onboarding@resend.dev>", // Mude para seu dominio verificado quando tiver
          to: [to],
          subject: subject,
          html: finalHtml,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- SCENARIO 2: CAMPAIGN (Bulk Send) ---
    if (type === 'campaign') {
      // A. Fetch Active Contacts
      const { data: contacts, error } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('status', 'active');
      
      if (error) throw error;

      // B. Filter by Tags (if applicable)
      let targetContacts = contacts || [];
      if (audienceType === 'tags' && tags && tags.length > 0) {
        targetContacts = targetContacts.filter(c => 
          c.tags && c.tags.some((t: string) => tags.includes(t))
        );
      }

      let sentCount = 0;
      let errorCount = 0;

      // C. Loop through contacts
      for (const contact of targetContacts) {
        if (!contact.email) continue;

        try {
          let personalizedHtml = html;
          
          // D. Personalization Logic
          const fullName = contact.name || 'Colaborador';
          const firstName = contact.name ? contact.name.split(' ')[0] : 'Colaborador';
          
          const base = baseUrl || 'https://yourapp.com';
          personalizedHtml = personalizedHtml
            .replace(/\{\{base_url\}\}/g, base)
            .replace(/\{\{campaign_id\}\}/g, String(campaignId))
            .replace(/\{\{contact_id\}\}/g, String(contact.id))
            .replace(/\{\{name\}\}/g, fullName)
            .replace(/\{\{nome\}\}/g, fullName)
            .replace(/\{\{primeiro_nome\}\}/g, firstName)
            .replace(/\{\{email\}\}/g, contact.email || '')
            .replace(/\{\{cargo\}\}/g, contact.role || '')
            .replace(/\{\{empresa\}\}/g, 'Framework')
            .replace(/\{\{company\}\}/g, 'Framework');

          // E. Send to Resend
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Comunicados <onboarding@resend.dev>",
              to: [contact.email],
              subject: subject,
              html: personalizedHtml,
              tags: [
                { name: 'campaign_id', value: String(campaignId) }
              ]
            }),
          });

          // F. Update Stats & Logs in Database
          if (res.ok) {
            sentCount++;
            
            // 1. INCREMENTAR CONTADOR (KPIs Rápidos)
            // Não usamos await para não travar o loop
            supabaseAdmin.rpc('increment_campaign_stat', { 
              row_id: campaignId, 
              column_name: 'sent_count' 
            });

            // 2. REGISTRAR O EVENTO (Para o Relatório Detalhado) <--- AQUI ESTÁ A NOVIDADE
            await supabaseAdmin.from('campaign_events').insert({
                campaign_id: campaignId,
                email: contact.email,
                event_type: 'delivered', // Marcamos como entregue
                contact_tags: contact.tags
            });

          } else {
            errorCount++;
            console.error(`Failed to send to ${contact.email}`);
            
            // Opcional: Registrar erro na tabela de eventos também
            await supabaseAdmin.from('campaign_events').insert({
                campaign_id: campaignId,
                email: contact.email,
                event_type: 'bounce',
                contact_tags: contact.tags
            });
          }

        } catch (innerError) {
          console.error(`Critical error sending to ${contact.email}:`, innerError);
          errorCount++;
        }
      }

      return new Response(JSON.stringify({ 
        message: "Campaign processed", 
        total_targets: targetContacts.length,
        sent: sentCount,
        errors: errorCount
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ error: "Invalid request type" }), { status: 400, headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}); 