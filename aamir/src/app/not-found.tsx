import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <html lang="it">
      <body style={{ fontFamily: "Georgia, serif", textAlign: "center", padding: "8rem 1.5rem", background: "#faf9f6", color: "#14212b" }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>404</h1>
        <p style={{ marginBottom: "2rem" }}>Pagina non trovata / Page not found</p>
        <Link href="/it" style={{ color: "#1b4b66" }}>AAMIR</Link>
      </body>
    </html>
  );
}
