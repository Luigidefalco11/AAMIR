import { defineType, defineField } from "sanity";

// PRIVACY: this dataset is deliberately PUBLIC (the storefront reads products
// and images with no token), so anything stored here is readable by anyone who
// knows the project id. Customer email and shipping address are therefore
// NEVER written to this document — they live only in the Stripe Dashboard and
// in the order notification email sent to Aamir's inbox. Do not add them back.
export const order = defineType({
  name: "order",
  title: "Ordine",
  type: "document",
  fields: [
    defineField({ name: "stripeSessionId", title: "ID sessione Stripe", type: "string", validation: (r) => r.required() }),
    defineField({ name: "stripePaymentIntentId", title: "ID pagamento Stripe", type: "string" }),
    defineField({
      name: "items",
      title: "Articoli acquistati",
      type: "array",
      of: [
        {
          type: "object",
          name: "orderItem",
          fields: [
            defineField({ name: "title", title: "Nome", type: "string" }),
            defineField({ name: "price", title: "Prezzo (EUR)", type: "number" }),
          ],
        },
      ],
    }),
    defineField({ name: "shippingTotal", title: "Spedizione (EUR)", type: "number" }),
    defineField({ name: "total", title: "Totale (EUR)", type: "number" }),
    defineField({
      name: "status",
      title: "Stato",
      type: "string",
      options: {
        list: [
          { title: "Pagato", value: "paid" },
          { title: "Spedito", value: "shipped" },
        ],
      },
      initialValue: "paid",
    }),
    defineField({ name: "createdAt", title: "Data", type: "datetime" }),
    defineField({
      name: "acceptedTermsAt",
      title: "Termini accettati il",
      type: "datetime",
      readOnly: true,
    }),
    // Set once the confirmation + notification emails have gone out. Its
    // absence is what lets a later webhook redelivery notice that a previous
    // delivery died between recording the order and sending the emails, and
    // retry the send.
    defineField({
      name: "emailsSentAt",
      title: "Email inviate il",
      type: "datetime",
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: "stripeSessionId", total: "total", status: "status" },
    prepare({ title, total, status }: { title?: string; total?: number; status?: string }) {
      return {
        title: title || "Ordine",
        subtitle: `€${total ?? 0} — ${status ?? "paid"}`,
      };
    },
  },
});
