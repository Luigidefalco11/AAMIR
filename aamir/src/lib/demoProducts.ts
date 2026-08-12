import type { Product } from "@/sanity/types";

// Real catalog built from Aamir's own photos (public/products). Shown until a
// live Sanity project is configured; once the CMS is live (isConfigured), the
// products managed there replace these automatically.

type Cat = "collane" | "bracciali" | "orecchini" | "anelli";

type Seed = {
  n: number; // photo number -> /products/img-NN.jpeg
  cat: Cat;
  it: string;
  en: string;
  mIt: string; // materials (Italian)
  mEn: string; // materials (English)
  feat?: boolean;
};

// Categorisation from a visual review of each photo (parures assigned to their
// dominant piece).
const SEEDS: Seed[] = [
  { n: 1, cat: "collane", it: "Collana Perla e Fiore", en: "Pearl & Flower Necklace", mIt: "Perle di fiume e calcedonio azzurro", mEn: "Freshwater pearls and blue chalcedony" },
  { n: 2, cat: "collane", it: "Collana Conchiglia", en: "Shell Necklace", mIt: "Pasta turchese, conchiglia e corallo", mEn: "Turquoise paste, shell and coral" },
  { n: 3, cat: "collane", it: "Collana Corallo Cammeo", en: "Coral Cameo Necklace", mIt: "Corallo e cammeo di conchiglia", mEn: "Coral and shell cameo", feat: true },
  { n: 4, cat: "collane", it: "Collana Cammeo Antico", en: "Antique Cameo Necklace", mIt: "Quarzi misti e cammeo", mEn: "Mixed quartz and shell cameo" },
  { n: 5, cat: "collane", it: "Collana Agata Incisa", en: "Carved Agate Necklace", mIt: "Agata verde e medaglione inciso", mEn: "Green agate and carved medallion" },
  { n: 6, cat: "collane", it: "Collana Ambra", en: "Amber Necklace", mIt: "Ambra", mEn: "Amber" },
  { n: 7, cat: "collane", it: "Collana Blu Notte", en: "Midnight Blue Necklace", mIt: "Pasta blu e pietra incisa", mEn: "Blue paste and carved stone" },
  { n: 8, cat: "collane", it: "Collana Corallo e Perla", en: "Coral & Pearl Necklace", mIt: "Onice, corallo e perle", mEn: "Onyx, coral and pearls", feat: true },
  { n: 9, cat: "collane", it: "Collana Verde Marea", en: "Sea-Green Necklace", mIt: "Agata verde e argento", mEn: "Green agate and silver" },
  { n: 10, cat: "bracciali", it: "Bracciali Mare", en: "Sea Bracelets", mIt: "Pietre e smalto a tema marino", mEn: "Stones and marine-themed enamel" },
  { n: 11, cat: "bracciali", it: "Bracciali Pietre Dure", en: "Hardstone Bracelets", mIt: "Pietre dure naturali", mEn: "Natural hardstones" },
  { n: 12, cat: "collane", it: "Collana Giada", en: "Jade Necklace", mIt: "Giada verde", mEn: "Green jade" },
  { n: 13, cat: "collane", it: "Collana Turchese", en: "Turquoise Necklace", mIt: "Turchese", mEn: "Turquoise", feat: true },
  { n: 14, cat: "bracciali", it: "Bracciale Costa", en: "Costa Bracelet", mIt: "Corallo, turchese e perle", mEn: "Coral, turquoise and pearls" },
  { n: 15, cat: "collane", it: "Collana Perla Barocca", en: "Baroque Pearl Necklace", mIt: "Perle barocche e cammeo", mEn: "Baroque pearls and cameo", feat: true },
  { n: 16, cat: "orecchini", it: "Orecchini Collezione", en: "Earrings Collection", mIt: "Perle e pietre colorate", mEn: "Pearls and coloured stones" },
  { n: 17, cat: "anelli", it: "Anelli Cocktail", en: "Cocktail Rings", mIt: "Oro e pietre colorate", mEn: "Gold and coloured stones", feat: true },
  { n: 18, cat: "collane", it: "Collana Smeraldo Mare", en: "Sea-Emerald Necklace", mIt: "Calcedonio verde faccettato", mEn: "Faceted green chalcedony" },
  { n: 19, cat: "collane", it: "Collana Turchese Riva", en: "Riva Turquoise Necklace", mIt: "Turchese e corallo", mEn: "Turquoise and coral", feat: true },
  { n: 20, cat: "collane", it: "Collana Pietre d'Argento", en: "Silver Stones Necklace", mIt: "Pietre colorate e argento", mEn: "Coloured stones and silver" },
  { n: 21, cat: "collane", it: "Collana Rosa Corallo", en: "Coral Pink Necklace", mIt: "Corallo rosa e perle", mEn: "Pink coral and pearls", feat: true },
  { n: 22, cat: "collane", it: "Collana Verde e Rubino", en: "Green & Ruby Necklace", mIt: "Agata verde e quarzo rubino", mEn: "Green agate and ruby quartz" },
  { n: 23, cat: "orecchini", it: "Orecchini d'Autore", en: "Signature Earrings", mIt: "Perle, cristalli e pietre", mEn: "Pearls, crystals and stones" },
  { n: 24, cat: "bracciali", it: "Bracciali Catena", en: "Chain Bracelets", mIt: "Oro e pietre", mEn: "Gold and stones" },
  { n: 25, cat: "bracciali", it: "Bracciali Rigidi", en: "Bangle Bracelets", mIt: "Metallo dorato e argentato", mEn: "Gold- and silver-tone metal" },
  { n: 26, cat: "collane", it: "Collana Oro e Pietre", en: "Gold & Stone Necklace", mIt: "Oro e pietre naturali", mEn: "Gold and natural stones" },
  { n: 27, cat: "collane", it: "Collana Maglia Oro", en: "Gold Link Necklace", mIt: "Oro", mEn: "Gold" },
  { n: 28, cat: "collane", it: "Collana Catena Oro", en: "Gold Chain Necklace", mIt: "Oro", mEn: "Gold" },
  { n: 29, cat: "bracciali", it: "Bracciale Fiori", en: "Floral Bracelet", mIt: "Smalto e cristalli", mEn: "Enamel and crystals" },
  { n: 30, cat: "collane", it: "Collana Notte Dorata", en: "Golden Night Necklace", mIt: "Oro e onice", mEn: "Gold and onyx" },
  { n: 31, cat: "collane", it: "Collana Collare Oro", en: "Gold Collar Necklace", mIt: "Oro", mEn: "Gold" },
  { n: 32, cat: "collane", it: "Collana Oro Rigida", en: "Rigid Gold Necklace", mIt: "Oro", mEn: "Gold" },
  { n: 33, cat: "collane", it: "Collana Quadrifoglio", en: "Clover Necklace", mIt: "Oro e madreperla", mEn: "Gold and mother-of-pearl" },
  { n: 34, cat: "collane", it: "Collana Cerchi", en: "Circles Necklace", mIt: "Oro e argento", mEn: "Gold and silver" },
  { n: 35, cat: "collane", it: "Collana Dischi Oro", en: "Gold Discs Necklace", mIt: "Oro", mEn: "Gold" },
  { n: 36, cat: "collane", it: "Collana Sera", en: "Evening Necklace", mIt: "Cristalli e pietre", mEn: "Crystals and stones" },
  { n: 37, cat: "collane", it: "Collana Barocca", en: "Baroque Necklace", mIt: "Cristalli, smalto e perle", mEn: "Crystals, enamel and pearls", feat: true },
  { n: 38, cat: "collane", it: "Collana Occhio di Gatto", en: "Cat's Eye Necklace", mIt: "Pietre occhio di gatto", mEn: "Cat's eye stones" },
  { n: 39, cat: "collane", it: "Collana Charm Oro", en: "Gold Charm Necklace", mIt: "Perle e smalto", mEn: "Pearls and enamel" },
  { n: 40, cat: "collane", it: "Collana Ametista Lunga", en: "Long Amethyst Necklace", mIt: "Ametista", mEn: "Amethyst" },
  { n: 41, cat: "bracciali", it: "Bracciali Nodo", en: "Knot Bracelets", mIt: "Ottone dorato e argentato", mEn: "Gold- and silver-tone brass" },
  { n: 42, cat: "collane", it: "Collana Catena Lunga", en: "Long Chain Necklace", mIt: "Oro", mEn: "Gold" },
  { n: 43, cat: "anelli", it: "Anelli Corallo", en: "Coral Rings", mIt: "Argento e corallo", mEn: "Silver and coral" },
  { n: 44, cat: "collane", it: "Collana Onice", en: "Onyx Necklace", mIt: "Onice nera", mEn: "Black onyx" },
  { n: 45, cat: "collane", it: "Collana Charm", en: "Charm Necklace", mIt: "Oro e resina", mEn: "Gold and resin" },
  { n: 46, cat: "collane", it: "Collana Ambra Cognac", en: "Cognac Amber Necklace", mIt: "Ambra cognac", mEn: "Cognac amber" },
  { n: 47, cat: "collane", it: "Collana Quarzo Rosa", en: "Rose Quartz Necklace", mIt: "Quarzo rosa", mEn: "Rose quartz" },
  { n: 48, cat: "collane", it: "Collana Giada Verde", en: "Green Jade Necklace", mIt: "Giada verde", mEn: "Green jade", feat: true },
  { n: 49, cat: "collane", it: "Collana Ametista", en: "Amethyst Necklace", mIt: "Ametista", mEn: "Amethyst" },
  { n: 50, cat: "collane", it: "Collana Oro Riccio", en: "Golden Ripple Necklace", mIt: "Oro", mEn: "Gold" },
  { n: 51, cat: "orecchini", it: "Orecchini Onice", en: "Onyx Earrings", mIt: "Onice e oro", mEn: "Onyx and gold" },
  { n: 52, cat: "collane", it: "Collana Tormalina", en: "Tourmaline Necklace", mIt: "Tormalina e perle barocche", mEn: "Tourmaline and baroque pearls", feat: true },
];

