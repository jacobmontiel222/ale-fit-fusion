import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Get external Supabase credentials from localStorage
const getSupabaseConfig = () => {
  const externalUrl = localStorage.getItem('EXTERNAL_SUPABASE_URL');
  const externalKey = localStorage.getItem('EXTERNAL_SUPABASE_ANON_KEY');

  if (!externalUrl || !externalKey) {
    // Return dummy config to prevent errors
    return {
      url: 'https://placeholder.supabase.co',
      key: 'placeholder-key',
      source: 'unconfigured' as const
    };
  }

  return {
    url: externalUrl,
    key: externalKey,
    source: 'external' as const
  };
};

const config = getSupabaseConfig();

if (config.source === 'external') {
  console.log(`🔌 Conectado a Supabase (${config.source}): ${config.url}`);
}

export const supabase = createClient<Database>(config.url, config.key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // PKCE flow for better mobile support
  }
});

export const isSupabaseConfigured = () => {
  const externalUrl = localStorage.getItem('EXTERNAL_SUPABASE_URL');
  const externalKey = localStorage.getItem('EXTERNAL_SUPABASE_ANON_KEY');
  return !!(externalUrl && externalKey);
};
