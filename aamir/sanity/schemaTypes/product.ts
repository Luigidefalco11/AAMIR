import { defineType, defineField } from "sanity";

export const product = defineType({
  name: "product",
  title: "Gioiello",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Nome", type: "localeString" }),
    defineField({
      name: "slug",
      title: "Slug (URL)",
      type: "slug",
      options: { source: "title.it", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "category",
      title: "Categoria",
      type: "reference",
      to: [{ type: "category" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "images",
      title: "Immagini",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            {
              name: "alt",
              title: "Testo alternativo",
              type: "string",
              validation: (r) => r.required(),
            },
          ],
        },
      ],
    }),
    defineField({ name: "materials", title: "Materiali / pietre", type: "localeString" }),
    defineField({ name: "description", title: "Descrizione", type: "localeText" }),
    defineField({
      name: "price",
      title: "Prezzo (EUR)",
      description: 'Lascia vuoto per mostrare "Prezzo su richiesta" invece del carrello.',
      type: "number",
      validation: (r) => r.min(0),
    }),
    defineField({ name: "featured", title: "In evidenza", type: "boolean", initialValue: false }),
    defineField({ name: "available", title: "Disponibile", type: "boolean", initialValue: true }),
    defineField({ name: "order", title: "Ordine", type: "number", initialValue: 0 }),
  ],
  preview: {
    select: { title: "title.it", media: "images.0" },
  },
});
