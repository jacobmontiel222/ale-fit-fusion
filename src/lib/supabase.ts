import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Try to get external Supabase credentials from localStorage
const getSupabaseConfig = () => {
  const externalUrl = localStorage.getItem('EXTERNAL_SUPABASE_URL');
  const externalKey = localStorage.getItem('EXTERNAL_SUPABASE_ANON_KEY');

  // If external credentials are configured, use them
  if (externalUrl && externalKey) {
    return {
      url: externalUrl,
      key: externalKey,
      source: 'external'
    };
  }

  // Otherwise, fall back to Lovable Cloud defaults
  const lovableUrl = import.meta.env.VITE_SUPABASE_URL;
  const lovableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!lovableUrl || !lovableKey) {
    throw new Error('No Supabase configuration found. Please configure your external Supabase instance at /supabase-config');
  }

  return {
    url: lovableUrl,
    key: lovableKey,
    source: 'lovable-cloud'
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
