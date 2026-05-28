import { NextResponse } from "next/server";

import { esAdminActual } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

async function crearSlugTablaturaUnico(grupoId: string, tituloCancion: string) {
  const base = crearSlugBase(tituloCancion) || "tablatura";
  let slug = base;
  let intento = 2;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("tablaturas")
      .select("id")
      .eq("grupo_id", grupoId)
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

export async function GET(request: Request) {
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
        "id, grupo_id, titulo_cancion, slug, precio_venta_centimos, moneda, publicada, fecha_creacion"
      )
      .order("titulo_cancion", { ascending: true });

    if (tablaturasError) {
      throw tablaturasError;
    }

    return NextResponse.json({
      ok: true,
      grupos: grupos ?? [],
      tablaturas: tablaturas ?? [],
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

      if (
        archivo.type !== "application/pdf" &&
        !archivo.name.toLowerCase().endsWith(".pdf")
      ) {
        return NextResponse.json(
          { ok: false, error: "El archivo debe ser un PDF." },
          { status: 400 }
        );
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

      const rutaArchivo = `${grupoId}/${tablatura.id}/partitura.pdf`;
      const contenido = new Uint8Array(await archivo.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from("tablaturas")
        .upload(rutaArchivo, contenido, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: archivoError } = await supabaseAdmin
        .from("archivos_tablatura")
        .insert({
          tablatura_id: tablatura.id,
          tipo_archivo: "pdf",
          bucket: "tablaturas",
          ruta: rutaArchivo,
          nombre_original: archivo.name,
          tamano_bytes: archivo.size,
          mime_type: "application/pdf",
          es_principal: true,
          orden: 0,
        });

      if (archivoError) {
        throw archivoError;
      }

      return NextResponse.json({
        ok: true,
        mensaje: "Tablatura creada y PDF subido correctamente.",
        tablatura,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Acción no soportada." },
      { status: 400 }
    );
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "No se pudo guardar la información.";

    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
