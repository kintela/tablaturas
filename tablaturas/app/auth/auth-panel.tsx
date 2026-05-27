"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
    normalizado.includes("missing email")
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

  if (normalizado.includes("user already registered")) {
    return "Ya existe una cuenta con ese correo electrónico.";
  }

  if (normalizado.includes("password should be at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  if (normalizado.includes("unable to validate email address")) {
    return "El correo electrónico no es válido.";
  }

  if (normalizado.includes("signup is disabled")) {
    return "Ahora mismo no se pueden crear cuentas nuevas.";
  }

  if (normalizado.includes("email not confirmed")) {
    return "Debes confirmar tu correo electrónico antes de iniciar sesión.";
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

function IconoMostrar() {
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
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconoOcultar() {
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
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a3 3 0 0 0 4 4" />
      <path d="M9.9 5.2A11.7 11.7 0 0 1 12 5c6.5 0 10 7 10 7a18.6 18.6 0 0 1-3.2 4.2" />
      <path d="M6.2 6.3C3.8 8 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.4-1" />
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
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modo, setModo] = useState<"login" | "signup">("login");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargandoAcceso, setCargandoAcceso] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

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

  async function iniciarSesion() {
    setCargandoAcceso(true);
    setError(null);
    setMensaje(null);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(traducirErrorAuth(loginError.message));
      setCargandoAcceso(false);
      return;
    }

    setPassword("");
    setModalAbierto(false);
    setCargandoAcceso(false);
  }

  async function crearCuenta() {
    setCargandoAcceso(true);
    setError(null);
    setMensaje(null);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signupError) {
      setError(traducirErrorAuth(signupError.message));
      setCargandoAcceso(false);
      return;
    }

    setPassword("");

    if (data.session) {
      setModalAbierto(false);
      setCargandoAcceso(false);
      return;
    }

    setMensaje(
      "Si el correo no estaba registrado, te hemos enviado un email para confirmar el acceso. Si ya tienes cuenta, inicia sesión."
    );
    setCargandoAcceso(false);
  }

  async function cerrarSesion() {
    setCerrandoSesion(true);
    setError(null);
    setMensaje(null);
    setSession(null);
    setPerfil(null);

    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError("No se ha podido cerrar la sesión. Inténtalo de nuevo.");
      }
    } finally {
      setCerrandoSesion(false);
    }
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
            setMensaje(null);
            setModo("login");
            setMostrarPassword(false);
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
                  {cerrandoSesion ? "Cerrando..." : "Salir"}
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
                      {modo === "login" ? "Iniciar sesión" : "Crear cuenta"}
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
                  <div className="inline-flex rounded-full border border-black/10 bg-zinc-50 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setModo("login");
                        setEmail("");
                        setPassword("");
                        setError(null);
                        setMensaje(null);
                        setMostrarPassword(false);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        modo === "login"
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-600 hover:text-zinc-950"
                      }`}
                    >
                      Iniciar sesión
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModo("signup");
                        setEmail("");
                        setPassword("");
                        setError(null);
                        setMensaje(null);
                        setMostrarPassword(false);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        modo === "signup"
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-600 hover:text-zinc-950"
                      }`}
                    >
                      Crear cuenta
                    </button>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email"
                    className="h-12 rounded-full border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-zinc-950"
                  />
                  <div className="relative">
                    <input
                      type={mostrarPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                      className="h-12 w-full rounded-full border border-black/10 bg-white px-4 pr-12 text-sm outline-none transition focus:border-zinc-950"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword((valor) => !valor)}
                      className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                      aria-label={
                        mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                      title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {mostrarPassword ? <IconoOcultar /> : <IconoMostrar />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={modo === "login" ? iniciarSesion : crearCuenta}
                    className="mt-2 h-12 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-70"
                    disabled={cargandoAcceso}
                  >
                    {cargandoAcceso
                      ? modo === "login"
                        ? "Entrando..."
                        : "Creando cuenta..."
                      : modo === "login"
                        ? "Iniciar sesión"
                        : "Crear cuenta"}
                  </button>
                  {mensaje ? <p className="text-sm text-emerald-700">{mensaje}</p> : null}
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
