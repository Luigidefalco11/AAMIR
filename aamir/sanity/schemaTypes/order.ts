import { defineType, defineField } from "sanity";

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
    defineField({ name: "total", title: "Totale (EUR)", type: "number" }),
    defineField({ name: "customerEmail", title: "Email cliente", type: "string" }),
    defineField({
      name: "shippingAddress",
      title: "Indirizzo di spedizione",
      type: "object",
      fields: [
        defineField({ name: "name", title: "Nome", type: "string" }),
        defineField({ name: "line1", title: "Indirizzo", type: "string" }),
        defineField({ name: "line2", title: "Indirizzo (2)", type: "string" }),
        defineField({ name: "city", title: "Città", type: "string" }),
        defineField({ name: "postalCode", title: "CAP", type: "string" }),
        defineField({ name: "country", title: "Paese", type: "string" }),
      ],
    }),
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
  ],
  preview: {
    select: { title: "customerEmail", total: "total", status: "status" },
    prepare({ title, total, status }: { title?: string; total?: number; status?: string }) {
      return {
        title: title || "Ordine",
        subtitle: `€${total ?? 0} — ${status ?? "paid"}`,
      };
    },
  },
});
