import { defineType } from "sanity";

export const localeText = defineType({
  name: "localeText",
  title: "Testo lungo localizzato",
  type: "object",
  fields: [
    { name: "it", title: "Italiano", type: "text", rows: 4 },
    { name: "en", title: "English", type: "text", rows: 4 },
  ],
});
