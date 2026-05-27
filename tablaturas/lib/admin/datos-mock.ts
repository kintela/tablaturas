const NOMBRES_GRUPOS = [
  "Metallica",
  "Nirvana",
  "Pearl Jam",
  "Foo Fighters",
  "Red Hot Chili Peppers",
  "Green Day",
  "Muse",
  "Arctic Monkeys",
  "Queen",
  "The Beatles",
  "The Rolling Stones",
  "Linkin Park",
  "System of a Down",
  "Slipknot",
  "Iron Maiden",
  "AC/DC",
  "Led Zeppelin",
  "The Police",
  "Oasis",
  "Blur",
  "Radiohead",
  "The Killers",
  "Imagine Dragons",
  "Héroes del Silencio",
  "Extremoduro",
  "Marea",
  "Vetusta Morla",
  "Fito & Fitipaldis",
  "Los Suaves",
  "Soda Stereo",
] as const;

const INICIOS_CANCION = [
  "Latido",
  "Pulso",
  "Ritmo",
  "Tormenta",
  "Vértigo",
  "Ecos",
  "Pólvora",
  "Ceniza",
  "Amanecer",
  "Trueno",
] as const;

const FINALES_CANCION = [
  "de Cristal",
  "Eléctrico",
  "Nocturno",
  "de Acero",
  "Invisible",
  "del Sur",
  "de Medianoche",
  "Salvaje",
  "Errante",
  "Final",
] as const;

function aSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function crearTituloCancion(indice: number) {
  const inicio = INICIOS_CANCION[indice % INICIOS_CANCION.length];
  const final = FINALES_CANCION[Math.floor(indice / INICIOS_CANCION.length) % FINALES_CANCION.length];
  return `${inicio} ${final} ${indice + 1}`;
}

export function crearGruposMock() {
  return NOMBRES_GRUPOS.map((nombre) => ({
    nombre,
    slug: aSlug(nombre),
  }));
}

export function crearTablaturasMock(grupoId: string, grupoSlug: string) {
  return Array.from({ length: 30 }, (_, indice) => {
    const titulo = crearTituloCancion(indice);
    const slug = aSlug(titulo);
    const precioEuros = 3 + (indice % 8);

    return {
      grupo_id: grupoId,
      titulo_cancion: titulo,
      slug,
      descripcion: `Partitura de batería para "${titulo}" del grupo ${grupoSlug}.`,
      precio_venta_centimos: precioEuros * 100 + 99,
      moneda: "EUR",
      bucket_archivo: "tablaturas",
      ruta_archivo: `mocks/${grupoSlug}/${slug}.pdf`,
      url_imagen_portada: null,
      publicada: true,
    };
  });
}

