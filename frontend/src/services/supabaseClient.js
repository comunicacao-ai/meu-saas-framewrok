import { createClient } from '@supabase/supabase-js';

// --- COLOQUE SEUS DADOS REAIS AQUI ---
const supabaseUrl = "https://xwmstkshptutetowcstl.supabase.co"; 
const supabaseAnonKey = "sb_publishable_Jvk3uJleFnPTPUunpylKEw_3HZ6IaUg";
// -------------------------------------

export const supabase = createClient(supabaseUrl, supabaseAnonKey);