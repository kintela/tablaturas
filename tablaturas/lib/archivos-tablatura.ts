export const TIPOS_ARCHIVO_DESCARGABLES = ["pdf", "midi", "wav"] as const;

export type TipoArchivoDescargable = (typeof TIPOS_ARCHIVO_DESCARGABLES)[number];

export type TipoArchivoTablatura =
  | "pdf"
  | "imagen_previa"
  | "midi"
  | "wav"
  | "zip"
  | "otro";

export function obtenerEtiquetaArchivo(tipoArchivo: TipoArchivoDescargable) {
  switch (tipoArchivo) {
    case "pdf":
      return "PDF";
    case "midi":
      return "MIDI";
    case "wav":
      return "WAV";
  }
}

export function construirRutaArchivoTablatura(params: {
  grupoId: string;
  tablaturaId: string;
  tipoArchivo: Extract<TipoArchivoTablatura, "pdf" | "imagen_previa" | "midi" | "wav">;
  extensionPreview?: string;
}) {
  const { grupoId, tablaturaId, tipoArchivo, extensionPreview = "png" } = params;
  const carpetaBase = `${grupoId}/${tablaturaId}`;

  switch (tipoArchivo) {
    case "pdf":
      return `${carpetaBase}/partitura.pdf`;
    case "imagen_previa":
      return `${carpetaBase}/preview.${extensionPreview}`;
    case "midi":
      return `${carpetaBase}/midi.mid`;
    case "wav":
      return `${carpetaBase}/audio.wav`;
  }
}
