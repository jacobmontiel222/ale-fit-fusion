// Auto-configuration for external Supabase
export const initExternalSupabase = () => {
  const externalUrl = 'https://zlhbbwaotshufcixrnyq.supabase.co';
  const externalKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaGJid2FvdHNodWZjaXhybnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NzQ1NTksImV4cCI6MjA3NjA1MDU1OX0.v2RniQ9j2qeb0uaUxW0fITt-lIMLPUutelOVkeFWpXk';
  
  localStorage.setItem('EXTERNAL_SUPABASE_URL', externalUrl);
  localStorage.setItem('EXTERNAL_SUPABASE_ANON_KEY', externalKey);
  
  console.log('✅ Credenciales de Supabase externo configuradas');
};
