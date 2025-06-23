import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (window as any).voicepilotSupabaseUrl ||
  import.meta.env.VITE_SUPABASE_URL ||
  'https://ljfidzppyflrrszkgusa.supabase.co';
const supabaseKey =
  (window as any).voicepilotSupabaseKey ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
