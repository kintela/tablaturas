import { NextResponse } from "next/server";

import {
  obtenerEtiquetaArchivo,
  TIPOS_ARCHIVO_DESCARGABLES,
  type TipoArchivoDescargable,
} from "@/lib/archivos-tablatura";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUsuarioYPerfilActual } from "@/lib/supabase/auth";

type ArchivoDescarga = {
  tipo: TipoArchivoDescargable;
  etiqueta: string;
  url: string | null;
};

export async function GET() {
  try {
    const { user } = await getUsuarioYPerfilActual();

    if (!user) {
      return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
    }

    const { data: compras, error: comprasError } = await supabaseAdmin
      .from("compras")
      .select("pedido_id, tablatura_id, importe_pagado_centimos, moneda, fecha_pago")
      .eq("usuario_id", user.id)
      .eq("estado", "pagada")
      .order("fecha_pago", { ascending: false });

    if (comprasError) {
      throw comprasError;
    }

    const comprasPagadas = compras ?? [];
    const tablaturaIds = [...new Set(comprasPagadas.map((compra) => compra.tablatura_id))];

    if (tablaturaIds.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const [{ data: tablaturas, error: tablaturasError }, { data: archivos, error: archivosError }] =
      await Promise.all([
      supabaseAdmin
        .from("tablaturas")
        .select("id, grupo_id, titulo_cancion")
        .in("id", tablaturaIds),
        supabaseAdmin
          .from("archivos_tablatura")
          .select("tablatura_id, bucket, ruta, tipo_archivo, es_principal, orden")
          .in("tablatura_id", tablaturaIds)
          .in("tipo_archivo", [...TIPOS_ARCHIVO_DESCARGABLES]),
      ]);

    if (tablaturasError) {
      throw tablaturasError;
    }

    if (archivosError) {
      throw archivosError;
    }

    const grupoIds = [...new Set((tablaturas ?? []).map((tablatura) => tablatura.grupo_id))];
    const { data: grupos, error: gruposError } = await supabaseAdmin
      .from("grupos")
      .select("id, nombre")
      .in("id", grupoIds);

    if (gruposError) {
      throw gruposError;
    }

    const gruposPorId = new Map((grupos ?? []).map((grupo) => [grupo.id, grupo.nombre]));
    const tablaturasPorId = new Map((tablaturas ?? []).map((tablatura) => [tablatura.id, tablatura]));
    const archivosPorTablatura = new Map<
      string,
      Array<{
        bucket: string;
        ruta: string;
        tipo_archivo: TipoArchivoDescargable;
        es_principal: boolean;
        orden: number;
      }>
    >();

    for (const archivo of archivos ?? []) {
      const actuales = archivosPorTablatura.get(archivo.tablatura_id) ?? [];
      actuales.push({
        bucket: archivo.bucket,
        ruta: archivo.ruta,
        tipo_archivo: archivo.tipo_archivo as TipoArchivoDescargable,
        es_principal: archivo.es_principal,
        orden: archivo.orden,
      });
      archivosPorTablatura.set(archivo.tablatura_id, actuales);
    }

    const ttlSegundos = Number(
      process.env.PEDIDO_DOWNLOAD_URL_TTL_SECONDS ?? 60 * 60 * 24 * 7
    );

    const items = await Promise.all(
      comprasPagadas.map(async (compra) => {
        const tablatura = tablaturasPorId.get(compra.tablatura_id);
        const archivos = [...(archivosPorTablatura.get(compra.tablatura_id) ?? [])].sort(
          (a, b) => {
            if (a.es_principal === b.es_principal) {
              return a.orden - b.orden;
            }

            return a.es_principal ? -1 : 1;
          }
        );

        const archivosDescarga: ArchivoDescarga[] = await Promise.all(
          archivos.map(async (archivo) => {
            const { data } = await supabaseAdmin.storage
              .from(archivo.bucket)
              .createSignedUrl(archivo.ruta, ttlSegundos);

            return {
              tipo: archivo.tipo_archivo,
              etiqueta: obtenerEtiquetaArchivo(archivo.tipo_archivo),
              url: data?.signedUrl ?? null,
            };
          })
        );

        const downloadUrl =
          archivosDescarga.find((archivo) => archivo.tipo === "pdf")?.url ?? null;

        return {
          pedidoId: compra.pedido_id,
          tablaturaId: compra.tablatura_id,
          titulo: tablatura?.titulo_cancion ?? "Partitura",
          grupoNombre: tablatura ? (gruposPorId.get(tablatura.grupo_id) ?? "Grupo sin nombre") : "Grupo sin nombre",
          precioPagadoCentimos: compra.importe_pagado_centimos,
          moneda: compra.moneda,
          fechaPago: compra.fecha_pago,
          archivosDescarga,
          downloadUrl,
        };
      })
    );

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "No se pudieron cargar los pedidos.";

    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
