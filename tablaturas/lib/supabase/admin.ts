import { createClient } from "@supabase/supabase-js";
import { normalizarSupabaseUrl } from "@/lib/supabase/normalizar-url";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
}

if (!serviceRoleKey) {
  throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(
  normalizarSupabaseUrl(supabaseUrl),
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
