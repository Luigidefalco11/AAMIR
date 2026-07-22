import { createClient } from "@sanity/client";
import { config } from "dotenv";
config({ path: ".env.local" });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2024-10-01",
  token: process.env.SANITY_WRITE_TOKEN!, // create in sanity.io/manage → API → Tokens (Editor)
  useCdn: false,
});

const CATEGORIES = [
  { slug: "collane", it: "Collane", en: "Necklaces" },
  { slug: "bracciali", it: "Bracciali", en: "Bracelets" },
  { slug: "orecchini", it: "Orecchini", en: "Earrings" },
  { slug: "anelli", it: "Anelli", en: "Rings" },
];

async function run() {
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    await client.createOrReplace({
      _id: `category-${c.slug}`,
      _type: "category",
      title: { it: c.it, en: c.en },
      slug: { current: c.slug },
      order: i,
    });
  }

  await client.createOrReplace({
    _id: "siteSettings",
    _type: "siteSettings",
    heroTitle: { it: "Gioielli lavorati a mano a Salerno", en: "Handcrafted jewelry in Salerno" },
    heroSubtitle: { it: "Pietre preziose, forma e precisione.", en: "Precious stones, form and precision." },
    aboutText: {
      it: "Aamir lavora l'oreficeria da oltre dieci anni, qui in Italia. Seleziona e lavora pietre preziose con la precisione di chi conosce il mestiere fino in fondo, trasformandole a mano in collane, anelli, bracciali e orecchini. Nessuna produzione in serie: solo la ricerca costante di equilibrio, forma e qualità, a pochi passi dal mare di Salerno.",
      en: "Aamir has worked in goldsmithing for over ten years, here in Italy.",
    },
    email: "info@aamirjewelry.it",
    instagram: "aamirjewelry",
    metaDescription: { it: "Gioielleria artigianale a Salerno.", en: "Artisan jewelry in Salerno." },
  });

  // sample products (no images — SafeImage placeholder will render)
  const samples = [
    { slug: "collana-onda", cat: "collane", it: "Collana Onda", en: "Onda Necklace", featured: true },
    { slug: "anello-scoglio", cat: "anelli", it: "Anello Scoglio", en: "Scoglio Ring", featured: true },
    { slug: "orecchini-riva", cat: "orecchini", it: "Orecchini Riva", en: "Riva Earrings", featured: true },
  ];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    await client.createOrReplace({
      _id: `product-${s.slug}`,
      _type: "product",
      title: { it: s.it, en: s.en },
      slug: { current: s.slug },
      category: { _type: "reference", _ref: `category-${s.cat}` },
      materials: { it: "Oro 18k, pietra naturale", en: "18k gold, natural stone" },
      description: { it: "Pezzo unico lavorato a mano.", en: "Unique handcrafted piece." },
      featured: s.featured,
      available: true,
      order: i,
    });
  }

  console.log("Seed complete.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
