export function crearClaveCarrito(itemId: string, tipoCompra: "pdf" | "pack") {
  return `${itemId}:${tipoCompra}`;
}
