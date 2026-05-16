import type { Metadata } from "next";

import { StarCoreHero } from "@/components/star-core-hero/star-core-hero";

export const metadata: Metadata = {
  title: "Oziel Sauceda",
  description:
    "Computer science portfolio. Projects, writing, and things I build.",
};

export default function HomePage() {
  return (
    <main className="flex flex-col">
      <h1 className="sr-only">Oziel Sauceda, computer science portfolio</h1>
      <StarCoreHero />
      <section className="relative px-6 py-24 sm:py-32 max-w-3xl mx-auto text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
          scroll
        </p>
        <p className="mt-6 text-2xl sm:text-3xl font-medium leading-snug">
          Projects, notes, and the slow build of a body of work.
        </p>
        <p className="mt-4 text-[color:var(--color-muted)]">
          More sections coming soon.
        </p>
      </section>
    </main>
  );
}
