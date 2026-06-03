import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pago cancelado",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutCanceladoPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido_id?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff4c2,_transparent_28%),linear-gradient(180deg,#fcfaf5_0%,#ffffff_45%,#f5f7fb_100%)] px-6 py-10 text-zinc-950">
      <div className="mx-auto max-w-3xl rounded-[2.5rem] border border-black/10 bg-white/90 p-8 shadow-[0_30px_100px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Pago cancelado
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
          No se ha completado el pedido
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600">
          Has cancelado el proceso de pago o la sesión ha terminado antes de
          completarse. Tu carrito sigue intacto para que puedas volver a intentarlo.
        </p>
        {params.pedido_id ? (
          <p className="mt-3 text-xs text-zinc-500">
            Referencia interna del pedido: {params.pedido_id}
          </p>
        ) : null}

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

