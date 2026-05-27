"use client";

import { useState, useTransition } from "react";

type ResultadoSeed = {
  ok: boolean;
  gruposCreados?: number;
  tablaturasCreadas?: number;
  error?: string;
};

export function PanelAdmin() {
  const [resultado, setResultado] = useState<ResultadoSeed | null>(null);
  const [tokenAdmin, setTokenAdmin] = useState("");
  const [isPending, startTransition] = useTransition();

  function crearMocks() {
    startTransition(async () => {
      setResultado(null);

      const response = await fetch("/api/admin/crear-mocks", {
        method: "POST",
        headers: tokenAdmin ? { "x-admin-token": tokenAdmin } : undefined,
      });

      const data = (await response.json()) as ResultadoSeed;
      setResultado(data);
    });
  }

  return (
    <section className="w-full rounded-[2rem] border border-black/10 bg-white p-8 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Administración
        </span>
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">
          Datos mock del catálogo
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-zinc-600">
          Crea 30 grupos y 30 tablaturas por grupo en Supabase. La operación usa
          upsert por slug para que puedas repetirla sin duplicar registros.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[1.5rem] bg-zinc-50 p-6">
          <h3 className="text-lg font-semibold text-zinc-950">Qué se generará</h3>
          <ul className="mt-4 space-y-3 text-sm text-zinc-700">
            <li>30 grupos con nombre y slug.</li>
            <li>900 tablaturas publicadas con precio, descripción y ruta de archivo.</li>
            <li>Rutas mock con formato `mocks/grupo/cancion.pdf`.</li>
          </ul>
        </div>

        <div className="rounded-[1.5rem] bg-zinc-950 p-6 text-white">
          <label className="block text-sm font-medium text-white/80" htmlFor="admin-token">
            Token admin
          </label>
          <p className="mt-2 text-xs leading-6 text-white/60">
            En local no hace falta. En producción, solo si defines
            `ADMIN_PANEL_TOKEN`.
          </p>
          <input
            id="admin-token"
            type="password"
            value={tokenAdmin}
            onChange={(event) => setTokenAdmin(event.target.value)}
            className="mt-4 w-full rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-white/40"
            placeholder="Opcional"
          />
          <button
            type="button"
            onClick={crearMocks}
            disabled={isPending}
            className="mt-5 w-full rounded-full bg-[#ffd84d] px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-[#ffcf1a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Creando datos..." : "Crear datos mock"}
          </button>
        </div>
      </div>

      {resultado ? (
        <div
          className={`mt-6 rounded-[1.5rem] p-5 text-sm ${
            resultado.ok
              ? "bg-emerald-50 text-emerald-900"
              : "bg-rose-50 text-rose-900"
          }`}
        >
          {resultado.ok ? (
            <p>
              Proceso completado. Grupos: {resultado.gruposCreados}. Tablaturas:{" "}
              {resultado.tablaturasCreadas}.
            </p>
          ) : (
            <p>{resultado.error ?? "No se pudo completar la operación."}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