// Description templates per category ({m} = materials). Cycled by index so the
// catalog reads with variety rather than one repeated line.
const DESC: Record<Cat, { it: string[]; en: string[] }> = {
  collane: {
    it: [
      "Collana realizzata interamente a mano da Aamir. {m}, selezionati e montati uno a uno. Pezzo unico.",
      "{m}. Una collana dal carattere deciso, frutto di un lavoro artigianale di precisione, a pochi passi dal mare di Salerno.",
      "Lavorata a mano nell'atelier di Aamir. {m}. Nessun pezzo è identico a un altro.",
    ],
    en: [
      "Necklace entirely handmade by Aamir. {m}, selected and set one by one. A one-of-a-kind piece.",
      "{m}. A necklace with real presence, born of precise craftsmanship, steps from the sea of Salerno.",
      "Hand-assembled in Aamir's atelier. {m}. No two pieces are alike.",
    ],
  },
  bracciali: {
    it: [
      "Bracciale lavorato a mano. {m}. Pensato anche per essere combinato con altri.",
      "{m}. Un bracciale artigianale che nasce dalle mani di Aamir, senza produzione in serie.",
    ],
    en: [
      "Hand-worked bracelet. {m}. Made to be worn on its own or stacked.",
      "{m}. A handcrafted bracelet from Aamir's hands — never mass-produced.",
    ],
  },
  orecchini: {
    it: [
      "Orecchini realizzati a mano. {m}. Leggeri e luminosi.",
      "{m}. Orecchini d'autore, ognuno rifinito a mano.",
    ],
    en: [
      "Handmade earrings. {m}. Light and luminous.",
      "{m}. Signature earrings, each finished by hand.",
    ],
  },
  anelli: {
    it: [
      "{m}. Anelli dal carattere importante, lavorati a mano da Aamir.",
      "Anelli artigianali. {m}. Ogni castone è montato con cura, pezzo unico.",
    ],
    en: [
      "{m}. Statement rings, hand-worked by Aamir.",
      "Handcrafted rings. {m}. Every stone is set with care — one of a kind.",
    ],
  },
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const DEMO_PRODUCTS: Product[] = SEEDS.map((s, i) => {
  const img = String(s.n).padStart(2, "0");
  const it = DESC[s.cat].it[i % DESC[s.cat].it.length].replace("{m}", s.mIt);
  const en = DESC[s.cat].en[i % DESC[s.cat].en.length].replace("{m}", s.mEn);
  return {
    _id: `p-${img}`,
    title: { it: s.it, en: s.en },
    slug: `${slugify(s.en)}-${s.n}`,
    categorySlug: s.cat,
    images: [{ url: `/products/img-${img}.jpeg`, alt: s.it }],
    materials: { it: s.mIt, en: s.mEn },
    description: { it, en },
    available: true,
  };
});

export const DEMO_FEATURED: Product[] = DEMO_PRODUCTS.filter(
  (_, i) => SEEDS[i].feat,
);

export function demoByCategory(slug: string): Product[] {
  return DEMO_PRODUCTS.filter((p) => p.categorySlug === slug);
}

export function demoBySlug(slug: string): Product | null {
  return DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;
}
