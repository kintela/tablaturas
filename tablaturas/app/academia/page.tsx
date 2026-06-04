import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthPanel } from "@/app/auth/auth-panel";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Clases de bateria en Leioa",
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/academia",
  },
  openGraph: {
    url: `${SITE_URL}/academia`,
    title: "Clases de bateria en Leioa | Renteria Drums",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: false,
    follow: true,
  },
};

function TarjetaValor({
  titulo,
  texto,
}: {
  titulo: string;
  texto: string;
}) {
  return (
    <article className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {titulo}
      </p>
      <p className="mt-3 text-base leading-7 text-zinc-700">{texto}</p>
    </article>
  );
}

function PuntoPrograma({
  titulo,
  texto,
}: {
  titulo: string;
  texto: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-black/10 bg-white p-5">
      <h3 className="text-lg font-semibold tracking-tight text-zinc-950">{titulo}</h3>
      <p className="mt-2 text-sm leading-7 text-zinc-600">{texto}</p>
    </div>
  );
}

async function crearUrlLogo() {
  const { data, error } = await supabaseAdmin.storage
    .from("landing")
    .createSignedUrl("logo_academia.jpeg", 60 * 60 * 24);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

export default async function LandingPage() {
  const logoUrl = await crearUrlLogo();
  const mapaEmbedUrl =
    "https://www.google.com/maps?q=Avenida%20Iparraguirre%2082%20(1B%2C%20Lonja)%2048940%20Leioa&z=17&output=embed";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#fcfbf8_32%,#eef5f8_100%)] px-4 py-4 text-zinc-950 sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2.5rem] border border-black/10 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.24),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(8,145,178,0.18),_transparent_28%),linear-gradient(135deg,#111827_0%,#1f2937_42%,#0f172a_100%)] text-white shadow-[0_30px_100px_rgba(15,23,42,0.22)]">
          <div className="flex flex-col gap-10 p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl lg:max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-amber-200/80">
                  Clases de bateria + partituras
                </p>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
                  Un espacio en Leioa para tocar mejor, estudiar mejor y sonar con criterio.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
                  Profesor de bateria, trabajo personalizado y material propio para que cada
                  alumno avance con una rutina clara. Clases presenciales en local y catálogo
                  digital de partituras para seguir estudiando entre sesiones.
                </p>
              </div>

              <div className="flex flex-col items-end gap-6 lg:min-w-[360px] lg:max-w-[360px]">
                <Suspense fallback={<div className="h-16 w-16 rounded-full border border-white/15 bg-white/10" />}>
                  <AuthPanel theme="dark" />
                </Suspense>
                {logoUrl ? (
                  <div className="hidden w-full lg:block">
                    <div className="rounded-[2.25rem] border border-white/12 bg-white/8 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)] backdrop-blur">
                      <div
                        aria-label="Logo de la academia"
                        className="h-[320px] w-full rounded-[1.75rem] bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${logoUrl})` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
              <div className="rounded-[2rem] border border-white/10 bg-white/8 p-6 backdrop-blur">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-300">
                      Que ofrezco
                    </p>
                    <p className="mt-3 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
                      Clases presenciales, enfoque real de estudio y recursos listos para usar.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-amber-300 px-5 py-4 text-zinc-950">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em]">
                      Local
                    </p>
                    <p className="mt-2 text-xl font-semibold">Leioa</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-full bg-amber-300 px-6 py-4 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200"
                  >
                    Ver partituras
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-300">
                    Presencial
                  </p>
                  <p className="mt-3 text-lg font-semibold">Clases adaptadas al nivel real</p>
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-300">
                    Material
                  </p>
                  <p className="mt-3 text-lg font-semibold">PDFs, previews y recursos listos para estudiar</p>
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-300">
                    Produccion
                  </p>
                  <p className="mt-3 text-lg font-semibold">Packs con MIDI General para DAW o EzDrummer</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="clases" className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2.25rem] border border-black/10 bg-white/85 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Clases en Leioa
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Trabajo tecnico, musicalidad y metodo para tocar con mas control.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-600">
              La idea no es acumular ejercicios. La idea es entender que estudiar, por que
              estudiarlo y como hacerlo sonar mejor en contexto real: grooves, lectura,
              dinamica, tempo, independencia y repertorio.
            </p>

            <div className="mt-8 grid gap-4">
              <PuntoPrograma
                titulo="Clases uno a uno"
                texto="Sesiones presenciales enfocadas al punto exacto en el que estas: iniciacion, lectura, tecnica, repertorio, preparacion de pruebas o puesta a punto para directo."
              />
              <PuntoPrograma
                titulo="Rutinas claras para estudiar en casa"
                texto="Cada bloque de trabajo sale con objetivos concretos. Menos dispersión, mas tiempo bien invertido y una progresion facil de medir semana a semana."
              />
              <PuntoPrograma
                titulo="Material complementario"
                texto="Partituras, archivos de apoyo y, cuando encaja, recursos MIDI para practicar con claqueta, secuencias o plugins de bateria."
              />
            </div>
          </div>

          <div className="grid gap-6">
            <TarjetaValor
              titulo="Para quien"
              texto="Alumnos que empiezan desde cero, bateristas que quieren ordenar su estudio y gente que necesita material concreto para preparar canciones y repertorio."
            />
            <TarjetaValor
              titulo="Partituras"
              texto="Catálogo digital con compra directa de PDFs y, en algunos temas, opcion PDF + MIDI para practicar, editar o producir con mas rapidez."
            />
            <TarjetaValor
              titulo="Enfoque"
              texto="Menos postureo, mas tocar. Un trabajo pensado para que el alumno salga del local con claridad y vuelva a sentarse en la bateria sabiendo exactamente que hacer."
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-[2.25rem] border border-black/10 bg-white/85 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-black/10 bg-zinc-100">
            <iframe
              title="Mapa de la academia en Leioa"
              src={mapaEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[520px] w-full"
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-[2.25rem] border border-black/10 bg-[linear-gradient(135deg,#f59e0b_0%,#fbbf24_100%)] p-8 text-zinc-950 shadow-[0_24px_70px_rgba(245,158,11,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-800/70">
              Servicio digital
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Si no puedes venir al local, el catálogo sigue siendo una puerta de entrada.
            </h2>
            <p className="mt-5 text-base leading-8 text-zinc-900/80">
              El escaparate no termina en las clases. Tambien hay un trabajo de preparación de
              material para que puedas comprar la partitura exacta, revisar el preview y elegir
              si solo quieres el PDF o el pack con MIDI.
            </p>
            <div className="mt-8">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Entrar al catálogo
              </Link>
            </div>
          </div>

          <div className="rounded-[2.25rem] border border-black/10 bg-white/85 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Primera version
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Un primer escaparate moderno para enseñar clases y venta de partituras sin mezclarlo todo.
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-black/10 bg-zinc-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Clases
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-600">
                  Explica la propuesta del profesor, el enfoque y el tipo de alumno para el que
                  encaja mejor.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-black/10 bg-zinc-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Catalogo
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-600">
                  Separa claramente la experiencia de compra para que no compita visualmente con
                  la presentación del servicio.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-black/10 bg-zinc-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Local
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-600">
                  Mantiene el anclaje territorial en Leioa, que da contexto y cercania a la
                  oferta de clases.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-black/10 bg-zinc-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Evolucion
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-600">
                  A partir de aqui ya podemos afinar copies, fotos, testimonios, contacto y
                  jerarquia comercial.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="rounded-[2rem] border border-black/10 bg-white/70 px-6 py-5 text-sm text-zinc-600 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium text-zinc-950">Renteria Drums</p>
            <a
              href="mailto:info@renteriadrums.com"
              className="transition hover:text-zinc-950"
            >
              info@renteriadrums.com
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
