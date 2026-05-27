"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Perfil = {
  rol: "admin" | "cliente";
  email: string | null;
  nombre: string | null;
  apellidos: string | null;
};

function traducirErrorAuth(mensaje: string) {
  const normalizado = mensaje.trim().toLowerCase();

  if (
    normalizado.includes("missing email or phone") ||
    normalizado.includes("email not confirmed")
  ) {
    return "Debes introducir un correo electrónico válido.";
  }

  if (normalizado.includes("missing password")) {
    return "Debes introducir la contraseña.";
  }

  if (
    normalizado.includes("invalid login credentials") ||
    normalizado.includes("invalid credentials")
  ) {
    return "El correo o la contraseña no son correctos.";
  }

  if (normalizado.includes("email rate limit exceeded")) {
    return "Has hecho demasiados intentos. Espera un momento y vuelve a probar.";
  }

  if (normalizado.includes("network")) {
    return "No se ha podido conectar con el servidor. Inténtalo de nuevo.";
  }

  return "No se ha podido iniciar sesión. Revisa los datos e inténtalo de nuevo.";
}

function IconoUsuario() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

export function AuthPanel() {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let activa = true;

    async function cargarSesion() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!activa) {
        return;
      }

      setSession(currentSession);

      if (currentSession?.user.id) {
        const { data } = await supabase
          .from("perfiles")
          .select("rol, email, nombre, apellidos")
          .eq("id", currentSession.user.id)
          .maybeSingle();

        if (activa) {
          setPerfil((data as Perfil | null) ?? null);
        }
      } else {
        setPerfil(null);
      }
    }

    cargarSesion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);

      if (nextSession?.user.id) {
        const { data } = await supabase
          .from("perfiles")
          .select("rol, email, nombre, apellidos")
          .eq("id", nextSession.user.id)
          .maybeSingle();

        setPerfil((data as Perfil | null) ?? null);
      } else {
        setPerfil(null);
      }
    });

    return () => {
      activa = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  function iniciarSesion() {
    startTransition(async () => {
      setError(null);

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(traducirErrorAuth(loginError.message));
        return;
      }

      setPassword("");
      setModalAbierto(false);
    });
  }

  function cerrarSesion() {
    startTransition(async () => {
      setError(null);
      await supabase.auth.signOut();
    });
  }

  const nombreCompleto = [perfil?.nombre?.trim(), perfil?.apellidos?.trim()]
    .filter(Boolean)
    .join(" ");
  const nombreVisible =
    nombreCompleto || perfil?.nombre?.trim() || perfil?.email || session?.user.email || "Iniciar sesión";
  const emailVisible = perfil?.email || session?.user.email || null;

  return (
    <>
      <div className="flex w-full max-w-[220px] flex-col items-end gap-3">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setModalAbierto(true);
          }}
          className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-950 shadow-sm transition hover:scale-[1.02] hover:border-zinc-950"
          aria-label={session ? "Cuenta de usuario" : "Iniciar sesión"}
          title={session ? "Cuenta de usuario" : "Iniciar sesión"}
        >
          <span className="scale-110">
            <IconoUsuario />
          </span>
        </button>

        <div className="max-w-[220px] text-right">
          {session ? (
            <>
              <p className="text-sm font-semibold leading-5 text-zinc-950">{nombreVisible}</p>
              {emailVisible ? (
                <p className="mt-1 text-xs leading-5 text-zinc-500">{emailVisible}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap justify-end gap-2 text-xs">
                {perfil?.rol === "admin" ? (
                  <Link
                    href="/admin"
                    className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-zinc-700 transition hover:border-zinc-950"
                  >
                    Admin
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={cerrarSesion}
                  className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-zinc-700 transition hover:border-zinc-950"
                >
                  {isPending ? "Cerrando..." : "Salir"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {typeof document !== "undefined" && modalAbierto
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4 py-6"
              onClick={() => setModalAbierto(false)}
            >
              <div
                className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.22)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">
                      Acceso
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                      Iniciar sesión
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-zinc-700 transition hover:border-zinc-950"
                    aria-label="Cerrar"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email"
                    className="h-12 rounded-full border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-zinc-950"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="h-12 rounded-full border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-zinc-950"
                  />
                  <button
                    type="button"
                    onClick={iniciarSesion}
                    className="mt-2 h-12 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-70"
                    disabled={isPending}
                  >
                    {isPending ? "Entrando..." : "Iniciar sesión"}
                  </button>
                  {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
