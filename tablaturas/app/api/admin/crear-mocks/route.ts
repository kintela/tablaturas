import { NextResponse } from "next/server";

import { crearGruposMock, crearTablaturasMock } from "@/lib/admin/datos-mock";
import { supabaseAdmin } from "@/lib/supabase/admin";

function accesoPermitido(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const tokenEsperado = process.env.ADMIN_PANEL_TOKEN;
  const tokenRecibido = request.headers.get("x-admin-token");

  return Boolean(tokenEsperado && tokenRecibido === tokenEsperado);
}

export async function POST(request: Request) {
  try {
    if (!accesoPermitido(request)) {
      return NextResponse.json(
        { error: "No autorizado para ejecutar esta acción." },
        { status: 403 }
      );
    }

    const gruposMock = crearGruposMock();

    const { data: grupos, error: errorGrupos } = await supabaseAdmin
      .from("grupos")
      .upsert(gruposMock, { onConflict: "slug" })
      .select("id, slug");

    if (errorGrupos) {
      throw errorGrupos;
    }

    const tablaturasMock = grupos.flatMap((grupo) =>
      crearTablaturasMock(grupo.id, grupo.slug)
    );

    const { error: errorTablaturas } = await supabaseAdmin
      .from("tablaturas")
      .upsert(tablaturasMock, { onConflict: "grupo_id,slug" });

    if (errorTablaturas) {
      throw errorTablaturas;
    }

    return NextResponse.json({
      ok: true,
      gruposCreados: grupos.length,
      tablaturasCreadas: tablaturasMock.length,
    });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error desconocido creando datos mock.";

    console.error("Error creando datos mock:", error);

    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
