"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type BotonPreviewProps = {
  previewUrl: string;
  titulo: string;
};

export function BotonPreview({ previewUrl, titulo }: BotonPreviewProps) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAbierto(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:border-zinc-950"
      >
        Preview
      </button>

      {typeof document !== "undefined" && abierto
        ? createPortal(
            <div
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 px-4 py-6"
              onClick={() => setAbierto(false)}
            >
              <div
                className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.32)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">
                      Preview
                    </p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">
                      {titulo}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAbierto(false)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 text-zinc-700 transition hover:border-zinc-950"
                    aria-label="Cerrar preview"
                  >
                    ×
                  </button>
                </div>

                <div className="max-h-[80vh] overflow-auto bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-6">
                  <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white">
                    <img
                      src={previewUrl}
                      alt={`Preview de ${titulo}`}
                      className="h-auto w-full"
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
