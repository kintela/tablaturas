"use client";

import type { DragEvent } from "react";
import { useEffect, useId, useMemo, useState, useTransition } from "react";

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
  descripcion: string | null;
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

function convertirPrecioTextoACentimos(valor: string) {
  const normalizado = valor.replace(/\s/g, "").replace(",", ".");
  const numero = Number(normalizado);

  if (!Number.isFinite(numero) || numero < 0) {
    return null;
  }

  return Math.round(numero * 100);
}

function formatearPrecio(precioVentaCentimos: number, moneda: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: moneda,
  }).format(precioVentaCentimos / 100);
}

function IconoEditar() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconoPapelera() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

type DropzoneArchivoProps = {
  titulo: string;
  descripcion?: string;
  accept: string;
  archivo: File | null;
  onSeleccionar: (archivo: File | null) => void;
};

function DropzoneArchivo({
  titulo,
  descripcion,
  accept,
  archivo,
  onSeleccionar,
}: DropzoneArchivoProps) {
  const [arrastrando, setArrastrando] = useState(false);
  const inputId = useId();

  function manejarDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setArrastrando(false);

    const fichero = event.dataTransfer.files?.[0] ?? null;
    onSeleccionar(fichero);
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        setArrastrando(true);
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        setArrastrando(false);
      }}
      onDrop={manejarDrop}
      className={`flex cursor-pointer flex-col gap-2 rounded-[1.5rem] border border-dashed bg-white px-4 py-4 text-sm text-zinc-700 transition ${
        arrastrando
          ? "border-zinc-950 bg-zinc-50"
          : "border-black/15 hover:border-zinc-500"
      }`}
    >
      <span className="font-medium text-zinc-950">{titulo}</span>
      <span className="text-xs text-zinc-500">
        {archivo
          ? `Archivo seleccionado: ${archivo.name}`
          : "Arrastra aquí el archivo o pulsa para seleccionarlo"}
      </span>
      {descripcion ? <span className="text-xs text-zinc-500">{descripcion}</span> : null}
      <input
        id={inputId}
        type="file"
        accept={accept}
        onChange={(event) => onSeleccionar(event.target.files?.[0] ?? null)}
        className="hidden"
      />
    </label>
  );
}

