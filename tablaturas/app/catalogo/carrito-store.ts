"use client";

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
