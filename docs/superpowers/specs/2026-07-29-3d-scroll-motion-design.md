# AAMIR — Movimento 3D delle immagini prodotto + sezione "La Lavorazione"

**Data:** 2026-07-29
**Stato:** Approvato per pianificazione implementazione

## Obiettivo

Il sito attuale (Reveal/Float/Parallax) usa solo fade e traslazione verticale: risulta piatto rispetto a quanto Aamir aveva chiesto. Questa iterazione introduce un movimento 3D reale, legato allo scroll, sulle fotografie prodotto già presenti nel sito (collane, anelli, bracciali, orecchini), per dare l'impressione che l'oggetto ruoti/si giri mentre la pagina scorre. In aggiunta, la homepage guadagna una sezione dedicata alla lavorazione artigianale con un video di Aamir al lavoro, per comunicare che ogni pezzo è fatto a mano.

Tono richiesto: elegante, professionale, innovativo — non gadget, non invadente.

## Fuori scope

- Modelli 3D veri (WebGL/Three.js) dei gioielli: non esistono asset 3D dei prodotti e non rientra in questa iterazione
- Redesign di pagine diverse dalla home (collezioni, PDP, chi-siamo, contatti restano come sono; il nuovo componente di movimento potrà essere riusato lì in futuro, ma non è richiesto ora)
- Riprese/editing del video: il video viene fornito già tagliato da Aamir

## Approccio tecnico

Nessuna nuova libreria: GSAP + ScrollTrigger sono già in uso. Le foto prodotto vengono inserite in un contenitore con `perspective` CSS, e un nuovo componente **`Tilt3D`** applica una rotazione 3D (`rotateX`/`rotateY`) scrubbata sulla posizione di scroll dell'elemento nel viewport (stessa tecnica già usata da `Parallax`, ma con rotazione invece di sola traslazione). Su desktop, `Tilt3D` aggiunge anche un tilt reattivo al mouse quando l'elemento è fermo al centro del viewport, per dare vita alle card anche senza scroll attivo.

`Tilt3D` sostituisce sia `Float` che `Parallax`, che erano un primo tentativo (solo traslazione verticale) usato esclusivamente in `page.tsx`. Verranno rimossi.

## Dove si applica

- **Hero**: l'immagine prodotto in evidenza ruota in 3D mentre la sezione entra in vista/si scorre.
- **Griglia "In evidenza"** (`ProductCard`): ogni immagine ruota mentre attraversa il viewport, con uno sfalsamento (delay) crescente tra le card per evitare che si muovano tutte all'unisono.
- **Nuova sezione "La Lavorazione"**: dopo la griglia prodotti, prima della sezione "about" testuale esistente (che resta, eventualmente riposizionata sotto). Contiene:
  - Il video verticale (9:16) di Aamir al lavoro, incorniciato con lo stesso stile a profondità/prospettiva delle altre immagini
  - Un breve testo IT/EN a fianco (nuovo namespace i18n `craft`, con fallback hardcoded come già fatto per hero/about)

## Video

- **Sorgente:** `Pictures/AAMIR/WhatsApp Video 2026-07-29 at 12.06.45.mp4`, ~15s, verticale 9:16 — fornito da Aamir/utente
- **Destinazione nel repo:** `aamir/public/videos/lavorazione.mp4`
- **Comportamento:** autoplay, loop, muted, `playsInline`, nessun controllo visibile — è un elemento decorativo/atmosferico, non un video da "guardare" con audio
- **Poster/fallback:** frame statico come poster per il primo paint e per browser che bloccano l'autoplay
- **Riduzione movimento:** se `prefers-reduced-motion` è attivo, il video mostra solo il poster statico (nessun autoplay, nessuna rotazione 3D della cornice)

## Performance e accessibilità

- Le rotazioni usano solo `transform` (mai `top`/`left`/dimensioni) per restare fluide a 60fps
- `prefers-reduced-motion` (già gestito in `lib/motion.ts`) disattiva rotazione da scroll e tilt da mouse: le immagini restano ferme e nitide
- Il video ha `preload="metadata"` e dimensioni compresse per non appesantire il caricamento della home
- Nessuna regressione al CLS: i contenitori immagine/video mantengono aspect-ratio riservato come già avviene con `SafeImage`

## Note per l'implementazione

- Copiare/comprimere il video sorgente in `public/videos/lavorazione.mp4` (verificare peso file finale, target ragionevole <3MB per 15s)
- Generare un frame poster dal video per il fallback
- Rimuovere `Float.tsx` e `Parallax.tsx` dopo la migrazione a `Tilt3D`, aggiornando gli import in `page.tsx`
- Aggiungere il namespace `craft` ai file di traduzione IT/EN esistenti (stesso pattern di `hero`/`collections`)
