import Link from "next/link";

import { listarTablaturasPublicadas } from "@/lib/catalogo/listar-tablaturas";

type HomePageProps = {
  searchParams?: Promise<{
    q?: string;
    columnas?: string;
    vista?: string;
  }>;
};

function formatearPrecio(precioVentaCentimos: number, moneda: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: moneda,
  }).format(precioVentaCentimos / 100);
}

function obtenerColumnas(valor?: string) {
  if (valor === "4" || valor === "6") {
    return valor;
  }

  return "3";
}

function crearHref(q: string, columnas: string) {
  const params = new URLSearchParams();

  if (q.trim()) {
    params.set("q", q.trim());
  }

  params.set("columnas", columnas);

  return `/?${params.toString()}`;
}

function crearHrefConVista(q: string, columnas: string, vista: string) {
  const params = new URLSearchParams();

  if (q.trim()) {
    params.set("q", q.trim());
  }

  params.set("columnas", columnas);
  params.set("vista", vista);

  return `/?${params.toString()}`;
}

function IconoCarrito() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h9.9a1 1 0 0 0 1-.8L21 7H7.2" />
    </svg>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const terminoBusqueda = params?.q ?? "";
  const columnas = obtenerColumnas(params?.columnas);
  const vista = params?.vista === "agrupada" ? "agrupada" : "rejilla";
  const { resultados, total } = await listarTablaturasPublicadas(terminoBusqueda);

  const clasesGrid =
    columnas === "6"
      ? "grid gap-5 md:grid-cols-2 xl:grid-cols-6"
      : columnas === "4"
        ? "grid gap-5 md:grid-cols-2 xl:grid-cols-4"
        : "grid gap-5 md:grid-cols-2 xl:grid-cols-3";

  const gruposAgrupados = resultados.reduce<
    Array<{
      nombreGrupo: string;
      slugGrupo: string;
      items: typeof resultados;
    }>
  >((acc, tablatura) => {
    const nombreGrupo = tablatura.grupo?.nombre ?? "Grupo sin nombre";
    const slugGrupo = tablatura.grupo?.slug ?? "sin-grupo";
    const existente = acc.find((grupo) => grupo.slugGrupo === slugGrupo);

    if (existente) {
      existente.items.push(tablatura);
      return acc;
    }

    acc.push({
      nombreGrupo,
      slugGrupo,
      items: [tablatura],
    });

    return acc;
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff4c2,_transparent_28%),linear-gradient(180deg,#fcfaf5_0%,#ffffff_45%,#f5f7fb_100%)] px-6 py-8 text-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2.5rem] border border-black/10 bg-white/85 p-8 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="max-w-6xl">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">
              Catálogo de batería
            </span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:whitespace-nowrap lg:text-[3.5rem]">
              Encuentra la partitura que necesitas
            </h1>
          </div>

          <form className="mt-6 flex flex-col gap-3 rounded-[2rem] border border-black/10 bg-zinc-50 p-4 sm:flex-row">
            <input
              type="search"
              name="q"
              defaultValue={terminoBusqueda}
              placeholder="Busca por canción o grupo"
              className="h-14 flex-1 rounded-full border border-black/10 bg-white px-5 text-sm outline-none transition focus:border-zinc-950"
            />
            <button
              type="submit"
              className="h-14 rounded-full bg-zinc-950 px-7 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Buscar
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-4 rounded-[2rem] border border-black/10 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">
                Vista de resultados
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {total} tablaturas encontradas
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={crearHrefConVista(terminoBusqueda, columnas, "rejilla")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  vista === "rejilla"
                    ? "bg-zinc-950 text-white"
                    : "border border-black/10 bg-white text-zinc-700 hover:border-zinc-950"
                }`}
              >
                Rejilla
              </Link>
              <Link
                href={crearHrefConVista(terminoBusqueda, columnas, "agrupada")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  vista === "agrupada"
                    ? "bg-zinc-950 text-white"
                    : "border border-black/10 bg-white text-zinc-700 hover:border-zinc-950"
                }`}
              >
                Agrupar
              </Link>
              {[
                { valor: "3", etiqueta: "3 por fila" },
                { valor: "4", etiqueta: "4 por fila" },
                { valor: "6", etiqueta: "6 por fila" },
              ].map((opcion) => {
                const activa = columnas === opcion.valor;

                return (
                  <Link
                    key={opcion.valor}
                    href={crearHrefConVista(terminoBusqueda, opcion.valor, vista)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activa
                        ? "bg-zinc-950 text-white"
                        : "border border-black/10 bg-white text-zinc-700 hover:border-zinc-950"
                    }`}
                  >
                    {opcion.etiqueta}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {vista === "agrupada" ? (
          <section className="flex flex-col gap-8">
            {resultados.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/80 p-10 text-center">
                <p className="text-lg font-medium text-zinc-950">
                  No hay resultados para esa búsqueda.
                </p>
                <p className="mt-2 text-sm text-zinc-600">
                  Prueba con otro nombre de canción o con el grupo.
                </p>
              </div>
            ) : null}

            {gruposAgrupados.map((grupo) => (
              <section
                key={grupo.slugGrupo}
                className="rounded-[2rem] border border-black/10 bg-white/70 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.04)]"
              >
                <div className="mb-5 flex items-center justify-between gap-4 border-b border-black/10 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">
                      Grupo
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                      {grupo.nombreGrupo}
                    </h2>
                  </div>
                  <span className="rounded-full bg-amber-200 px-3 py-2 text-sm font-semibold text-zinc-950">
                    {grupo.items.length} partituras
                  </span>
                </div>

                <div className={clasesGrid}>
                  {grupo.items.map((tablatura) => (
                    <article
                      key={tablatura.id}
                      className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
                    >
                      <div className="aspect-[16/9] bg-zinc-100">
                        {tablatura.previewUrl ? (
                          <img
                            src={tablatura.previewUrl}
                            alt={`Preview de ${tablatura.tituloCancion}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#f4f4f5,#fafaf9)] text-sm text-zinc-500">
                            Preview no disponible
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-5 p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">
                              {tablatura.grupo?.nombre ?? "Grupo sin nombre"}
                            </p>
                            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
                              {tablatura.tituloCancion}
                            </h3>
                          </div>
                          <span className="rounded-full bg-amber-200 px-3 py-2 text-sm font-semibold text-zinc-950">
                            {formatearPrecio(
                              tablatura.precioVentaCentimos,
                              tablatura.moneda
                            )}
                          </span>
                        </div>

                        <p className="min-h-14 text-sm leading-7 text-zinc-600">
                          {tablatura.descripcion ?? "Sin descripción disponible."}
                        </p>

                        <div className="flex flex-wrap gap-3">
                          {tablatura.previewUrl ? (
                            <a
                              href={tablatura.previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-950"
                            >
                              Ver preview
                            </a>
                          ) : null}

                          <button
                            type="button"
                            aria-label="Añadir al carrito próximamente"
                            title="Añadir al carrito próximamente"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-700 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
                          >
                            <IconoCarrito />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </section>
        ) : (
        <section className={clasesGrid}>
          {resultados.length === 0 ? (
            <div className="col-span-full rounded-[2rem] border border-dashed border-black/10 bg-white/80 p-10 text-center">
              <p className="text-lg font-medium text-zinc-950">
                No hay resultados para esa búsqueda.
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                Prueba con otro nombre de canción o con el grupo.
              </p>
            </div>
          ) : null}

          {resultados.map((tablatura) => (
            <article
              key={tablatura.id}
              className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
            >
              <div className="aspect-[16/9] bg-zinc-100">
                {tablatura.previewUrl ? (
                  <img
                    src={tablatura.previewUrl}
                    alt={`Preview de ${tablatura.tituloCancion}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#f4f4f5,#fafaf9)] text-sm text-zinc-500">
                    Preview no disponible
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-5 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">
                      {tablatura.grupo?.nombre ?? "Grupo sin nombre"}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
                      {tablatura.tituloCancion}
                    </h2>
                  </div>
                  <span className="rounded-full bg-amber-200 px-3 py-2 text-sm font-semibold text-zinc-950">
                    {formatearPrecio(
                      tablatura.precioVentaCentimos,
                      tablatura.moneda
                    )}
                  </span>
                </div>

                <p className="min-h-14 text-sm leading-7 text-zinc-600">
                  {tablatura.descripcion ?? "Sin descripción disponible."}
                </p>

                <div className="flex flex-wrap gap-3">
                  {tablatura.previewUrl ? (
                    <a
                      href={tablatura.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-950"
                    >
                      Ver preview
                    </a>
                  ) : null}

                  <button
                    type="button"
                    aria-label="Añadir al carrito próximamente"
                    title="Añadir al carrito próximamente"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-700 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
                  >
                    <IconoCarrito />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
        )}
      </div>
    </main>
  );
}
