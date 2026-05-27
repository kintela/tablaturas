"use client";

import { useEffect, useState } from "react";

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

export function BotonCarrito() {
  const supabase = getSupabaseBrowserClient();
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargarSesion() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (activo) {
        setAutenticado(Boolean(session));
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

  const tooltip = autenticado
    ? "Añadir al carrito"
    : "Para poder hacer una compra antes has de iniciar sesion con tu cuenta. Si no la has creado aún este es un buen momento";

  return (
    <span className="inline-flex" title={tooltip}>
      <button
        type="button"
        disabled={!autenticado}
        aria-label={tooltip}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
          autenticado
            ? "border-black/10 bg-white text-zinc-700 hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
            : "cursor-not-allowed border-black/10 bg-zinc-100 text-zinc-400 opacity-70"
        }`}
      >
        <IconoCarrito />
      </button>
    </span>
  );
}
