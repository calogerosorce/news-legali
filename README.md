# News legali — hub automatico

Raccoglie ogni 3 ore notizie da fonti istituzionali (Gazzetta Ufficiale, Corte costituzionale via G.U. 1ª S.S.,
Corte di Cassazione civile e penale, Corte di giustizia UE, Agenzia delle Entrate), le classifica per area
di pratica e le pubblica come JSON statici su GitHub Pages.

- Endpoint: `https://calogerosorce.github.io/news-legali/api/<area>.json`
  aree: penale, civile, famiglia, lavoro, tributario, amministrativo, immigrazione, professione, ue, generale, all
- Stato fonti: `api/status.json` (pagina leggibile: `index.html`)
- Widget da incollare nei siti: `widget/news-legali-snippet.html` (demo in `demo/`)
- Spiegazioni "in breve" con AI: opzionali, si attivano aggiungendo il secret `ANTHROPIC_API_KEY`
- Allarme: se una fonte non risponde per oltre 72 ore il workflow fallisce e GitHub invia un'email.

Comandi: `node scripts/build.mjs` (raccolta), `node --test tests/sources.test.mjs` (test sui parser).
