import { getSupabaseServerClient } from "@/lib/supabase/server";

export type PerfilServidor = {
  id: string;
  rol: "admin" | "cliente";
  email: string | null;
  nombre: string | null;
  apellidos: string | null;
} | null;

export async function getUsuarioYPerfilActual() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, perfil: null as PerfilServidor };
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, rol, email, nombre, apellidos")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    perfil: (perfil as PerfilServidor) ?? null,
  };
}

export async function esAdminActual() {
  const { user, perfil } = await getUsuarioYPerfilActual();
  return Boolean(user && perfil?.rol === "admin");
}
