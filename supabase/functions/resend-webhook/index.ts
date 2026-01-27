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

    // 1. Verifica se o evento tem a etiqueta da nossa campanha
    const campaignIdTag = event.data?.tags?.find((t: any) => t.name === 'campaign_id');
    
    if (campaignIdTag) {
      const campaignId = Number(campaignIdTag.value);
      let columnToIncrement = '';

      // 2. Mapeia o evento do Resend para nossa coluna no banco
      switch (event.type) {
        case 'email.delivered': columnToIncrement = 'delivered_count'; break;
        case 'email.opened':    columnToIncrement = 'open_count'; break;
        case 'email.clicked':   columnToIncrement = 'click_count'; break;
        case 'email.bounced':   columnToIncrement = 'bounce_count'; break;
      }

      // 3. Incrementa no banco se for um evento relevante
      if (columnToIncrement) {
        await supabase.rpc('increment_campaign_stat', { 
          row_id: campaignId, 
          column_name: columnToIncrement 
        });
        console.log(`Campanha ${campaignId}: +1 ${columnToIncrement}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});