import Link from "next/link";

import { LimpiarCarrito } from "@/app/checkout/exito/limpiar-carrito";

export default function CheckoutExitoPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff4c2,_transparent_28%),linear-gradient(180deg,#fcfaf5_0%,#ffffff_45%,#f5f7fb_100%)] px-6 py-10 text-zinc-950">
      <LimpiarCarrito />

      <div className="mx-auto max-w-3xl rounded-[2.5rem] border border-black/10 bg-white/90 p-8 shadow-[0_30px_100px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Pago recibido
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
          Tu pedido se está confirmando
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600">
          El pago ha vuelto correctamente desde Stripe. Estamos validando la
          confirmación final para habilitar tus descargas y reflejar el pedido en tu
          cuenta.
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

