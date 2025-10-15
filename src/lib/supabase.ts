import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Get external Supabase credentials from localStorage
const getSupabaseConfig = () => {
  // Prefer Lovable Cloud (env) if available
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (envUrl && envKey) {
    return {
      url: envUrl,
      key: envKey,
      source: 'cloud' as const,
    };
  }

  // Fallback to external credentials stored in localStorage
  const externalUrl = localStorage.getItem('EXTERNAL_SUPABASE_URL');
  const externalKey = localStorage.getItem('EXTERNAL_SUPABASE_ANON_KEY');

  if (externalUrl && externalKey) {
    return {
      url: externalUrl,
      key: externalKey,
      source: 'external' as const,
    };
  }

  // Return dummy config to prevent errors if nothing is configured
  return {
    url: 'https://placeholder.supabase.co',
    key: 'placeholder-key',
    source: 'unconfigured' as const,
  };
};

const config = getSupabaseConfig();

if (config.source !== 'unconfigured') {
  console.log(`🔌 Conectado a Supabase (${config.source}): ${config.url}`);
}

export const supabase = createClient<Database>(config.url, config.key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

export const isSupabaseConfigured = () => {
  const externalUrl = localStorage.getItem('EXTERNAL_SUPABASE_URL');
  const externalKey = localStorage.getItem('EXTERNAL_SUPABASE_ANON_KEY');
  return !!(externalUrl && externalKey);
};
