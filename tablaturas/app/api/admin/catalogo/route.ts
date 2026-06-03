import { NextResponse } from "next/server";

import {
  construirRutaArchivoTablatura,
  type TipoArchivoTablatura,
} from "@/lib/archivos-tablatura";
import { esAdminActual } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

function extraerMensajeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const candidato = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const partes = [
      typeof candidato.message === "string" ? candidato.message : null,
      typeof candidato.details === "string" ? candidato.details : null,
      typeof candidato.hint === "string" ? candidato.hint : null,
      typeof candidato.code === "string" ? `code=${candidato.code}` : null,
    ].filter(Boolean);

    if (partes.length > 0) {
      return partes.join(" | ");
    }
  }

  return "No se pudo guardar la información.";
}

function obtenerStatusError(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const candidato = error as { status?: unknown; statusCode?: unknown };

    if (typeof candidato.status === "number") {
      return candidato.status;
    }

    if (typeof candidato.statusCode === "string") {
      const status = Number(candidato.statusCode);

      if (Number.isFinite(status)) {
        return status;
      }
    }
  }

  return 500;
}

function crearSlugBase(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function crearSlugGrupoUnico(nombre: string) {
  const base = crearSlugBase(nombre) || "grupo";
  let slug = base;
  let intento = 2;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("grupos")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return slug;
    }

    slug = `${base}-${intento}`;
    intento += 1;
  }
}

