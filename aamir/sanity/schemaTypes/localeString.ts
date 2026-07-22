import { defineType } from "sanity";

export const localeString = defineType({
  name: "localeString",
  title: "Testo localizzato",
  type: "object",
  fields: [
    { name: "it", title: "Italiano", type: "string" },
    { name: "en", title: "English", type: "string" },
  ],
});
