"use client";

import { useEffect, useMemo, useState } from "react";

import {
  anadirAlCarrito,
  estaEnCarrito,
  leerCarrito,
  quitarDelCarrito,
  sincronizarCarritoConCatalogo,
  type ItemCarrito,
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

type BotonCarritoProps = {
  item: ItemCarrito;
};

export function BotonCarrito({ item }: BotonCarritoProps) {
  const supabase = getSupabaseBrowserClient();
  const [autenticado, setAutenticado] = useState(false);
  const [itemsCarrito, setItemsCarrito] = useState<ItemCarrito[]>(() => leerCarrito());
  const [sincronizando, setSincronizando] = useState(false);
  const itemActual = useMemo(
    () => itemsCarrito.find((itemCarrito) => itemCarrito.id === item.id) ?? null,
    [item.id, itemsCarrito]
  );
  const enCarrito = itemActual?.clave === item.clave;
  const bloqueadoPorPack =
    item.tipoCompra === "pdf" &&
    itemActual?.tipoCompra === "pack" &&
    itemActual.clave !== item.clave;

  useEffect(() => {
    let activo = true;

    async function cargarSesion() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (activo) {
        setAutenticado(Boolean(session));
        setItemsCarrito(leerCarrito());
      }
    }

    cargarSesion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAutenticado(Boolean(nextSession));
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    function sincronizar() {
      setItemsCarrito(leerCarrito());
    }

    window.addEventListener("carrito-actualizado", sincronizar);

    return () => {
      window.removeEventListener("carrito-actualizado", sincronizar);
    };
  }, []);

  const tooltip = !autenticado
    ? "Para poder hacer una compra antes has de iniciar sesion con tu cuenta. Si no la has creado aún este es un buen momento"
    : bloqueadoPorPack
      ? "El pack ya incluye el PDF, asi que esta opcion queda deshabilitada"
      : enCarrito
        ? "Quitar del carrito"
        : "Añadir al carrito";

  async function manejarClick() {
    if (!autenticado || sincronizando || bloqueadoPorPack) {
      return;
    }

    setSincronizando(true);

    try {
      let itemSigueEnCarrito = estaEnCarrito(item.clave);

      try {
        const itemsSincronizados = await sincronizarCarritoConCatalogo(supabase);
        itemSigueEnCarrito = itemsSincronizados.some(
          (itemEnCarrito) => itemEnCarrito.clave === item.clave
        );
      } catch (error) {
        console.error("No se pudo sincronizar el carrito con el catálogo.", error);
      }

      if (itemSigueEnCarrito) {
        quitarDelCarrito(item.clave);
        return;
      }

      anadirAlCarrito(item);
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <span className="inline-flex" title={tooltip}>
      <button
        type="button"
        disabled={!autenticado || bloqueadoPorPack}
        aria-label={tooltip}
        onClick={() => {
          void manejarClick();
        }}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
          autenticado && !bloqueadoPorPack
            ? enCarrito
              ? "border-zinc-950 bg-zinc-950 text-white"
              : "border-black/10 bg-white text-zinc-700 hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
            : "cursor-not-allowed border-black/10 bg-zinc-100 text-zinc-400 opacity-70"
        }`}
      >
        <IconoCarrito />
      </button>
    </span>
  );
}
