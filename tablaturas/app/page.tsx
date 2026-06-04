import type { Metadata } from "next";

import CatalogoPage from "@/app/catalogo/page";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Catalogo de partituras",
  description:
    "Catálogo de partituras para batería con previews, PDF y packs PDF + MIDI General para estudio, DAW o EzDrummer.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: SITE_URL,
    title: "Catalogo de partituras | Renteria Drums",
    description:
      "Catálogo de partituras para batería con previews, PDF y packs PDF + MIDI General para estudio, DAW o EzDrummer.",
  },
};

type HomePageProps = {
  searchParams?: Promise<{
    q?: string;
    columnas?: string;
    vista?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  return <CatalogoPage searchParams={searchParams} />;
}
