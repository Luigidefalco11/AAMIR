import { defineType, defineField } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Impostazioni sito",
  type: "document",
  fields: [
    defineField({ name: "heroTitle", title: "Titolo hero", type: "localeString" }),
    defineField({ name: "heroSubtitle", title: "Sottotitolo hero", type: "localeText" }),
    defineField({ name: "aboutText", title: "Testo Chi Siamo", type: "localeText" }),
    defineField({ name: "email", title: "Email di contatto", type: "string" }),
    defineField({ name: "instagram", title: "Handle Instagram (senza @)", type: "string" }),
    defineField({ name: "metaDescription", title: "Meta description (SEO)", type: "localeText" }),
  ],
});
