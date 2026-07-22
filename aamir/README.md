# AAMIR — Sito gioielleria

Sito vetrina (Next.js + Sanity CMS). Nessun pagamento online: i clienti richiedono
informazioni via email o Instagram.

## Requisiti
- Node.js 20+
- Un account Sanity gratuito (https://sanity.io)

## Configurazione iniziale (una volta sola)
1. `npm install`
2. Crea il progetto Sanity: `npx sanity login` poi `npx sanity init --env .env.local`
   (crea il file `.env.local` con projectId e dataset).
3. (Opzionale) Dati di esempio: crea un token "Editor" su sanity.io/manage,
   aggiungilo in `.env.local` come `SANITY_WRITE_TOKEN=...`, poi `npm run seed`.

## Sviluppo
- `npm run dev` → sito su http://localhost:3000 (redirect a /it)
- Pannello di gestione prodotti: http://localhost:3000/studio

## Come Aamir aggiunge un gioiello
1. Apri `/studio` e accedi.
2. "Gioiello" → crea nuovo → nome (IT/EN), categoria, immagini (con testo
   alternativo), materiali, descrizione. Spunta "In evidenza" per mostrarlo in home.
3. Salva/pubblica. Il sito si aggiorna entro un minuto.

## Deploy
- Frontend: Vercel (importa il repo, aggiungi le stesse variabili `.env.local`).
- CMS: già hosted su Sanity. Aggiungi l'URL di produzione ai CORS origins su
  sanity.io/manage → API → CORS.
