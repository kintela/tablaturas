import { NextResponse } from "next/server";

import {
  crearArchivosMock,
  crearGruposMock,
  crearTablaturasMock,
} from "@/lib/admin/datos-mock";
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

    const { error: errorBucket } = await supabaseAdmin.storage.createBucket(
      "tablaturas",
      {
        public: false,
      }
    );

    if (
      errorBucket &&
      !errorBucket.message.toLowerCase().includes("already exists") &&
      !errorBucket.message.toLowerCase().includes("duplicate")
    ) {
      throw errorBucket;
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

    const { data: tablaturas, error: errorTablaturas } = await supabaseAdmin
      .from("tablaturas")
      .upsert(tablaturasMock, { onConflict: "grupo_id,slug" })
      .select("id, grupo_id, titulo_cancion, slug");

    if (errorTablaturas) {
      throw errorTablaturas;
    }

    const archivosParaInsertar = [];

    for (const tablatura of tablaturas ?? []) {
      const archivosMock = crearArchivosMock(
        tablatura.grupo_id,
        tablatura.id,
        tablatura.titulo_cancion
      );

      for (const archivo of archivosMock) {
        const { error: errorSubida } = await supabaseAdmin.storage
          .from(archivo.registro.bucket)
          .upload(archivo.registro.ruta, archivo.contenido, {
            contentType: archivo.contentType,
            upsert: true,
          });

        if (errorSubida) {
          throw errorSubida;
        }

        archivosParaInsertar.push({
          tablatura_id: tablatura.id,
          ...archivo.registro,
        });
      }
    }

    const { error: errorArchivos } = await supabaseAdmin
      .from("archivos_tablatura")
      .upsert(archivosParaInsertar, { onConflict: "tablatura_id,ruta" });

    if (errorArchivos) {
      throw errorArchivos;
    }

    return NextResponse.json({
      ok: true,
      gruposCreados: grupos.length,
      tablaturasCreadas: tablaturas?.length ?? 0,
      mensaje: `Proceso completado. Grupos: ${grupos.length}. Tablaturas: ${tablaturas?.length ?? 0}. Archivos: ${archivosParaInsertar.length}.`,
    });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error desconocido creando datos mock.";

    console.error("Error creando datos mock:", error);

    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!accesoPermitido(request)) {
      return NextResponse.json(
        { error: "No autorizado para ejecutar esta acción." },
        { status: 403 }
      );
    }

    const { data: archivos, error: errorConsultaArchivos } = await supabaseAdmin
      .from("archivos_tablatura")
      .select("bucket, ruta");

    if (errorConsultaArchivos) {
      throw errorConsultaArchivos;
    }

    const rutasPorBucket = new Map<string, string[]>();

    for (const archivo of archivos) {
      const rutas = rutasPorBucket.get(archivo.bucket) ?? [];
      rutas.push(archivo.ruta);
      rutasPorBucket.set(archivo.bucket, rutas);
    }

    for (const [bucket, rutas] of rutasPorBucket.entries()) {
      if (rutas.length === 0) {
        continue;
      }

      const { error: errorStorage } = await supabaseAdmin.storage
        .from(bucket)
        .remove(rutas);

      if (errorStorage) {
        throw errorStorage;
      }
    }

    const { error: errorCompras } = await supabaseAdmin
      .from("compras")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (errorCompras) {
      throw errorCompras;
    }

    const { error: errorGrupos } = await supabaseAdmin
      .from("grupos")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (errorGrupos) {
      throw errorGrupos;
    }

    return NextResponse.json({
      ok: true,
      mensaje:
        "Se han eliminado todos los datos de grupos, tablaturas, compras y archivos del bucket.",
    });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error desconocido eliminando datos.";

    console.error("Error eliminando datos mock:", error);

    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
