import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Get external Supabase credentials from localStorage
const getSupabaseConfig = () => {
  const externalUrl = localStorage.getItem('EXTERNAL_SUPABASE_URL');
  const externalKey = localStorage.getItem('EXTERNAL_SUPABASE_ANON_KEY');

  if (!externalUrl || !externalKey) {
    throw new Error('No Supabase configuration found. Please configure your external Supabase instance at /supabase-config');
  }

  return {
    url: externalUrl,
    key: externalKey,
    source: 'external'
  };
};

const config = getSupabaseConfig();

console.log(`🔌 Conectado a Supabase (${config.source}): ${config.url}`);

export const supabase = createClient<Database>(config.url, config.key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
