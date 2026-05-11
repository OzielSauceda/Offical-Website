import type { Metadata } from "next";

import { PixelEarthStage } from "@/components/pixel-earth-stage/pixel-earth-stage";

export const metadata: Metadata = {
  title: "Oziel Sauceda",
  description:
    "Personal portfolio. Step into the stage — drag to spin the world.",
};

export default function HomePage() {
  return (
    <main className="flex flex-col">
      <h1 className="sr-only">Oziel Sauceda — personal portfolio</h1>
      <PixelEarthStage />
      <section className="relative px-6 py-24 sm:py-32 max-w-3xl mx-auto text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--color-stage-muted)]">
          scroll
        </p>
        <p className="mt-6 text-2xl sm:text-3xl font-medium leading-snug">
          The rest of the site lives below the stage.
        </p>
        <p className="mt-4 text-[color:var(--color-stage-muted)]">
          More sections coming soon.
        </p>
      </section>
    </main>
  );
}
