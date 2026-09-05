# AAMIR — Sito gioielleria

Sito e-commerce (Next.js + Sanity CMS + Stripe). I clienti acquistano i gioielli
online con pagamento tramite Stripe Checkout.

## Requisiti
- Node.js 20+
- Un account Sanity gratuito (https://sanity.io)
- Un account Stripe (https://stripe.com) collegato a un'attività con P.IVA
- Un account Resend (https://resend.com) per le email di conferma ordine

## Configurazione iniziale (una volta sola)
1. `npm install`
2. Crea il progetto Sanity: `npx sanity login` poi `npx sanity init --env .env.local`
   (crea il file `.env.local` con projectId e dataset).
3. Crea un token "Editor" su sanity.io/manage → API → Tokens, aggiungilo in
   `.env.local` come `SANITY_WRITE_TOKEN=...` (serve sia per `npm run seed`
   sia per registrare gli ordini in produzione).
4. Dati di esempio: `npm run seed`.
5. Su dashboard.stripe.com, prendi la chiave segreta (modalità test per
   iniziare) e mettila in `.env.local` come `STRIPE_SECRET_KEY=...`.
6. Con la Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
   ottieni un webhook secret di test e mettilo come `STRIPE_WEBHOOK_SECRET=...`.
7. Su resend.com prendi una API key e mettila come `RESEND_API_KEY=...`.
8. In `/studio` → Impostazioni sito, compila Ragione sociale, Partita IVA e
   Sede legale (compaiono nella pagina Termini e Condizioni pubblica).

## Sviluppo
- `npm run dev` → sito su http://localhost:3000 (redirect a /it)
- Pannello di gestione prodotti e ordini: http://localhost:3000/studio

## Come Aamir aggiunge un gioiello
1. Apri `/studio` e accedi.
2. "Gioiello" → crea nuovo → nome (IT/EN), categoria, immagini (con testo
   alternativo), materiali, descrizione, **prezzo in EUR**. Spunta "In
   evidenza" per mostrarlo in home. Senza prezzo, il pezzo mostra "Prezzo su
   richiesta" e non è acquistabile online.
3. Salva/pubblica. Il sito si aggiorna entro un minuto.

## Come funzionano gli ordini
Quando un cliente paga, un webhook Stripe crea automaticamente un documento
"Ordine" in `/studio`, segna il pezzo acquistato come non più disponibile
(sono pezzi unici), e invia un'email di conferma al cliente e una di
notifica ad Aamir. Aamir aggiorna lo stato dell'ordine a "Spedito" da
`/studio` una volta spedito il pacco.

## Deploy
- Frontend: Render (Web Service, root directory `aamir`, vedi `render.yaml`
  alla radice del repository).
- CMS: già hosted su Sanity. Aggiungi l'URL di produzione ai CORS origins su
  sanity.io/manage → API → CORS.
- Variabili d'ambiente da impostare su Render (oltre a quelle già in uso):
  `SANITY_WRITE_TOKEN`, `STRIPE_SECRET_KEY` (chiave live), `STRIPE_WEBHOOK_SECRET`
  (dal webhook endpoint configurato su dashboard.stripe.com puntato a
  `https://<dominio>/api/webhooks/stripe`), `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL` (da un dominio verificato su Resend),
  `NEXT_PUBLIC_SITE_URL` (URL pubblico del sito, es.
  `https://aamir-y6o6.onrender.com`).
