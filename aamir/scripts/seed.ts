import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import { SEEDS, DESC, slugify } from "../src/lib/demoProducts";

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
    instagram: "aamir.jewelry",
    metaDescription: { it: "Gioielleria artigianale a Salerno.", en: "Artisan jewelry in Salerno." },
  });

  const categoryCover: Partial<Record<string, string>> = {};

  for (let i = 0; i < SEEDS.length; i++) {
    const s = SEEDS[i];
    const img = String(s.n).padStart(2, "0");
    const filePath = join(process.cwd(), "public", "products", `img-${img}.jpeg`);
    const asset = await client.assets.upload("image", createReadStream(filePath), {
      filename: `img-${img}.jpeg`,
    });

    const it = DESC[s.cat].it[i % DESC[s.cat].it.length].replace("{m}", s.mIt);
    const en = DESC[s.cat].en[i % DESC[s.cat].en.length].replace("{m}", s.mEn);
    const slug = `${slugify(s.en)}-${s.n}`;

    await client.createOrReplace({
      _id: `product-${slug}`,
      _type: "product",
      title: { it: s.it, en: s.en },
      slug: { current: slug },
      category: { _type: "reference", _ref: `category-${s.cat}` },
      images: [
        { _type: "image", asset: { _type: "reference", _ref: asset._id }, alt: s.it },
      ],
      materials: { it: s.mIt, en: s.mEn },
      description: { it, en },
      featured: Boolean(s.feat),
      available: true,
      order: i,
    });

    categoryCover[s.cat] ??= asset._id;
    console.log(`Seeded product ${i + 1}/${SEEDS.length}: ${s.it}`);
  }

  for (const c of CATEGORIES) {
    const assetId = categoryCover[c.slug];
    if (!assetId) continue;
    await client
      .patch(`category-${c.slug}`)
      .set({ cover: { _type: "image", asset: { _type: "reference", _ref: assetId }, alt: c.it } })
      .commit();
  }

  console.log("Seed complete.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
