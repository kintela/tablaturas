"use client";

import { useEffect } from "react";

import { vaciarCarrito } from "@/app/catalogo/carrito-store";

export function LimpiarCarrito() {
  useEffect(() => {
    vaciarCarrito();
  }, []);

  return null;
}

