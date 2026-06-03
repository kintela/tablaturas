"use client";

import { useEffect, useRef, useState } from "react";

type BotonAudioProps = {
  audioUrl: string;
};

export function BotonAudio({ audioUrl }: BotonAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    function alTerminar() {
      setReproduciendo(false);
    }

    audio.addEventListener("ended", alTerminar);
    audio.addEventListener("pause", alTerminar);

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener("ended", alTerminar);
      audio.removeEventListener("pause", alTerminar);
      audioRef.current = null;
    };
  }, [audioUrl]);

  async function alternarAudio() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (reproduciendo) {
      audio.pause();
      audio.currentTime = 0;
      setReproduciendo(false);
      return;
    }

    try {
      await audio.play();
      setReproduciendo(true);
    } catch {
      setReproduciendo(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void alternarAudio()}
      title="Asi suena el MIDI asociado"
      aria-label="Asi suena el MIDI asociado"
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
        reproduciendo
          ? "border-cyan-700 bg-cyan-950 text-cyan-100"
          : "border-black/10 bg-white text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
      }`}
    >
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
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15.5 9.5a4 4 0 0 1 0 5" />
        <path d="M18.5 7a8 8 0 0 1 0 10" />
      </svg>
    </button>
  );
}
