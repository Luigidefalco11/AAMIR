# AAMIR — Sito vetrina gioielleria artigianale (Salerno)

**Data:** 2026-07-22
**Stato:** Approvato per pianificazione implementazione

## Obiettivo

Sito vetrina di alto livello ("valore 10k$") per AAMIR, boutique/atelier orafo artigianale a Salerno, vicino al mare. Aamir è un artigiano individuale con oltre 10 anni di esperienza in Italia, lavora pietre preziose con lavorazione a mano, nessuna produzione in serie. Il sito deve:

- Presentare il brand con un'estetica elegante ed editoriale, ispirata a tre riferimenti (JURI, Bedouin's Daughter, YLEM), in un mix libero definito da noi
- Permettere ad Aamir di gestire da solo il catalogo prodotti (collane, bracciali, orecchini, anelli) senza scrivere codice
- Caricarsi velocemente e con animazioni curate su qualsiasi dispositivo
- Non gestire vendite/pagamenti online: l'acquisto avviene fuori dal sito (email/Instagram/boutique fisica)
- Essere disponibile in italiano e inglese

## Fuori scope (esplicitamente escluso)

- Checkout, pagamenti, carrello, gestione ordini
- Numero di telefono pubblico ovunque nel sito
- Prezzi visibili sui prodotti (politica "prezzo su richiesta")
- Contenuti reali (foto, logo, email, Instagram, indirizzo esatto) — tutto placeholder in questa fase, sostituibile dal pannello CMS in seguito

## Stack tecnico

- **Frontend:** Next.js (App Router), Tailwind CSS, GSAP + ScrollTrigger per le animazioni
- **CMS:** Sanity (Studio integrato su `/studio`, piano gratuito) — Aamir gestisce prodotti e testi principali da qui
- **Deploy:** Vercel (frontend, piano gratuito) + Sanity hosted (CMS, piano gratuito). Dominio personalizzato collegabile in seguito
- **i18n:** routing `/it/...` e `/en/...`, redirect automatico su lingua browser (fallback italiano), campi CMS localizzati IT/EN

Motivazione: è l'unico dei tre approcci valutati (Next.js+Sanity, Astro+Decap, WordPress+ACF) che combina pannello di gestione realmente semplice per un utente non tecnico, massime performance/animazioni curate, e zero costi ricorrenti oltre a un eventuale dominio.

## Sitemap

- `/` — Home: hero editoriale (foto mare/costa + gioiello), collezioni in evidenza, estratto "Chi Siamo", footer contatti
- `/collezioni` — griglia prodotti filtrabile per categoria
- `/collezioni/[categoria]` — griglia filtrata (Collane, Bracciali, Orecchini, Anelli)
- `/collezioni/[categoria]/[slug]` — pagina prodotto (PDP): galleria immagini, materiali, descrizione, pulsante "Richiedi info" — **nessun prezzo**
- `/chi-siamo` — storia di Aamir, artigianalità, legame con Salerno
- `/contatti` — email, Instagram, riferimento generico alla zona (no indirizzo esatto per ora)
- `/studio` — Sanity Studio (accesso riservato ad Aamir)

## Modello dati (schema Sanity)

- **`product`**: nome (IT/EN), categoria (riferimento), slug, galleria immagini (con alt-text obbligatorio), materiali/pietre, descrizione (IT/EN), in evidenza (bool), disponibile (bool), ordine di visualizzazione
- **`category`**: nome (IT/EN: Collane/Necklaces, Bracciali/Bracelets, Orecchini/Earrings, Anelli/Rings), slug, immagine di copertina
- **`siteSettings`** (singleton): logo, testi hero (IT/EN), testo "Chi Siamo" (IT/EN), email contatto, handle Instagram, meta SEO

## Contenuti — tono "Chi Siamo"

Base reale (non generica) da usare per hero, About e meta-testi:

> *"Aamir lavora l'oreficeria da oltre dieci anni, qui in Italia. Seleziona e lavora pietre preziose con la precisione di chi conosce il mestiere fino in fondo, trasformandole a mano in collane, anelli, bracciali e orecchini. Nessuna produzione in serie: solo la ricerca costante di equilibrio, forma e qualità, a pochi passi dal mare di Salerno."*

Versione EN equivalente da produrre in fase di implementazione. Evitare qualunque formulazione che sminuisca la serietà/expertise di Aamir (es. riferimenti a materiali "minori" o linguaggio casual).

## Sistema visivo

**Palette** (bianco dominante, blu mare come identità, oro solo come dettaglio):
- Sfondo: `#FAF9F6` (bianco caldo) / `#FFFFFF` (sezioni prodotto)
- Testo: `#14212B` (quasi-nero con sfumatura blu)
- Accento primario: `#1B4B66` (blu mare Mediterraneo, CTA/link/dettagli)
- Accento secondario/hover: `#4A7C95`
- Oro (tocco minimo): `#B08D57` (solo dettagli sottili, non dominante)
- Bordi/muted: `#E4E9EC`

**Tipografia:** *Cormorant* (serif) per titoli/nomi collezione, *Montserrat* (sans) per testi/UI.

**Layout:** griglia editoriale ampia e asimmetrica in home (ispirata a JURI), PDP a due colonne con galleria + dettagli (ispirata a Bedouin's Daughter), transizioni tra sezioni misurate (ispirate a YLEM).

**Animazioni (GSAP + ScrollTrigger):**
- Reveal all'ingresso in viewport: fade + translateY 20-30px, 400-600ms, solo `transform`/`opacity`
- Parallax sottile su immagini hero
- Micro-interazioni hover/click: 150-300ms
- Rispetto totale di `prefers-reduced-motion` (transizioni istantanee, nessuna animazione decorativa)

**Performance/responsive:** mobile-first; immagini via Sanity CDN + `next/image` (WebP/AVIF, srcset responsive); spazio riservato per ogni immagine (CLS ~0); breakpoint testati a 375/768/1024/1440px; obiettivo Lighthouse 90+ su mobile e desktop.

## Flusso contatto

Pulsante "Richiedi info" su ogni PDP → apre `mailto:` precompilato (oggetto: "Richiesta info: [nome pezzo]"). Icona Instagram sempre visibile in header/footer/contatti. Nessun numero di telefono pubblicato. Nessun backend/servizio esterno necessario per questo flusso (no form server-side, no Resend/email service — decisione presa per evitare complessità e costi non necessari a questo stadio).

## Gestione errori

- Pagina 404 curata, coerente col brand
- Placeholder elegante per prodotti senza foto caricate
- ISR/cache: se il CMS è temporaneamente irraggiungibile, il sito serve l'ultima versione generata (nessuna pagina bianca)

## Piano di test/QA prima della consegna

- Lighthouse 90+ su mobile e desktop
- Verifica cross-browser (Chrome, Safari, Firefox)
- Breakpoint 375/768/1024/1440px, nessuno scroll orizzontale
- Accessibilità: contrasto 4.5:1, navigazione da tastiera, alt-text obbligatorio, `prefers-reduced-motion` rispettato
- Test end-to-end del flusso editoriale: Aamir aggiunge un prodotto dal pannello Sanity → il prodotto compare correttamente sul sito (categoria, immagini, IT/EN)

## Note per l'implementazione

- Tutti i contenuti reali (foto prodotto, logo, email, Instagram, indirizzo) sono placeholder in questa fase: verranno sostituiti da Aamir tramite il pannello CMS quando disponibili
- Nessun account Shopify o servizio di pagamento richiesto
