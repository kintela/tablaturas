"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { normalizarSupabaseUrl } from "@/lib/supabase/normalizar-url";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  browserClient = createClient(
    normalizarSupabaseUrl(supabaseUrl),
    supabaseAnonKey
  );

  return browserClient;
}

