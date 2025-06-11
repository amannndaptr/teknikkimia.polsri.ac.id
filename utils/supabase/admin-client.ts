import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with the service role key
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase URL or service role key');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Export a utility function specifically for user management
export const getAdminAuthClient = () => {
  const adminClient = createAdminClient();
  return adminClient.auth.admin;
};