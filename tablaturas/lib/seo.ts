export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://partituras.renteriadrums.com";

export const SITE_NAME = "Renteria Drums";

export const SITE_DESCRIPTION =
  "Clases de bateria en Leioa y catálogo de partituras con PDF, previews y packs PDF + MIDI para estudiar y producir.";

export const GOOGLE_SITE_VERIFICATION =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
  "mt1md2fMhdnhBNyl6671mxZRd3WBUeiL-kfvSILmvJQ";
