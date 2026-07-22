import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <section className="mx-auto max-w-xl px-6 py-32 text-center">
      <h1 className="font-serif text-5xl mb-6">404</h1>
      <p className="text-lg text-[color:var(--color-text)]/70 mb-8">
        Pagina non trovata / Page not found
      </p>
      <Link
        href="/it"
        className="inline-block px-6 py-3 bg-[color:var(--color-primary)] text-white text-sm hover:bg-[color:var(--color-primary-hover)] transition-colors"
      >
        AAMIR
      </Link>
    </section>
  );
}
