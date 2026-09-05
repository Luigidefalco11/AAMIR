import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/sanity/queries";
import type { Locale } from "@/sanity/localize";

const SECTIONS: Record<Locale, { heading: string; body: string }[]> = {
  it: [
    {
      heading: "Chi vende",
      body: "I prodotti sono venduti da",
    },
    {
      heading: "Metodi di pagamento",
      body: "Accettiamo pagamento con carta e i metodi supportati da Stripe (inclusi Apple Pay e Google Pay dove disponibili). Il pagamento avviene su una pagina sicura gestita da Stripe; non conserviamo i dati della tua carta.",
    },
    {
      heading: "Spedizione",
      body: "Spediamo attualmente solo in Italia, con corriere a tariffa fissa indicata al momento del pagamento. I tempi di consegna ti verranno comunicati via email dopo la spedizione.",
    },
    {
      heading: "Diritto di recesso",
      body: "Hai diritto di recedere dal contratto entro 14 giorni dalla ricezione del prodotto, senza dover fornire alcuna motivazione, ai sensi del Codice del Consumo (D.Lgs. 206/2005) e della direttiva 2011/83/UE. Per esercitare il diritto di recesso, contattaci scrivendo all'indirizzo email indicato nella pagina Contatti. Il prodotto dovrà essere restituito integro, nelle condizioni originali. Le spese di restituzione sono a carico del cliente salvo diversamente comunicato.",
    },
    {
      heading: "Rimborsi",
      body: "In caso di recesso valido, il rimborso verrà effettuato con lo stesso metodo di pagamento utilizzato per l'acquisto, entro 14 giorni dalla ricezione del reso.",
    },
  ],
  en: [
    {
      heading: "Who sells",
      body: "Products are sold by",
    },
    {
      heading: "Payment methods",
      body: "We accept card payment and the methods supported by Stripe (including Apple Pay and Google Pay where available). Payment happens on a secure page hosted by Stripe; we never store your card details.",
    },
    {
      heading: "Shipping",
      body: "We currently ship within Italy only, via courier at the flat rate shown at checkout. Delivery times will be communicated by email once your order ships.",
    },
    {
      heading: "Right of withdrawal",
      body: "You have the right to withdraw from this contract within 14 days of receiving the product, without giving any reason, under EU Directive 2011/83/EU. To exercise this right, contact us at the email address listed on the Contact page. The product must be returned intact, in its original condition. Return shipping costs are borne by the customer unless otherwise stated.",
    },
    {
      heading: "Refunds",
      body: "If withdrawal is valid, the refund will be issued using the same payment method as the original purchase, within 14 days of receiving the return.",
    },
  ],
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations({ locale, namespace: "terms" });
  const settings = await getSiteSettings();

  const businessName = settings?.legalBusinessName || t("toComplete");
  const vatNumber = settings?.vatNumber || t("toComplete");
  const address = settings?.businessAddress || t("toComplete");

  return (
    <section className="mx-auto max-w-3xl px-6 pt-16 pb-24">
      <h1 className="font-serif text-4xl mb-10">{t("title")}</h1>

      {SECTIONS[l].map((section, i) => (
        <div key={section.heading} className="mb-8">
          <h2 className="font-serif text-xl mb-2">{section.heading}</h2>
          <p className="text-[color:var(--color-text)]/80 leading-relaxed">
            {section.body}
            {i === 0 && ` ${businessName} — P.IVA ${vatNumber} — ${address}.`}
          </p>
        </div>
      ))}
    </section>
  );
}
