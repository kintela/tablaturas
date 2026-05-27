"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  escucharCarrito,
  leerCarrito,
  quitarDelCarrito,
  type ItemCarrito,
  vaciarCarrito,
} from "@/app/catalogo/carrito-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

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

function formatearPrecio(precioVentaCentimos: number, moneda: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: moneda,
  }).format(precioVentaCentimos / 100);
}

export function PanelCarrito() {
  const supabase = getSupabaseBrowserClient();
  const [abierto, setAbierto] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [items, setItems] = useState<ItemCarrito[]>([]);

  useEffect(() => {
    let activo = true;

    async function cargarEstado() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!activo) {
        return;
      }

      setAutenticado(Boolean(session));
      setItems(leerCarrito());
    }

    cargarEstado();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAutenticado(Boolean(nextSession));
      setItems(leerCarrito());
    });

    const cancelar = escucharCarrito((siguiente) => {
      setItems(siguiente);
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
      cancelar();
    };
  }, [supabase]);

  const total = useMemo(
    () => items.reduce((acumulado, item) => acumulado + item.precioVentaCentimos, 0),
    [items]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="relative inline-flex h-16 w-16 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-950 shadow-sm transition hover:scale-[1.02] hover:border-zinc-950"
        aria-label="Abrir carrito"
        title="Abrir carrito"
      >
        <IconoCarrito />
        <span className="absolute -right-1 -top-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-amber-300 px-1.5 text-xs font-bold text-zinc-950">
          {items.length}
        </span>
      </button>

      {typeof document !== "undefined" && abierto
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] flex justify-end bg-black/40"
              onClick={() => setAbierto(false)}
            >
              <aside
                className="flex h-full w-full max-w-md flex-col border-l border-black/10 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.22)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">
                      Carrito
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                      Tus partituras
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAbierto(false)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 text-zinc-700 transition hover:border-zinc-950"
                    aria-label="Cerrar carrito"
                  >
                    ×
                  </button>
                </div>

                <div className="flex-1 overflow-auto px-6 py-5">
                  {!autenticado ? (
                    <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-zinc-50 p-5">
                      <p className="text-base font-semibold text-zinc-950">
                        Inicia sesión para comprar
                      </p>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">
                        Para poder hacer una compra antes has de iniciar sesion con tu
                        cuenta. Si no la has creado aún este es un buen momento.
                      </p>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-zinc-50 p-5">
                      <p className="text-base font-semibold text-zinc-950">
                        Tu carrito está vacío
                      </p>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">
                        Añade alguna tablatura desde el catálogo para verla aquí.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {items.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-[1.5rem] border border-black/10 bg-zinc-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                                {item.grupoNombre}
                              </p>
                              <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-950">
                                {item.titulo}
                              </h3>
                            </div>
                            <span className="rounded-full bg-amber-200 px-3 py-2 text-sm font-semibold text-zinc-950">
                              {formatearPrecio(item.precioVentaCentimos, item.moneda)}
                            </span>
                          </div>
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => quitarDelCarrito(item.id)}
                              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-950"
                            >
                              Quitar
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-black/10 px-6 py-5">
                  <div className="flex items-center justify-between text-sm text-zinc-600">
                    <span>Artículos</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-semibold text-zinc-950">Total</span>
                    <span className="text-2xl font-semibold tracking-tight text-zinc-950">
                      {formatearPrecio(total, "EUR")}
                    </span>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={() => vaciarCarrito()}
                      className="flex-1 rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-950"
                    >
                      Vaciar
                    </button>
                    <button
                      type="button"
                      disabled={!autenticado || items.length === 0}
                      className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
                        autenticado && items.length > 0
                          ? "bg-zinc-950 text-white hover:bg-zinc-800"
                          : "cursor-not-allowed bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      Comprar
                    </button>
                  </div>
                </div>
              </aside>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
