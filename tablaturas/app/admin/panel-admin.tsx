"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type ResultadoOperacion = {
  ok: boolean;
  gruposCreados?: number;
  tablaturasCreadas?: number;
  mensaje?: string;
  error?: string;
};

type Grupo = {
  id: string;
  nombre: string;
  slug: string;
  fecha_creacion?: string;
};

type Tablatura = {
  id: string;
  grupo_id: string;
  titulo_cancion: string;
  slug: string;
  precio_venta_centimos: number;
  moneda: string;
  publicada: boolean;
  fecha_creacion?: string;
};

type EstadoCatalogo = {
  grupos: Grupo[];
  tablaturas: Tablatura[];
};

const estadoInicialCatalogo: EstadoCatalogo = {
  grupos: [],
  tablaturas: [],
};

export function PanelAdmin() {
  const [resultado, setResultado] = useState<ResultadoOperacion | null>(null);
  const [tokenAdmin, setTokenAdmin] = useState("");
  const [confirmacionBorrado, setConfirmacionBorrado] = useState("");
  const [catalogo, setCatalogo] = useState<EstadoCatalogo>(estadoInicialCatalogo);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);

  const [nombreGrupo, setNombreGrupo] = useState("");
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("");
  const [tituloCancion, setTituloCancion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioVentaCentimos, setPrecioVentaCentimos] = useState("499");
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
  const [publicada, setPublicada] = useState(true);

  const [isPending, startTransition] = useTransition();

  const gruposConTablaturas = useMemo(() => {
    return catalogo.grupos.map((grupo) => ({
      ...grupo,
      tablaturas: catalogo.tablaturas.filter(
        (tablatura) => tablatura.grupo_id === grupo.id
      ),
    }));
  }, [catalogo]);

  async function cargarCatalogo() {
    setCargandoCatalogo(true);

    const response = await fetch("/api/admin/catalogo", {
      headers: tokenAdmin ? { "x-admin-token": tokenAdmin } : undefined,
    });

    const data = (await response.json()) as
      | { ok: true; grupos: Grupo[]; tablaturas: Tablatura[] }
      | { ok: false; error?: string };

    if (!response.ok || !data.ok) {
      setResultado({
        ok: false,
        error: data.ok ? "No se pudo cargar el catálogo." : data.error,
      });
      setCargandoCatalogo(false);
      return;
    }

    setCatalogo({
      grupos: data.grupos,
      tablaturas: data.tablaturas,
    });

    setGrupoSeleccionado((actual) => {
      if (actual && data.grupos.some((grupo) => grupo.id === actual)) {
        return actual;
      }

      return data.grupos[0]?.id ?? "";
    });

    setCargandoCatalogo(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargarCatalogo();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function crearMocks() {
    startTransition(async () => {
      setResultado(null);

      const response = await fetch("/api/admin/crear-mocks", {
        method: "POST",
        headers: tokenAdmin ? { "x-admin-token": tokenAdmin } : undefined,
      });

      const data = (await response.json()) as ResultadoOperacion;
      setResultado(data);

      if (response.ok && data.ok) {
        await cargarCatalogo();
      }
    });
  }

  function borrarDatos() {
    startTransition(async () => {
      setResultado(null);

      const response = await fetch("/api/admin/crear-mocks", {
        method: "DELETE",
        headers: tokenAdmin ? { "x-admin-token": tokenAdmin } : undefined,
      });

      const data = (await response.json()) as ResultadoOperacion;
      setResultado(data);
      setConfirmacionBorrado("");

      if (response.ok && data.ok) {
        await cargarCatalogo();
      }
    });
  }

  function crearGrupo() {
    startTransition(async () => {
      setResultado(null);

      const formData = new FormData();
      formData.set("accion", "crear-grupo");
      formData.set("nombre", nombreGrupo);

      const response = await fetch("/api/admin/catalogo", {
        method: "POST",
        headers: tokenAdmin ? { "x-admin-token": tokenAdmin } : undefined,
        body: formData,
      });

      const data = (await response.json()) as ResultadoOperacion;
      setResultado(data);

      if (response.ok && data.ok) {
        setNombreGrupo("");
        await cargarCatalogo();
      }
    });
  }

  function crearTablatura() {
    startTransition(async () => {
      setResultado(null);

      const formData = new FormData();
      formData.set("accion", "crear-tablatura");
      formData.set("grupoId", grupoSeleccionado);
      formData.set("tituloCancion", tituloCancion);
      formData.set("descripcion", descripcion);
      formData.set("precioVentaCentimos", precioVentaCentimos);
      formData.set("moneda", "EUR");
      formData.set("publicada", String(publicada));

      if (archivoPdf) {
        formData.set("archivo", archivoPdf);
      }

      const response = await fetch("/api/admin/catalogo", {
        method: "POST",
        headers: tokenAdmin ? { "x-admin-token": tokenAdmin } : undefined,
        body: formData,
      });

      const data = (await response.json()) as ResultadoOperacion;
      setResultado(data);

      if (response.ok && data.ok) {
        setTituloCancion("");
        setDescripcion("");
        setPrecioVentaCentimos("499");
        setArchivoPdf(null);
        await cargarCatalogo();
      }
    });
  }

  return (
    <section className="w-full rounded-[2rem] border border-black/10 bg-white p-8 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Administración
        </span>
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">
          Gestión del catálogo
        </h2>
        <p className="max-w-3xl text-sm leading-7 text-zinc-600">
          Desde aquí puedes crear grupos, subir nuevas partituras PDF y revisar
          qué contenido existe ya en Supabase.
        </p>
      </div>

      <div className="mt-8 rounded-[1.5rem] bg-zinc-950 p-6 text-white">
        <label className="block text-sm font-medium text-white/80" htmlFor="admin-token">
          Token admin
        </label>
        <p className="mt-2 text-xs leading-6 text-white/60">
          En local no hace falta. En producción, solo si defines
          `ADMIN_PANEL_TOKEN`.
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            id="admin-token"
            type="password"
            value={tokenAdmin}
            onChange={(event) => setTokenAdmin(event.target.value)}
            className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-white/40"
            placeholder="Opcional"
          />
          <button
            type="button"
            onClick={() => {
              setResultado(null);
              cargarCatalogo();
            }}
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40"
          >
            Recargar catálogo
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-black/10 bg-zinc-50 p-6">
          <h3 className="text-xl font-semibold text-zinc-950">Crear grupo</h3>
          <p className="mt-2 text-sm leading-7 text-zinc-600">
            Añade un nuevo grupo al catálogo. El slug se genera automáticamente.
          </p>

          <div className="mt-5 flex flex-col gap-4">
            <input
              type="text"
              value={nombreGrupo}
              onChange={(event) => setNombreGrupo(event.target.value)}
              className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-950"
              placeholder="Nombre del grupo"
            />
            <button
              type="button"
              onClick={crearGrupo}
              disabled={isPending || !nombreGrupo.trim()}
              className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Crear grupo"}
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-zinc-50 p-6">
          <h3 className="text-xl font-semibold text-zinc-950">Añadir tablatura</h3>
          <p className="mt-2 text-sm leading-7 text-zinc-600">
            Selecciona el grupo, indica los datos de la canción y sube el PDF.
          </p>

          <div className="mt-5 grid gap-4">
            <select
              value={grupoSeleccionado}
              onChange={(event) => setGrupoSeleccionado(event.target.value)}
              className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-950"
            >
              <option value="">Selecciona un grupo</option>
              {catalogo.grupos.map((grupo) => (
                <option key={grupo.id} value={grupo.id}>
                  {grupo.nombre}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={tituloCancion}
              onChange={(event) => setTituloCancion(event.target.value)}
              className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-950"
              placeholder="Título de la canción"
            />

            <textarea
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              className="min-h-28 w-full rounded-[1.5rem] border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-950"
              placeholder="Descripción opcional"
            />

            <input
              type="number"
              min="0"
              step="1"
              value={precioVentaCentimos}
              onChange={(event) => setPrecioVentaCentimos(event.target.value)}
              className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-950"
              placeholder="Precio en céntimos"
            />

            <label className="flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={publicada}
                onChange={(event) => setPublicada(event.target.checked)}
              />
              Publicar esta tablatura al crearla
            </label>

            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) =>
                setArchivoPdf(event.target.files?.[0] ?? null)
              }
              className="w-full rounded-[1.5rem] border border-dashed border-black/15 bg-white px-4 py-4 text-sm"
            />

            <button
              type="button"
              onClick={crearTablatura}
              disabled={
                isPending ||
                !grupoSeleccionado ||
                !tituloCancion.trim() ||
                !archivoPdf
              }
              className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Subiendo..." : "Crear tablatura y subir PDF"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[1.5rem] bg-zinc-50 p-6">
          <h3 className="text-lg font-semibold text-zinc-950">Datos mock del catálogo</h3>
          <ul className="mt-4 space-y-3 text-sm text-zinc-700">
            <li>10 grupos con nombre y slug.</li>
            <li>30 tablaturas publicadas con precio y descripción.</li>
            <li>60 archivos mock en storage: un PDF y una imagen previa por tablatura.</li>
            <li>
              Rutas con formato <code>{"{grupo_id}/{tablatura_id}/partitura.pdf"}</code> y{" "}
              <code>preview.svg</code>.
            </li>
          </ul>
        </div>

        <div className="rounded-[1.5rem] bg-zinc-950 p-6 text-white">
          <p className="text-sm leading-7 text-white/75">
            Usa los mocks para poblar rápido el catálogo y probar búsquedas,
            previews y carrito.
          </p>
          <button
            type="button"
            onClick={crearMocks}
            disabled={isPending}
            className="mt-5 w-full rounded-full bg-[#ffd84d] px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-[#ffcf1a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Creando datos..." : "Crear datos mock"}
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-black/10 bg-white p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-zinc-950">Catálogo actual</h3>
            <p className="mt-1 text-sm text-zinc-600">
              {catalogo.grupos.length} grupos y {catalogo.tablaturas.length} tablaturas.
            </p>
          </div>
        </div>

        {cargandoCatalogo ? (
          <p className="mt-6 text-sm text-zinc-600">Cargando catálogo...</p>
        ) : gruposConTablaturas.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-600">
            No hay grupos creados todavía.
          </p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-black/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Grupo</th>
                  <th className="px-4 py-3 font-semibold">Slug</th>
                  <th className="px-4 py-3 font-semibold">Partituras</th>
                </tr>
              </thead>
              <tbody>
                {gruposConTablaturas.map((grupo) => (
                  <tr key={grupo.id} className="border-t border-black/10 align-top">
                    <td className="px-4 py-4 font-semibold text-zinc-950">{grupo.nombre}</td>
                    <td className="px-4 py-4 text-zinc-600">{grupo.slug}</td>
                    <td className="px-4 py-4">
                      {grupo.tablaturas.length === 0 ? (
                        <span className="text-zinc-500">Sin partituras</span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {grupo.tablaturas.map((tablatura) => (
                            <div
                              key={tablatura.id}
                              className="rounded-[1rem] border border-black/10 bg-zinc-50 px-3 py-2"
                            >
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <span className="font-medium text-zinc-950">
                                  {tablatura.titulo_cancion}
                                </span>
                                <span className="text-xs text-zinc-500">
                                  {tablatura.slug} · {tablatura.precio_venta_centimos} cts ·{" "}
                                  {tablatura.publicada ? "Publicada" : "Oculta"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-lg font-semibold text-rose-950">Zona peligrosa</h3>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-rose-900/80">
          Esta acción elimina todos los registros de `compras`, `tablaturas`,
          `grupos`, `archivos_tablatura` y también los archivos físicos del
          bucket `tablaturas`.
        </p>

        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label
              className="block text-sm font-medium text-rose-950"
              htmlFor="confirmacion-borrado"
            >
              Escribe BORRAR para confirmar
            </label>
            <input
              id="confirmacion-borrado"
              type="text"
              value={confirmacionBorrado}
              onChange={(event) => setConfirmacionBorrado(event.target.value)}
              className="mt-2 w-full rounded-full border border-rose-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-500"
              placeholder="BORRAR"
            />
          </div>
          <button
            type="button"
            onClick={borrarDatos}
            disabled={isPending || confirmacionBorrado !== "BORRAR"}
            className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Eliminando datos..." : "Eliminar todos los datos"}
          </button>
        </div>
      </div>

      {resultado ? (
        <div
          className={`mt-6 rounded-[1.5rem] p-5 text-sm ${
            resultado.ok
              ? "bg-emerald-50 text-emerald-900"
              : "bg-rose-50 text-rose-900"
          }`}
        >
          {resultado.ok ? (
            <p>
              {resultado.mensaje ??
                `Proceso completado. Grupos: ${resultado.gruposCreados}. Tablaturas: ${resultado.tablaturasCreadas}.`}
            </p>
          ) : (
            <p>{resultado.error ?? "No se pudo completar la operación."}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
