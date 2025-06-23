import { createClient } from '@supabase/supabase-js';

// `import.meta.env` is only defined when bundled by Vite. When the widget is
// loaded via the standalone embed script, it is `undefined`, which would cause
// a runtime error. Gracefully fall back to an empty object in that scenario.
const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const supabaseUrl =
  (window as any).voicepilotSupabaseUrl ||
  env.VITE_SUPABASE_URL ||
  'https://ljfidzppyflrrszkgusa.supabase.co';
const supabaseKey =
  (window as any).voicepilotSupabaseKey ||
  env.VITE_SUPABASE_ANON_KEY ||
  '';

export const supabase = createClient(supabaseUrl, supabaseKey);