export function PanelAdmin() {
  const [resultado, setResultado] = useState<ResultadoOperacion | null>(null);
  const [confirmacionBorrado, setConfirmacionBorrado] = useState("");
  const [catalogo, setCatalogo] = useState<EstadoCatalogo>(estadoInicialCatalogo);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);

  const [nombreGrupo, setNombreGrupo] = useState("");
  const [tablaturaEditandoId, setTablaturaEditandoId] = useState<string | null>(null);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("");
  const [tituloCancion, setTituloCancion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioVenta, setPrecioVenta] = useState("4,99");
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
  const [archivoPreview, setArchivoPreview] = useState<File | null>(null);
  const [publicada, setPublicada] = useState(true);

  const [isPending, startTransition] = useTransition();

  const gruposPorId = useMemo(
    () => new Map(catalogo.grupos.map((grupo) => [grupo.id, grupo])),
    [catalogo.grupos]
  );

  const tablaturasOrdenadas = useMemo(() => {
    return [...catalogo.tablaturas].sort((a, b) => {
      const grupoA = gruposPorId.get(a.grupo_id)?.nombre ?? "";
      const grupoB = gruposPorId.get(b.grupo_id)?.nombre ?? "";
      const comparacionGrupo = grupoA.localeCompare(grupoB, "es", {
        sensitivity: "base",
      });

      if (comparacionGrupo !== 0) {
        return comparacionGrupo;
      }

      return a.titulo_cancion.localeCompare(b.titulo_cancion, "es", {
        sensitivity: "base",
      });
    });
  }, [catalogo.tablaturas, gruposPorId]);

  async function cargarCatalogo() {
    setCargandoCatalogo(true);

    const response = await fetch("/api/admin/catalogo");
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
  }, []);

  function resetFormularioTablatura() {
    setTablaturaEditandoId(null);
    setTituloCancion("");
    setDescripcion("");
    setPrecioVenta("4,99");
    setArchivoPdf(null);
    setArchivoPreview(null);
    setPublicada(true);
  }

  function borrarDatos() {
    startTransition(async () => {
      setResultado(null);

      const response = await fetch("/api/admin/crear-mocks", {
        method: "DELETE",
      });

      const data = (await response.json()) as ResultadoOperacion;
      setResultado(data);
      setConfirmacionBorrado("");

      if (response.ok && data.ok) {
        resetFormularioTablatura();
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

  function guardarTablatura() {
    startTransition(async () => {
      setResultado(null);

      const formData = new FormData();
      const precioVentaCentimos = convertirPrecioTextoACentimos(precioVenta);

      if (precioVentaCentimos === null) {
        setResultado({
          ok: false,
          error: "El precio debe tener un formato válido. Ejemplo: 4,99",
        });
        return;
      }

      formData.set(
        "accion",
        tablaturaEditandoId ? "actualizar-tablatura" : "crear-tablatura"
      );
      formData.set("grupoId", grupoSeleccionado);
      formData.set("tituloCancion", tituloCancion);
      formData.set("descripcion", descripcion);
      formData.set("precioVentaCentimos", String(precioVentaCentimos));
      formData.set("moneda", "EUR");
      formData.set("publicada", String(publicada));

      if (tablaturaEditandoId) {
        formData.set("tablaturaId", tablaturaEditandoId);
      }

      if (archivoPdf) {
        formData.set("archivo", archivoPdf);
      }

      if (archivoPreview) {
        formData.set("preview", archivoPreview);
      }

      const response = await fetch("/api/admin/catalogo", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ResultadoOperacion;
      setResultado(data);

      if (response.ok && data.ok) {
        resetFormularioTablatura();
        await cargarCatalogo();
      }
    });
  }

  function editarTablatura(tablatura: Tablatura) {
    setTablaturaEditandoId(tablatura.id);
    setGrupoSeleccionado(tablatura.grupo_id);
    setTituloCancion(tablatura.titulo_cancion);
    setDescripcion(tablatura.descripcion ?? "");
    setPrecioVenta(
      (tablatura.precio_venta_centimos / 100).toFixed(2).replace(".", ",")
    );
    setPublicada(tablatura.publicada);
    setArchivoPdf(null);
    setArchivoPreview(null);
    setResultado(null);
  }

  function eliminarTablatura(tablaturaId: string) {
    startTransition(async () => {
      setResultado(null);

      const formData = new FormData();
      formData.set("accion", "eliminar-tablatura");
      formData.set("tablaturaId", tablaturaId);

      const response = await fetch("/api/admin/catalogo", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ResultadoOperacion;
      setResultado(data);

      if (response.ok && data.ok) {
        if (tablaturaEditandoId === tablaturaId) {
          resetFormularioTablatura();
        }
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
          Desde aquí puedes revisar las partituras existentes, editar sus datos,
          eliminarlas o dar de alta nuevas entradas y grupos.
        </p>
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-black/10 bg-zinc-50 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-zinc-950">
              Partituras existentes
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              {catalogo.tablaturas.length} partituras en {catalogo.grupos.length} grupos.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setResultado(null);
                void cargarCatalogo();
              }}
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-950"
            >
              Recargar catálogo
            </button>
          </div>
        </div>

        {cargandoCatalogo ? (
          <p className="mt-6 text-sm text-zinc-600">Cargando catálogo...</p>
        ) : tablaturasOrdenadas.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-600">
            No hay partituras creadas todavía.
          </p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Grupo</th>
                  <th className="px-4 py-3 font-semibold">Canción</th>
                  <th className="px-4 py-3 font-semibold">Precio</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tablaturasOrdenadas.map((tablatura) => (
                  <tr
                    key={tablatura.id}
                    className="border-t border-black/10 align-top"
                  >
                    <td className="px-4 py-4 text-zinc-700">
                      {gruposPorId.get(tablatura.grupo_id)?.nombre ?? "Grupo desconocido"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-zinc-950">
                        {tablatura.titulo_cancion}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">{tablatura.slug}</div>
                    </td>
                    <td className="px-4 py-4 text-zinc-700">
                      {formatearPrecio(
                        tablatura.precio_venta_centimos,
                        tablatura.moneda
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          tablatura.publicada
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {tablatura.publicada ? "Publicada" : "Oculta"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editarTablatura(tablatura)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                          title="Editar tablatura"
                          aria-label="Editar tablatura"
                        >
                          <IconoEditar />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarTablatura(tablatura.id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-700 transition hover:border-rose-500 hover:text-rose-800"
                          title="Eliminar tablatura"
                          aria-label="Eliminar tablatura"
                        >
                          <IconoPapelera />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-950">
                {tablaturaEditandoId ? "Editar tablatura" : "Añadir tablatura"}
              </h3>
              <p className="mt-2 text-sm leading-7 text-zinc-600">
                {tablaturaEditandoId
                  ? "Modifica los datos y, si quieres, sustituye también el PDF o la imagen preview."
                  : "Selecciona el grupo, indica los datos de la canción y sube el PDF junto con una imagen preview."}
              </p>
            </div>
            {tablaturaEditandoId ? (
              <button
                type="button"
                onClick={resetFormularioTablatura}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-950"
              >
                Cancelar
              </button>
            ) : null}
          </div>

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
              type="text"
              inputMode="decimal"
              value={precioVenta}
              onChange={(event) => setPrecioVenta(event.target.value)}
              className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-950"
              placeholder="Precio de venta. Ejemplo: 4,99"
            />

            <label className="flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={publicada}
                onChange={(event) => setPublicada(event.target.checked)}
              />
              Publicar esta tablatura
            </label>

            <DropzoneArchivo
              titulo={
                tablaturaEditandoId
                  ? "Archivo de la partitura (PDF) para sustituir el actual"
                  : "Archivo de la partitura (PDF)"
              }
              descripcion={
                tablaturaEditandoId
                  ? "Déjalo vacío si quieres conservar el PDF actual."
                  : undefined
              }
              accept="application/pdf,.pdf"
              archivo={archivoPdf}
              onSeleccionar={setArchivoPdf}
            />

            <DropzoneArchivo
              titulo={
                tablaturaEditandoId
                  ? "Archivo de preview (imagen) para sustituir la actual"
                  : "Archivo de preview (imagen)"
              }
              descripcion={
                tablaturaEditandoId
                  ? "Déjalo vacío si quieres conservar la preview actual."
                  : undefined
              }
              accept="image/*"
              archivo={archivoPreview}
              onSeleccionar={setArchivoPreview}
            />

            <button
              type="button"
              onClick={guardarTablatura}
              disabled={
                isPending ||
                !grupoSeleccionado ||
                !tituloCancion.trim() ||
                (!tablaturaEditandoId && !archivoPdf)
              }
              className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? tablaturaEditandoId
                  ? "Guardando cambios..."
                  : "Subiendo..."
                : tablaturaEditandoId
                  ? "Guardar cambios"
                  : "Crear tablatura y subir PDF"}
            </button>
          </div>
        </div>
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
