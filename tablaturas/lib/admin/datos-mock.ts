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
      url_imagen_portada: null,
      publicada: true,
    };
  });
}

export function crearArchivosMock(
  grupoId: string,
  tablaturaId: string,
  tituloCancion: string
) {
  const carpetaBase = `${grupoId}/${tablaturaId}`;

  const contenidoPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 95 >>
stream
BT
/F1 20 Tf
50 780 Td
(Partitura de prueba) Tj
0 -32 Td
(Cancion: ${tituloCancion}) Tj
0 -32 Td
(Generada desde el panel admin) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000063 00000 n 
0000000122 00000 n 
0000000248 00000 n 
0000000394 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
472
%%EOF`;

  const contenidoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <rect width="1200" height="630" fill="#f6f4ee"/>
  <rect x="48" y="48" width="1104" height="534" rx="28" fill="#ffffff" stroke="#18181b" stroke-opacity="0.08"/>
  <text x="90" y="180" fill="#18181b" font-size="28" font-family="Arial, sans-serif" letter-spacing="5">TABLATURAS</text>
  <text x="90" y="280" fill="#18181b" font-size="64" font-weight="700" font-family="Arial, sans-serif">${tituloCancion}</text>
  <text x="90" y="360" fill="#52525b" font-size="32" font-family="Arial, sans-serif">Imagen previa generada automáticamente</text>
  <circle cx="1010" cy="190" r="88" fill="#18181b"/>
  <path d="M980 190h60M1010 160v60" stroke="#facc15" stroke-width="16" stroke-linecap="round"/>
</svg>`;

  return [
    {
      registro: {
        tipo_archivo: "pdf" as const,
        bucket: "tablaturas",
        ruta: `${carpetaBase}/partitura.pdf`,
        nombre_original: `${tituloCancion}.pdf`,
        tamano_bytes: Buffer.byteLength(contenidoPdf),
        mime_type: "application/pdf",
        es_principal: true,
        orden: 0,
      },
      contenido: Buffer.from(contenidoPdf, "utf-8"),
      contentType: "application/pdf",
    },
    {
      registro: {
        tipo_archivo: "imagen_previa" as const,
        bucket: "tablaturas",
        ruta: `${carpetaBase}/preview.svg`,
        nombre_original: `${tituloCancion}.svg`,
        tamano_bytes: Buffer.byteLength(contenidoSvg),
        mime_type: "image/svg+xml",
        es_principal: false,
        orden: 1,
      },
      contenido: Buffer.from(contenidoSvg, "utf-8"),
      contentType: "image/svg+xml",
    },
  ];
}

