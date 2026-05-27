import { supabaseAdmin } from "@/lib/supabase/admin";

type GrupoRow = {
  nombre: string;
  slug: string;
};

type ArchivoRow = {
  tipo_archivo: "pdf" | "imagen_previa" | "audio" | "zip" | "otro";
  bucket: string;
  ruta: string;
  es_principal: boolean;
  orden: number;
};

type TablaturaRow = {
  id: string;
  grupo_id: string;
  titulo_cancion: string;
  slug: string;
  descripcion: string | null;
  precio_venta_centimos: number;
  moneda: string;
  grupos: GrupoRow | null;
  archivos_tablatura: ArchivoRow[];
};

export type TablaturaListado = {
  id: string;
  tituloCancion: string;
  slug: string;
  descripcion: string | null;
  precioVentaCentimos: number;
  moneda: string;
  grupo: {
    nombre: string;
    slug: string;
  } | null;
  previewUrl: string | null;
  pdfUrl: string | null;
};

async function crearUrlFirmada(bucket: string, ruta: string) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(ruta, 60 * 60);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

export async function listarTablaturasPublicadas(terminoBusqueda?: string) {
  const { data, error } = await supabaseAdmin
    .from("tablaturas")
    .select(
      `
        id,
        grupo_id,
        titulo_cancion,
        slug,
        descripcion,
        precio_venta_centimos,
        moneda,
        grupos (
          nombre,
          slug
        ),
        archivos_tablatura (
          tipo_archivo,
          bucket,
          ruta,
          es_principal,
          orden
        )
      `
    )
    .eq("publicada", true)
    .order("titulo_cancion", { ascending: true })
    .limit(900);

  if (error) {
    throw new Error(error.message);
  }

  const terminoNormalizado = terminoBusqueda?.trim().toLowerCase();
  const filas = (data ?? []) as TablaturaRow[];

  const filtradas = terminoNormalizado
    ? filas.filter((tablatura) => {
        const titulo = tablatura.titulo_cancion.toLowerCase();
        const grupo = tablatura.grupos?.nombre.toLowerCase() ?? "";
        return (
          titulo.includes(terminoNormalizado) ||
          grupo.includes(terminoNormalizado)
        );
      })
    : filas;

  const resultados = await Promise.all(
    filtradas.slice(0, 60).map(async (tablatura) => {
      const archivosOrdenados = [...(tablatura.archivos_tablatura ?? [])].sort(
        (a, b) => a.orden - b.orden
      );
      const preview = archivosOrdenados.find(
        (archivo) => archivo.tipo_archivo === "imagen_previa"
      );
      const principal =
        archivosOrdenados.find((archivo) => archivo.es_principal) ??
        archivosOrdenados.find((archivo) => archivo.tipo_archivo === "pdf");

      const rutaPreviewInferida = `${tablatura.grupo_id}/${tablatura.id}/preview.svg`;
      const rutaPdfInferida = `${tablatura.grupo_id}/${tablatura.id}/partitura.pdf`;

      const [previewUrl, pdfUrl] = await Promise.all([
        crearUrlFirmada(
          preview?.bucket ?? "tablaturas",
          preview?.ruta ?? rutaPreviewInferida
        ),
        crearUrlFirmada(
          principal?.bucket ?? "tablaturas",
          principal?.ruta ?? rutaPdfInferida
        ),
      ]);

      return {
        id: tablatura.id,
        tituloCancion: tablatura.titulo_cancion,
        slug: tablatura.slug,
        descripcion: tablatura.descripcion,
        precioVentaCentimos: tablatura.precio_venta_centimos,
        moneda: tablatura.moneda,
        grupo: tablatura.grupos
          ? {
              nombre: tablatura.grupos.nombre,
              slug: tablatura.grupos.slug,
            }
          : null,
        previewUrl,
        pdfUrl,
      } satisfies TablaturaListado;
    })
  );

  return {
    total: filtradas.length,
    resultados,
  };
}
