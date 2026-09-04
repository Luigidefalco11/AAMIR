# E-commerce Fase 1: acquisto online — Design

**Data:** 2026-08-13
**Stato:** Approvato, in attesa di piano di implementazione

## Contesto

Il sito AAMIR (Next.js + Sanity CMS, deployato su Render) è oggi una vetrina senza
pagamenti: i clienti richiedono informazioni via email o DM Instagram. Questo
documento definisce la Fase 1 di un percorso verso l'e-commerce completo: rendere
i gioielli acquistabili online con pagamento reale.

Le fasi successive (gestione ordini avanzata, spedizioni internazionali, codici
sconto, recupero carrelli abbandonati) **non** sono in scope qui e verranno
spec'ate separatamente quando affrontate.

## Decisioni di prodotto (confermate con l'utente)

- Pagamento online **completo**, non solo carrello-per-preventivo.
- L'attività ha già (o avrà a breve) P.IVA italiana — prerequisito per aprire
  Stripe legalmente.
- **Carrello vero** con più pezzi contemporaneamente (non "Acquista ora" singolo).
- Ogni gioiello è un **pezzo unico fatto a mano**: quantità sempre 1 per articolo,
  e una volta venduto deve sparire dall'inventario disponibile immediatamente
  (niente overselling di un pezzo irripetibile).
- Spedizione: **tariffa fissa, solo Italia**, per iniziare.
- Notifica ordini: **email + elenco ordini nel pannello Sanity** esistente (nessun
  nuovo strumento da imparare per Aamir).
- **Tutti** i prodotti diventano acquistabili con prezzo fisso — il bottone
  "Richiedi info" via Instagram DM viene sostituito da "Aggiungi al carrello"
  sulle pagine prodotto (Instagram resta in header/footer per contatti generici).

## Architettura scelta: Stripe Checkout ospitato

Tre approcci sono stati valutati:

- **A — Stripe Checkout ospitato + ordini su Sanity + webhook (scelto).**
  Il carrello vive sul sito; al pagamento si viene reindirizzati alla pagina
  ospitata da Stripe (gestisce carta, Apple/Google Pay, 3D Secure, conformità
  PCI). Un webhook registra l'ordine su Sanity e invia le notifiche. Nessuna
  nuova infrastruttura oltre a Sanity + Stripe.
- **B — Checkout personalizzato con Stripe Elements incorporato.** Scartato:
  molto più lavoro/superficie di test per un guadagno estetico marginale
  (il pagamento resterebbe visivamente sul dominio del sito).
- **C — Piattaforma e-commerce terza (es. Snipcart).** Scartato: introduce un
  fornitore e un costo aggiuntivi, si integra peggio con lo schema prodotti
  già costruito su Sanity.

## Modello dati (Sanity)

- `product`: nuovo campo `price` (number, EUR — es. `450`). Opzionale solo a
  livello di schema, per non rompere in fase di migrazione i 52 prodotti già
  seminati senza prezzo. Finché un prodotto non ha `price` impostato, la
  pagina prodotto mostra "Prezzo su richiesta" senza bottone d'acquisto (il
  bottone "Richiedi info"/Instagram resta sostituito ovunque, come deciso —
  non viene reintrodotto). L'obiettivo di rollout è assegnare un prezzo a
  tutti i prodotti prima del lancio pubblico del pagamento.
