import { redirect } from "next/navigation";

import { getUsuarioYPerfilActual } from "@/lib/supabase/auth";
import { PanelAdmin } from "./panel-admin";

export const metadata = {
  title: "Admin | Tablaturas",
};

export default async function AdminPage() {
  const { user, perfil } = await getUsuarioYPerfilActual();

  if (!user) {
    redirect("/?auth=login&next=/admin");
  }

  if (perfil?.rol !== "admin") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8dc_0%,#fff_40%,#f8fafc_100%)] px-6 py-10 text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="rounded-[2.5rem] border border-black/10 bg-white/80 p-8 backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Tablaturas
          </span>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Panel de administración
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-600">
            Desde aquí puedes sembrar el catálogo inicial y preparar el entorno
            antes de construir la búsqueda, la compra y la descarga.
          </p>
        </header>

        <PanelAdmin />
      </div>
    </main>
  );
}

