import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[100svh] grid place-items-center px-6 text-center">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
          404
        </p>
        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold">
          Off the map.
        </h1>
        <p className="mt-4 text-[color:var(--color-muted)]">
          That page does not exist.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block underline decoration-[color:var(--color-core-cyan)] underline-offset-4"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