- Nuovo tipo documento `order`:
  - `stripeSessionId`, `stripePaymentIntentId`
  - `items`: snapshot degli articoli acquistati (riferimento prodotto, titolo,
    prezzo al momento dell'acquisto — mai ricalcolato a posteriori)
  - `total`, `shippingAddress`, `customerEmail`
  - `status`: `paid` | `shipped` (Aamir aggiorna manualmente da Studio)
  - `createdAt`
  - Editabile/visibile in Sanity Studio (struttura dedicata "Ordini").

## Carrello (client-side)

- Stato in React Context, persistito in `localStorage` (sopravvive al refresh,
  nessun account cliente richiesto).
- Quantità sempre 1 per articolo (pezzi unici). Se un prodotto è già nel
  carrello, il bottone prodotto mostra "Nel carrello" invece di duplicarlo.
- Icona carrello con contatore nell'header. Pagina/drawer carrello con elenco,
  rimozione articolo, totale, checkbox di accettazione termini (vedi sotto),
  bottone "Vai al pagamento".
- Prodotti con `available: false` non mostrano bottone d'acquisto — badge
  "Venduto".

## Flusso di checkout e pagamento

1. Nel carrello, il cliente spunta obbligatoriamente "Ho letto e accetto
   Termini, Privacy e Diritto di recesso" (link alla pagina legale) prima che
   il bottone "Vai al pagamento" sia attivo.
2. Route `/api/checkout` (server): riceve gli ID prodotto nel carrello,
   **ri-verifica su Sanity prezzo e disponibilità corrente di ognuno** (mai
   fidarsi di prezzi/disponibilità inviati dal client). Se un prodotto non è
   più disponibile, viene escluso e il cliente viene avvisato prima di
   procedere. Crea una Stripe Checkout Session con:
   - Righe (line items) per ogni prodotto ancora disponibile
   - Tariffa di spedizione fissa, Italia
   - Raccolta indirizzo di spedizione
   - Lingue IT/EN
3. Redirect alla pagina di pagamento ospitata da Stripe.
4. Al termine: redirect a `/[locale]/checkout/successo` (carrello svuotato,
   conferma) o `/[locale]/checkout/annullato` (carrello intatto) se il
   cliente annulla.

## Dopo il pagamento (webhook)

Route `/api/webhooks/stripe`, verifica la firma Stripe. Su evento
`checkout.session.completed`:

1. Crea il documento `order` su Sanity con lo snapshot dell'acquisto.
2. Imposta `available: false` su ogni prodotto acquistato (fondamentale per
   pezzi unici — impedisce che restino "in vendita" per altri clienti).
3. Invia email di conferma al cliente e notifica ad Aamir/team via **Resend**
   (piano gratuito sufficiente ai volumi attesi; alternativa da valutare solo
   se l'utente preferisce un altro provider email).

Se il webhook fallisce nel salvare (es. Sanity temporaneamente non
raggiungibile), il pagamento resta comunque riuscito lato Stripe (i fondi sono
al sicuro) — si sfrutta il retry automatico di Stripe sui webhook invece di
costruire un sistema di coda separato.

## Requisiti legali minimi (non rimandabili)

Obbligatori per l'UE prima di attivare pagamenti reali, non spostabili a una
fase successiva:

- Pagina "Termini e Condizioni" con: dati dell'attività (P.IVA), diritto di
  recesso di 14 giorni (vendite a distanza B2C), modalità di reso, tempi di
  spedizione, metodi di pagamento accettati.
- Checkbox di accettazione obbligatoria prima del pagamento (vedi flusso
  sopra).
- **Fuori scope tecnico:** la fatturazione fiscale italiana (se dovuta in base
  al regime IVA di Aamir) resta un processo manuale gestito da Aamir con il
  proprio commercialista — non viene automatizzata in questa fase. Stripe
  fornisce comunque una ricevuta di pagamento automatica al cliente.

## Gestione errori

- Pezzo diventato non disponibile tra "aggiunto al carrello" e "checkout" →
  rimosso automaticamente con avviso, prima di creare la sessione Stripe.
- Pagamento fallito/annullato → il cliente torna al carrello intatto, nessun
  ordine creato.
- Webhook che fallisce → retry automatico di Stripe (nessuna coda custom).
- Race condition di due acquirenti sullo stesso pezzo unico in finestre di
  tempo strettissime: limitazione accettata per un sito di queste dimensioni,
  non risolta con locking/riserva — se capitasse, va gestita manualmente
  (rimborso del secondo ordine).

## Test

- Test automatici: logica di carrello (aggiunta/rimozione/persistenza) e
  calcolo server-side di prezzi/disponibilità in `/api/checkout`.
- Test manuale end-to-end in modalità test di Stripe (carte finte) prima di
  passare in produzione con chiavi live.

## Fuori scope (fasi future)

- Gestione ordini avanzata (tracking, stati multipli, rimborsi da UI)
- Spedizioni internazionali / tariffe calcolate
- Codici sconto/promozioni
- Recupero carrelli abbandonati
- Fatturazione elettronica automatizzata