async function crearSlugTablaturaUnico(
  grupoId: string,
  tituloCancion: string,
  excluirTablaturaId?: string
) {
  const base = crearSlugBase(tituloCancion) || "tablatura";
  let slug = base;
  let intento = 2;

  while (true) {
    let query = supabaseAdmin
      .from("tablaturas")
      .select("id")
      .eq("grupo_id", grupoId)
      .eq("slug", slug);

    if (excluirTablaturaId) {
      query = query.neq("id", excluirTablaturaId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return slug;
    }

    slug = `${base}-${intento}`;
    intento += 1;
  }
}

async function asegurarBucketTablaturas() {
  const { error } = await supabaseAdmin.storage.createBucket("tablaturas", {
    public: false,
  });

  if (
    error &&
    !error.message.toLowerCase().includes("already exists") &&
    !error.message.toLowerCase().includes("duplicate")
  ) {
    throw error;
  }
}

function obtenerExtensionArchivo(nombre: string) {
  const partes = nombre.toLowerCase().split(".");
  return partes.length > 1 ? partes.pop() ?? "" : "";
}

function esPdfValido(archivo: File) {
  return (
    archivo.type === "application/pdf" ||
    archivo.name.toLowerCase().endsWith(".pdf")
  );
}

function esMidiValido(archivo: File) {
  const mimeType = archivo.type.toLowerCase();
  return (
    mimeType === "" ||
    mimeType === "audio/midi" ||
    mimeType === "audio/mid" ||
    mimeType === "audio/x-midi" ||
    mimeType === "application/x-midi" ||
    mimeType === "application/octet-stream" ||
    archivo.name.toLowerCase().endsWith(".mid") ||
    archivo.name.toLowerCase().endsWith(".midi")
  );
}

function esWavValido(archivo: File) {
  const mimeType = archivo.type.toLowerCase();
  return (
    mimeType === "" ||
    mimeType === "audio/wav" ||
    mimeType === "audio/wave" ||
    mimeType === "audio/x-wav" ||
    mimeType === "application/octet-stream" ||
    archivo.name.toLowerCase().endsWith(".wav")
  );
}

function obtenerContentTypePreview(archivo: File) {
  const extensionPreview = obtenerExtensionArchivo(archivo.name) || "png";
  return archivo.type || `image/${extensionPreview}`;
}

function obtenerContentTypeArchivo(
  tipoArchivo: Extract<TipoArchivoTablatura, "pdf" | "imagen_previa" | "midi" | "wav">,
  archivo: File
) {
  switch (tipoArchivo) {
    case "pdf":
      return "application/pdf";
    case "imagen_previa":
      return obtenerContentTypePreview(archivo);
    case "midi":
      return "audio/midi";
    case "wav":
      return "audio/wav";
  }
}

function validarArchivoSubido(
  tipoArchivo: Extract<TipoArchivoTablatura, "pdf" | "midi" | "wav">,
  archivo: File
) {
  if (tipoArchivo === "pdf" && !esPdfValido(archivo)) {
    return "El archivo debe ser un PDF.";
  }

  if (tipoArchivo === "midi" && !esMidiValido(archivo)) {
    return "El archivo MIDI debe tener extensión .mid o .midi.";
  }

  if (tipoArchivo === "wav" && !esWavValido(archivo)) {
    return "El archivo de audio debe ser un WAV.";
  }

  return null;
}

async function reemplazarArchivoTablatura(params: {
  tablaturaId: string;
  tipoArchivo: Extract<TipoArchivoTablatura, "pdf" | "imagen_previa" | "midi" | "wav">;
  archivo: File;
  rutaDestino: string;
  contentType: string;
  esPrincipal: boolean;
  orden: number;
}) {
  const {
    tablaturaId,
    tipoArchivo,
    archivo,
    rutaDestino,
    contentType,
    esPrincipal,
    orden,
  } = params;

  const contenido = new Uint8Array(await archivo.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from("tablaturas")
    .upload(rutaDestino, contenido, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: archivosActuales, error: archivosActualesError } = await supabaseAdmin
    .from("archivos_tablatura")
    .select("id, bucket, ruta")
    .eq("tablatura_id", tablaturaId)
    .eq("tipo_archivo", tipoArchivo);

  if (archivosActualesError) {
    throw archivosActualesError;
  }

  const rutasAntiguas = (archivosActuales ?? [])
    .map((archivoActual) => archivoActual.ruta)
    .filter((ruta) => ruta !== rutaDestino);

  if (rutasAntiguas.length > 0) {
    const { error: removeStorageError } = await supabaseAdmin.storage
      .from("tablaturas")
      .remove(rutasAntiguas);

    if (removeStorageError) {
      throw removeStorageError;
    }
  }

  if ((archivosActuales ?? []).length > 0) {
    const { error: borrarMetadatosError } = await supabaseAdmin
      .from("archivos_tablatura")
      .delete()
      .eq("tablatura_id", tablaturaId)
      .eq("tipo_archivo", tipoArchivo);

    if (borrarMetadatosError) {
      throw borrarMetadatosError;
    }
  }

  const { error: insertarMetadatosError } = await supabaseAdmin
    .from("archivos_tablatura")
    .insert({
      tablatura_id: tablaturaId,
      tipo_archivo: tipoArchivo,
      bucket: "tablaturas",
      ruta: rutaDestino,
      nombre_original: archivo.name,
      tamano_bytes: archivo.size,
      mime_type: contentType,
      es_principal: esPrincipal,
      orden,
    });

  if (insertarMetadatosError) {
    throw insertarMetadatosError;
  }
}

export async function GET() {
  try {
    if (!(await esAdminActual())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { data: grupos, error: gruposError } = await supabaseAdmin
      .from("grupos")
      .select("id, nombre, slug, fecha_creacion")
      .order("nombre", { ascending: true });

    if (gruposError) {
      throw gruposError;
    }

    const { data: tablaturas, error: tablaturasError } = await supabaseAdmin
      .from("tablaturas")
      .select(
        `id,
        grupo_id,
        titulo_cancion,
        slug,
        descripcion,
        precio_venta_centimos,
        moneda,
        publicada,
        fecha_creacion,
        archivos_tablatura (
          tipo_archivo,
          ruta,
          nombre_original,
          orden
        )`
      )
      .order("titulo_cancion", { ascending: true });

    if (tablaturasError) {
      throw tablaturasError;
    }

    const tablaturaIds = (tablaturas ?? []).map((tablatura) => tablatura.id);
    let metricasPorTablatura = new Map<
      string,
      { totalVentas: number; importeAcumuladoCentimos: number }
    >();

    if (tablaturaIds.length > 0) {
      const { data: comprasPagadas, error: comprasPagadasError } = await supabaseAdmin
        .from("compras")
        .select("tablatura_id, importe_pagado_centimos")
        .in("tablatura_id", tablaturaIds)
        .eq("estado", "pagada");

      if (comprasPagadasError) {
        throw comprasPagadasError;
      }

      metricasPorTablatura = (comprasPagadas ?? []).reduce((acc, compra) => {
        const actual = acc.get(compra.tablatura_id) ?? {
          totalVentas: 0,
          importeAcumuladoCentimos: 0,
        };

        actual.totalVentas += 1;
        actual.importeAcumuladoCentimos += compra.importe_pagado_centimos;
        acc.set(compra.tablatura_id, actual);
        return acc;
      }, metricasPorTablatura);
    }

    return NextResponse.json({
      ok: true,
      grupos: grupos ?? [],
      tablaturas: (tablaturas ?? []).map((tablatura) => {
        const metricas = metricasPorTablatura.get(tablatura.id);

        return {
          ...tablatura,
          total_ventas: metricas?.totalVentas ?? 0,
          importe_acumulado_centimos: metricas?.importeAcumuladoCentimos ?? 0,
        };
      }),
    });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "No se pudo cargar el catálogo.";

    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await esAdminActual())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const formData = await request.formData();
    const accion = String(formData.get("accion") ?? "");

    if (accion === "crear-grupo") {
      const nombre = String(formData.get("nombre") ?? "").trim();

      if (!nombre) {
        return NextResponse.json(
          { ok: false, error: "Debes indicar el nombre del grupo." },
          { status: 400 }
        );
      }

      const slug = await crearSlugGrupoUnico(nombre);

      const { data, error } = await supabaseAdmin
        .from("grupos")
        .insert({ nombre, slug })
        .select("id, nombre, slug")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        mensaje: "Grupo creado correctamente.",
        grupo: data,
      });
    }

    if (accion === "crear-tablatura") {
      const grupoId = String(formData.get("grupoId") ?? "").trim();
      const tituloCancion = String(formData.get("tituloCancion") ?? "").trim();
      const descripcion = String(formData.get("descripcion") ?? "").trim();
      const precioVentaCentimos = Number(formData.get("precioVentaCentimos") ?? "0");
      const moneda = String(formData.get("moneda") ?? "EUR").trim().toUpperCase();
      const publicada = String(formData.get("publicada") ?? "true") === "true";
      const archivo = formData.get("archivo");
      const preview = formData.get("preview");
      const midi = formData.get("midi");
      const audioWav = formData.get("audioWav");

      if (!grupoId) {
        return NextResponse.json(
          { ok: false, error: "Debes seleccionar un grupo." },
          { status: 400 }
        );
      }

      if (!tituloCancion) {
        return NextResponse.json(
          { ok: false, error: "Debes indicar el título de la canción." },
          { status: 400 }
        );
      }

      if (!Number.isFinite(precioVentaCentimos) || precioVentaCentimos < 0) {
        return NextResponse.json(
          { ok: false, error: "El precio debe ser un número válido." },
          { status: 400 }
        );
      }

      if (!(archivo instanceof File) || archivo.size === 0) {
        return NextResponse.json(
          { ok: false, error: "Debes adjuntar un archivo PDF." },
          { status: 400 }
        );
      }

      const errorPdf = validarArchivoSubido("pdf", archivo);

      if (errorPdf) {
        return NextResponse.json(
          { ok: false, error: errorPdf },
          { status: 400 }
        );
      }

      if (midi instanceof File && midi.size > 0) {
        const errorMidi = validarArchivoSubido("midi", midi);

        if (errorMidi) {
          return NextResponse.json({ ok: false, error: errorMidi }, { status: 400 });
        }
      }

      if (audioWav instanceof File && audioWav.size > 0) {
        const errorWav = validarArchivoSubido("wav", audioWav);

        if (errorWav) {
          return NextResponse.json({ ok: false, error: errorWav }, { status: 400 });
        }
      }

      await asegurarBucketTablaturas();

      const slug = await crearSlugTablaturaUnico(grupoId, tituloCancion);

      const { data: tablatura, error: tablaturaError } = await supabaseAdmin
        .from("tablaturas")
        .insert({
          grupo_id: grupoId,
          titulo_cancion: tituloCancion,
          slug,
          descripcion: descripcion || null,
          precio_venta_centimos: Math.trunc(precioVentaCentimos),
          moneda: moneda || "EUR",
          publicada,
        })
        .select("id, grupo_id, titulo_cancion, slug")
        .single();

      if (tablaturaError) {
        throw tablaturaError;
      }

      const rutaArchivo = construirRutaArchivoTablatura({
        grupoId,
        tablaturaId: tablatura.id,
        tipoArchivo: "pdf",
      });

      await reemplazarArchivoTablatura({
        tablaturaId: tablatura.id,
        tipoArchivo: "pdf",
        archivo,
        rutaDestino: rutaArchivo,
        contentType: obtenerContentTypeArchivo("pdf", archivo),
        esPrincipal: true,
        orden: 0,
      });

      if (preview instanceof File && preview.size > 0) {
        const extensionPreview = obtenerExtensionArchivo(preview.name) || "png";
        const rutaPreview = construirRutaArchivoTablatura({
          grupoId,
          tablaturaId: tablatura.id,
          tipoArchivo: "imagen_previa",
          extensionPreview,
        });

        await reemplazarArchivoTablatura({
          tablaturaId: tablatura.id,
          tipoArchivo: "imagen_previa",
          archivo: preview,
          rutaDestino: rutaPreview,
          contentType: obtenerContentTypeArchivo("imagen_previa", preview),
          esPrincipal: false,
          orden: 1,
        });
      }

      if (midi instanceof File && midi.size > 0) {
        await reemplazarArchivoTablatura({
          tablaturaId: tablatura.id,
          tipoArchivo: "midi",
          archivo: midi,
          rutaDestino: construirRutaArchivoTablatura({
            grupoId,
            tablaturaId: tablatura.id,
            tipoArchivo: "midi",
          }),
          contentType: obtenerContentTypeArchivo("midi", midi),
          esPrincipal: false,
          orden: 2,
        });
      }

      if (audioWav instanceof File && audioWav.size > 0) {
        await reemplazarArchivoTablatura({
          tablaturaId: tablatura.id,
          tipoArchivo: "wav",
          archivo: audioWav,
          rutaDestino: construirRutaArchivoTablatura({
            grupoId,
            tablaturaId: tablatura.id,
            tipoArchivo: "wav",
          }),
          contentType: obtenerContentTypeArchivo("wav", audioWav),
          esPrincipal: false,
          orden: 3,
        });
      }

      return NextResponse.json({
        ok: true,
        mensaje: "Tablatura creada y archivos subidos correctamente.",
        tablatura,
      });
    }

    if (accion === "actualizar-tablatura") {
      const tablaturaId = String(formData.get("tablaturaId") ?? "").trim();
      const grupoId = String(formData.get("grupoId") ?? "").trim();
      const tituloCancion = String(formData.get("tituloCancion") ?? "").trim();
      const descripcion = String(formData.get("descripcion") ?? "").trim();
      const precioVentaCentimos = Number(formData.get("precioVentaCentimos") ?? "0");
      const moneda = String(formData.get("moneda") ?? "EUR").trim().toUpperCase();
      const publicada = String(formData.get("publicada") ?? "true") === "true";
      const archivo = formData.get("archivo");
      const preview = formData.get("preview");
      const midi = formData.get("midi");
      const audioWav = formData.get("audioWav");

      if (!tablaturaId) {
        return NextResponse.json(
          { ok: false, error: "Falta la tablatura a editar." },
          { status: 400 }
        );
      }

      if (!grupoId) {
        return NextResponse.json(
          { ok: false, error: "Debes seleccionar un grupo." },
          { status: 400 }
        );
      }

      if (!tituloCancion) {
        return NextResponse.json(
          { ok: false, error: "Debes indicar el título de la canción." },
          { status: 400 }
        );
      }

      if (!Number.isFinite(precioVentaCentimos) || precioVentaCentimos < 0) {
        return NextResponse.json(
          { ok: false, error: "El precio debe ser un número válido." },
          { status: 400 }
        );
      }

      const { error: actualError } = await supabaseAdmin
        .from("tablaturas")
        .select("id")
        .eq("id", tablaturaId)
        .single();

      if (actualError) {
        throw actualError;
      }

      const slug = await crearSlugTablaturaUnico(
        grupoId,
        tituloCancion,
        tablaturaId
      );

      const { error: updateError } = await supabaseAdmin
        .from("tablaturas")
        .update({
          grupo_id: grupoId,
          titulo_cancion: tituloCancion,
          slug,
          descripcion: descripcion || null,
          precio_venta_centimos: Math.trunc(precioVentaCentimos),
          moneda: moneda || "EUR",
          publicada,
        })
        .eq("id", tablaturaId);

      if (updateError) {
        throw updateError;
      }

      await asegurarBucketTablaturas();

      if (archivo instanceof File && archivo.size > 0) {
        const errorPdf = validarArchivoSubido("pdf", archivo);

        if (errorPdf) {
          return NextResponse.json(
            { ok: false, error: errorPdf },
            { status: 400 }
          );
        }

        await reemplazarArchivoTablatura({
          tablaturaId,
          tipoArchivo: "pdf",
          archivo,
          rutaDestino: construirRutaArchivoTablatura({
            grupoId,
            tablaturaId,
            tipoArchivo: "pdf",
          }),
          contentType: obtenerContentTypeArchivo("pdf", archivo),
          esPrincipal: true,
          orden: 0,
        });
      }

      if (preview instanceof File && preview.size > 0) {
        const extensionPreview = obtenerExtensionArchivo(preview.name) || "png";

        await reemplazarArchivoTablatura({
          tablaturaId,
          tipoArchivo: "imagen_previa",
          archivo: preview,
          rutaDestino: construirRutaArchivoTablatura({
            grupoId,
            tablaturaId,
            tipoArchivo: "imagen_previa",
            extensionPreview,
          }),
          contentType: obtenerContentTypeArchivo("imagen_previa", preview),
          esPrincipal: false,
          orden: 1,
        });
      }

      if (midi instanceof File && midi.size > 0) {
        const errorMidi = validarArchivoSubido("midi", midi);

        if (errorMidi) {
          return NextResponse.json({ ok: false, error: errorMidi }, { status: 400 });
        }

        await reemplazarArchivoTablatura({
          tablaturaId,
          tipoArchivo: "midi",
          archivo: midi,
          rutaDestino: construirRutaArchivoTablatura({
            grupoId,
            tablaturaId,
            tipoArchivo: "midi",
          }),
          contentType: obtenerContentTypeArchivo("midi", midi),
          esPrincipal: false,
          orden: 2,
        });
      }

      if (audioWav instanceof File && audioWav.size > 0) {
        const errorWav = validarArchivoSubido("wav", audioWav);

        if (errorWav) {
          return NextResponse.json({ ok: false, error: errorWav }, { status: 400 });
        }

        await reemplazarArchivoTablatura({
          tablaturaId,
          tipoArchivo: "wav",
          archivo: audioWav,
          rutaDestino: construirRutaArchivoTablatura({
            grupoId,
            tablaturaId,
            tipoArchivo: "wav",
          }),
          contentType: obtenerContentTypeArchivo("wav", audioWav),
          esPrincipal: false,
          orden: 3,
        });
      }

      return NextResponse.json({
        ok: true,
        mensaje: "Tablatura actualizada correctamente.",
      });
    }

    if (accion === "eliminar-tablatura") {
      const tablaturaId = String(formData.get("tablaturaId") ?? "").trim();

      if (!tablaturaId) {
        return NextResponse.json(
          { ok: false, error: "Falta la tablatura a eliminar." },
          { status: 400 }
        );
      }

      const { data: archivos, error: archivosError } = await supabaseAdmin
        .from("archivos_tablatura")
        .select("bucket, ruta")
        .eq("tablatura_id", tablaturaId);

      if (archivosError) {
        throw archivosError;
      }

      const rutasPorBucket = new Map<string, string[]>();

      for (const archivo of archivos ?? []) {
        const rutas = rutasPorBucket.get(archivo.bucket) ?? [];
        rutas.push(archivo.ruta);
        rutasPorBucket.set(archivo.bucket, rutas);
      }

      for (const [bucket, rutas] of rutasPorBucket.entries()) {
        if (rutas.length === 0) {
          continue;
        }

        const { error: removeError } = await supabaseAdmin.storage
          .from(bucket)
          .remove(rutas);

        if (removeError) {
          throw removeError;
        }
      }

      const { error: deleteError } = await supabaseAdmin
        .from("tablaturas")
        .delete()
        .eq("id", tablaturaId);

      if (deleteError) {
        throw deleteError;
      }

      return NextResponse.json({
        ok: true,
        mensaje: "Tablatura eliminada correctamente.",
      });
    }

    return NextResponse.json(
      { ok: false, error: "Acción no soportada." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error en /api/admin/catalogo", error);
    const status = obtenerStatusError(error);
    const mensajeBase = extraerMensajeError(error);
    const mensaje =
      status === 413
        ? "El archivo supera el tamano maximo permitido por Supabase Storage para este proyecto o bucket."
        : mensajeBase;

    return NextResponse.json({ ok: false, error: mensaje }, { status });
  }
}
