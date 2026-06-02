import Link from "next/link";

import { LimpiarCarrito } from "@/app/checkout/exito/limpiar-carrito";
import { getUsuarioYPerfilActual } from "@/lib/supabase/auth";

export default async function CheckoutExitoPage() {
  const { user, perfil } = await getUsuarioYPerfilActual();
  const nombreCompleto = [perfil?.nombre, perfil?.apellidos]
    .filter((valor) => Boolean(valor?.trim()))
    .join(" ")
    .trim();
  const identificadorUsuario =
    nombreCompleto || perfil?.email || user?.email || "usuario";
  const emailUsuario = perfil?.email || user?.email || null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff4c2,_transparent_28%),linear-gradient(180deg,#fcfaf5_0%,#ffffff_45%,#f5f7fb_100%)] px-6 py-10 text-zinc-950">
      <LimpiarCarrito />

      <div className="mx-auto max-w-3xl rounded-[2.5rem] border border-black/10 bg-white/90 p-8 shadow-[0_30px_100px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Gracias {identificadorUsuario}
          {emailUsuario && emailUsuario !== identificadorUsuario ? ` - ${emailUsuario}` : ""}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
          Pago recibido correctamente
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600">
          Recibirás un mail con el resumen de tu compra y un enlace para la
          descarga. Revisa la carpeta de correo no deseado si no llega a tu
          bandeja de entrada.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600">
          Gracias una vez más por la confianza.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    </main>
  );
}
