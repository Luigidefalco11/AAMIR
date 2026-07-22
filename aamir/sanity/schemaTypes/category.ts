import { defineType, defineField } from "sanity";

export const category = defineType({
  name: "category",
  title: "Categoria",
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
      name: "cover",
      title: "Immagine di copertina",
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
    }),
    defineField({ name: "order", title: "Ordine", type: "number", initialValue: 0 }),
  ],
  preview: { select: { title: "title.it", media: "cover" } },
});
