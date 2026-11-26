// Spiegazione "in parole semplici" (opzionale). Si attiva solo se esiste il secret
// ANTHROPIC_API_KEY nel repository. Senza chiave l'hub funziona lo stesso.
// Il modello riceve SOLO il testo ufficiale della notizia e non deve aggiungere nulla.

const MODEL = process.env.NEWS_AI_MODEL || 'claude-haiku-5-5';
const MAX_PER_RUN = Number(process.env.NEWS_AI_MAX || 30);

const SYSTEM = `Sei un redattore giuridico italiano. Ricevi l'estratto ufficiale di una notizia giuridica
(legge, decreto, sentenza, comunicato). Scrivi UNA o DUE frasi, massimo 45 parole, in italiano chiaro
per un cittadino non esperto, che spiegano di cosa si tratta.
Regole tassative:
- Usa solo le informazioni presenti nel testo. Non aggiungere date, numeri, effetti o conseguenze non scritti.
- Non dare consigli, non usare la prima persona, niente toni promozionali, niente emoji.
- Se il testo è troppo tecnico o incompleto per spiegarlo senza inventare, rispondi esattamente: SKIP
Rispondi solo con il testo della spiegazione.`;

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function explain(item) {
  const user = [
    `Fonte: ${item.sourceLabel}`,
    `Tipo: ${item.kind}`,
    `Estremi: ${item.subtitle}`,
    item.summary ? `Materia: ${item.summary}` : '',
    `Testo: ${item.title}`,
  ].filter(Boolean).join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = (data.content || []).map((c) => c.text || '').join('').trim();
  if (!text || /^SKIP\b/i.test(text) || text.split(/\s+/).length > 70) return null;
  return text.replace(/\s+/g, ' ');
}

/** Aggiunge item.plain alle notizie più recenti che non l'hanno ancora. */
export async function enrichWithAI(items, log = console.log) {
  if (!aiEnabled()) return { enabled: false, done: 0 };
  const todo = items
    .filter((i) => i.plain === undefined)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, MAX_PER_RUN);
  let done = 0;
  for (const it of todo) {
    try {
      const p = await explain(it);
      it.plain = p; // null = il modello ha scelto di non spiegare: non riprovare
      if (p) done++;
    } catch (e) {
      log(`  AI: errore su ${it.id}: ${e.message}`);
      if (/HTTP 401|HTTP 403/.test(e.message)) break; // chiave non valida: inutile continuare
    }
  }
  return { enabled: true, done, model: MODEL };
}
