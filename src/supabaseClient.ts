import { createClient } from "@supabase/supabase-js";

const env = import.meta.env as Record<string, string | undefined>;

const supabaseUrl =
  env["VITE_SUPABASE_URL"] ||
  "https://gixagpfbhfuyxlhqpqui.supabase.co";

const supabaseAnonKey =
  env["VITE_SUPABASE_ANON_KEY"] ||
  env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  "sb_publishable_AFY0PrmnDhihRjpg00GsoQ_DIKVS9PP";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
