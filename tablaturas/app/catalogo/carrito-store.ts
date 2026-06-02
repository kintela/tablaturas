"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ItemCarrito = {
  id: string;
  titulo: string;
  grupoNombre: string;
  precioVentaCentimos: number;
  moneda: string;
  previewUrl: string | null;
};

const CLAVE_CARRITO = "drum-tablatures:carrito";
const EVENTO_CARRITO = "carrito-actualizado";

function leerCarritoDesdeStorage() {
  if (typeof window === "undefined") {
    return [];
  }

  const bruto = window.localStorage.getItem(CLAVE_CARRITO);

  if (!bruto) {
    return [];
  }

  try {
    const datos = JSON.parse(bruto) as ItemCarrito[];
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

function guardarCarrito(items: ItemCarrito[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENTO_CARRITO, { detail: items }));
}

export function leerCarrito() {
  return leerCarritoDesdeStorage();
}

export function estaEnCarrito(itemId: string) {
  return leerCarritoDesdeStorage().some((item) => item.id === itemId);
}

export function anadirAlCarrito(item: ItemCarrito) {
  const actual = leerCarritoDesdeStorage();

  if (actual.some((existente) => existente.id === item.id)) {
    return actual;
  }

  const siguiente = [...actual, item];
  guardarCarrito(siguiente);
  return siguiente;
}

export function quitarDelCarrito(itemId: string) {
  const siguiente = leerCarritoDesdeStorage().filter((item) => item.id !== itemId);
  guardarCarrito(siguiente);
  return siguiente;
}

export function vaciarCarrito() {
  guardarCarrito([]);
}

export async function sincronizarCarritoConCatalogo(supabase: SupabaseClient) {
  const actual = leerCarritoDesdeStorage();

  if (actual.length === 0) {
    return actual;
  }

  const itemIds = Array.from(
    new Set(actual.map((item) => item.id.trim()).filter((itemId) => itemId.length > 0))
  );

  if (itemIds.length === 0) {
    guardarCarrito([]);
    return [];
  }

  const { data, error } = await supabase
    .from("tablaturas")
    .select("id")
    .in("id", itemIds)
    .eq("publicada", true);

  if (error) {
    throw error;
  }

  const idsValidos = new Set((data ?? []).map((tablatura) => tablatura.id));
  const siguiente = actual.filter((item) => idsValidos.has(item.id));

  if (siguiente.length !== actual.length) {
    guardarCarrito(siguiente);
  }

  return siguiente;
}

export function escucharCarrito(callback: (items: ItemCarrito[]) => void) {
  function manejador(event: Event) {
    const customEvent = event as CustomEvent<ItemCarrito[]>;
    callback(customEvent.detail ?? leerCarritoDesdeStorage());
  }

  window.addEventListener(EVENTO_CARRITO, manejador);

  return () => {
    window.removeEventListener(EVENTO_CARRITO, manejador);
  };
}
