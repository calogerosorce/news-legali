// Utility comuni: fetch con timeout/retry, parsing XML/HTML leggero, date.

const UA =
  'Mozilla/5.0 (compatible; NewsLegaliBot/1.0; +https://calogerosorce.github.io/news-legali/)';

// Per i test: NEWS_FIXTURES=cartella -> legge i file locali invece di scaricare.
const FIXTURE_MAP = {
  '30giorni/serie_generale': 'gu-sg-30.html',
  'serie_generale/caricaDettaglio': 'gu-sg-det.html',
  '30giorni/corte_costituzionale': 'gu-s1-30.html',
  'corte_costituzionale/caricaDettaglio': 'gu-s1-det.html',
  'gazzettaufficiale.it/rss/SG': 'gu-sg.xml',
  'gazzettaufficiale.it/rss/S1': 'gu-s1.xml',
  'giurisprudenza_penale': 'cass-pen.html',
  'giurisprudenza_civile': 'cass-civ.html',
  'curia.europa.eu': 'curia.xml',
  'agenziaentrate.gov.it': 'ade.xml',
};

export async function fetchText(url, { timeoutMs = 25000, retries = 2 } = {}) {
  if (process.env.NEWS_FIXTURES) {
    const { readFile } = await import('node:fs/promises');
    const key = Object.keys(FIXTURE_MAP).find((k) => url.includes(k));
    if (!key) throw new Error(`fixture mancante per ${url}`);
    return readFile(`${process.env.NEWS_FIXTURES}/${FIXTURE_MAP[key]}`, 'utf8');
  }
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': UA,
          Accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      return new TextDecoder('utf-8').decode(buf);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    } finally {
      clearTimeout(t);
    }
  }
  throw new Error(`${url} -> ${lastErr?.message || lastErr}`);
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  agrave: 'à', egrave: 'è', eacute: 'é', igrave: 'ì', ograve: 'ò', ugrave: 'ù',
  Agrave: 'À', Egrave: 'È', Eacute: 'É', Igrave: 'Ì', Ograve: 'Ò', Ugrave: 'Ù',
  laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  ndash: '–', mdash: '—', hellip: '…', euro: '€', deg: '°', sect: '§', ccedil: 'ç',
};

export function decodeEntities(s = '') {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (n in ENTITIES ? ENTITIES[n] : m));
}

export function stripTags(s = '') {
  return s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ');
}

export function clean(s = '') {
  return decodeEntities(stripTags(decodeEntities(unCdata(s))))
    .replace(/\s+/g, ' ')
    .trim();
}

export function unCdata(s = '') {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

/** Estrae gli <item> di un feed RSS 2.0 come oggetti {tag: testo grezzo}. */
export function parseRssItems(xml) {
  const items = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const get = (tag) => {
      const r = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const mm = block.match(r);
      return mm ? unCdata(mm[1]) : '';
    };
    items.push({
      title: get('title'),
      link: get('link'),
      description: get('description'),
      content: get('content:encoded'),
      pubDate: get('pubDate'),
      guid: get('guid'),
    });
  }
  return items;
}

export function channelTag(xml, tag) {
  const ch = xml.split(/<item\b/i)[0];
  const m = ch.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? clean(m[1]) : '';
}

const MESI = {
  gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
  luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12,
};

/** "25 novembre 2026" -> "2026-11-25" */
export function italianDate(s = '') {
  const m = s.toLowerCase().match(/(\d{1,2})\s+([a-zà]+)\s+(\d{4})/);
  if (!m || !MESI[m[2]]) return null;
  return iso(+m[3], MESI[m[2]], +m[1]);
}

/** "09/11/2026" o "23/11/26" -> "2026-11-09" */
export function slashDate(s = '') {
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  let y = +m[3];
  if (y < 100) y += 2000;
  return iso(y, +m[2], +m[1]);
}

export function rfcDate(s = '') {
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

function iso(y, mo, d) {
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Non accetta date nel futuro (oltre domani) né assurde. */
export function sanitizeDate(d, fallback = todayISO()) {
  if (!d) return fallback;
  const max = new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10);
  if (d > max || d < '2000-01-01') return fallback;
  return d;
}

export function https(url = '') {
  return url.trim().replace(/^http:\/\//i, 'https://');
}

/** Prima lettera maiuscola, resto com'è; normalizza MAIUSCOLO intero in Frase. */
export function sentenceCase(s = '') {
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  const upper = letters.replace(/[^A-ZÀ-Þ]/g, '').length;
  if (letters.length > 6 && upper / letters.length > 0.8) {
    s = s.toLowerCase();
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function truncate(s = '', n = 280) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.–-]+$/, '') + '…';
}
