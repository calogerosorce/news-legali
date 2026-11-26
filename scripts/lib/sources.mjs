// Fonti ufficiali. Ogni fonte espone fetch() -> array di notizie normalizzate:
// { id, source, sourceLabel, kind, title, subtitle, summary, url, date, areas[] }

import {
  fetchText, parseRssItems, channelTag, clean, italianDate, slashDate, rfcDate,
  sanitizeDate, https, sentenceCase, truncate, decodeEntities,
} from './util.mjs';
import { classify } from './areas.mjs';

// ---------------------------------------------------------------- Gazzetta Ufficiale
// Feed: https://www.gazzettaufficiale.it/rss/SG (ultimo numero della Serie Generale)
// <title> = tipo atto + data + numero; <content:encoded> = rubrica (oggetto dell'atto)

const GU_TYPES_RILEVANTI = [
  'LEGGE COSTITUZIONALE', 'DECRETO-LEGGE', 'DECRETO LEGISLATIVO', 'LEGGE',
  'DECRETO DEL PRESIDENTE DELLA REPUBBLICA', 'TESTO COORDINATO DEL DECRETO-LEGGE',
];
const GU_EMITTENTI_RILEVANTI = [
  'MINISTERO DELLA GIUSTIZIA', "MINISTERO DELL'ECONOMIA E DELLE FINANZE",
  'MINISTERO DEL LAVORO E DELLE POLITICHE SOCIALI', "MINISTERO DELL'INTERNO",
  'AGENZIA DELLE ENTRATE', 'PRESIDENZA DEL CONSIGLIO DEI MINISTRI',
  'GARANTE PER LA PROTEZIONE DEI DATI PERSONALI', 'AUTORITA NAZIONALE ANTICORRUZIONE',
  'CORTE SUPREMA DI CASSAZIONE', 'CONSIGLIO SUPERIORE DELLA MAGISTRATURA',
];
const GU_RUMORE = [
  /scioglimento del consiglio comunale/i, /sospensione del consiglio comunale/i,
  /nomina del commissario/i, /\bnomina\b.*\b(componente|membro|presidente)\b/i,
  /prosciutto|denominazione di origine|indicazione geografica|disciplinare di produzione/i,
  /medicinal|farmac|specialit[aà] medicinale|immissione in commercio/i,
  /cambi di riferimento|tassi di cambio|valute/i, /protezione civile.*ordinanza/i,
  /stato di emergenza/i, /\brettifica\b|\berrata[- ]corrige\b|comunicato relativo/i,
  /emissione di francobolli|francobollo/i, /graduatori/i, /lotteri/i,
];

function guHead(h) {
  const t = h.replace(/,\s*n\.\s*/i, ', n. ')
    .replace(/[A-ZÀ-Ý][A-ZÀ-Ý'’-]+(?:\s+[A-ZÀ-Ý][A-ZÀ-Ý'’-]*)*/g, (m) => (m.length > 3 ? m.toLowerCase() : m));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function guMinorKind(head) {
  const m = head.toUpperCase().match(/\b(DECRETO|PROVVEDIMENTO|DELIBERA|DETERMINA|CIRCOLARE|ORDINANZA|COMUNICATO)\b/);
  if (!m) return 'Provvedimento';
  return m[1] === 'DECRETO' && /^MINISTERO/i.test(head) ? 'Decreto ministeriale' : sentenceCase(m[1].toLowerCase());
}

function guTypeOf(title) {
  const T = title.toUpperCase();
  return GU_TYPES_RILEVANTI.find((t) => T.startsWith(t)) || null;
}

export const gazzettaSG = {
  id: 'gu-sg',
  label: 'Gazzetta Ufficiale',
  url: 'https://www.gazzettaufficiale.it/rss/SG',
  async fetch() {
    const xml = await fetchText(this.url);
    const issue = channelTag(xml, 'description'); // "Gazzetta Ufficiale - Serie Generale n. 275 del 25-11-2026"
    const out = [];
    for (const it of parseRssItems(xml)) {
      const head = clean(it.title); // "DECRETO LEGISLATIVO 25 novembre 2026, n.216"
      const rubrica = clean(it.content || it.description).replace(/\s*\(\d{2}[A-Z]\d{5}\)\s*\.?$/, '');
      if (!head || !rubrica) continue;
      const text = `${head} ${rubrica}`;
      if (GU_RUMORE.some((r) => r.test(text))) continue;

      const tipo = guTypeOf(head);
      const emittente = GU_EMITTENTI_RILEVANTI.find((e) =>
        head.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').startsWith(e));
      const areas = classify(text);
      // Tieni: atti normativi primari sempre; altri solo se emittente rilevante e area trovata.
      if (!tipo && !(emittente && areas.length)) continue;
      if (!areas.length) areas.push('generale');

      const link = https(it.link);
      const code = (link.match(/\/(\d{2}[A-Z]\d{5})\//) || [])[1] || link;
      const date = sanitizeDate(rfcDate(it.pubDate) || italianDate(head));
      out.push({
        id: `gu-${code}`,
        source: this.id,
        sourceLabel: 'Gazzetta Ufficiale',
        kind: tipo ? sentenceCase(tipo) : guMinorKind(head),
        title: truncate(sentenceCase(rubrica), 220),
        subtitle: `${guHead(head)}${issue ? ' — ' + issue.replace(/^Gazzetta Ufficiale - /, 'G.U. ') : ''}`,
        summary: '',
        url: link,
        date,
        areas,
        weight: tipo ? 3 : 1,
      });
    }
    return out;
  },
};

// ---------------------------------------------------------------- GU 1a Serie Speciale (Corte costituzionale)
// Teniamo solo le decisioni della Corte (sentenze/ordinanze), non gli atti di promovimento/ricorsi.

export const gazzettaS1 = {
  id: 'gu-s1',
  label: 'Corte costituzionale (G.U. 1ª S.S.)',
  url: 'https://www.gazzettaufficiale.it/rss/S1',
  async fetch() {
    const xml = await fetchText(this.url);
    const out = [];
    for (const it of parseRssItems(xml)) {
      const head = clean(it.title);
      if (/promovimento|ricorso/i.test(head)) continue;
      if (!/\b(sentenza|ordinanza)\b/i.test(head)) continue;
      let body = clean(it.content || it.description)
        .replace(/\s*\.{3,}.*$/, '')
        .replace(/\s*\(\d{2}[A-Z]\d{5}\)\s*\.?$/, '');
      const link = https(it.link);
      const code = (link.match(/\/(\d{2}[A-Z]\d{5})\//) || [])[1] || link;
      const areas = classify(`${head} ${body}`);
      if (!areas.length) areas.push('generale');
      out.push({
        id: `gu-${code}`,
        source: this.id,
        sourceLabel: 'Corte costituzionale',
        kind: /sentenza/i.test(head) ? 'Sentenza Corte cost.' : 'Ordinanza Corte cost.',
        title: truncate(body.replace(/^(sentenza|ordinanza)[^.]*?\.\s*/i, '') || head, 240),
        subtitle: sentenceCase(head),
        summary: '',
        url: link,
        date: sanitizeDate(rfcDate(it.pubDate) || italianDate(head)),
        areas,
        weight: 3,
      });
    }
    return out;
  },
};

// ---------------------------------------------------------------- Corte di Cassazione
// Pagine "Giurisprudenza penale / civile": card con sezione, estremi, materia e massima.

// Toglie i prefissi di classificazione del massimario ("91. LOCAZIONE. - ") e le ripetizioni.
function dedupeMassima(t) {
  let s = t.replace(/^\s*:\s*/, '');
  for (let k = 0; k < 4; k++) {
    s = s.replace(/^\d{1,3}\.\s+[A-ZÀ-Ý'’ ,]{3,}\.\s*(-\s*)?/, '');
  }
  const half = Math.floor(s.length / 2);
  const a = s.slice(0, half).trim();
  if (a.length > 30 && s.slice(half).trim().startsWith(a.slice(0, 30))) s = a;
  return s.trim();
}

function shortKind(k) {
  const t = sentenceCase(k.trim().toLowerCase());
  return t.replace(/^Ordinanza interlocutoria/, 'Ord. interlocutoria').replace(/^Ordinanze/, 'Ordinanze').replace(/^Questione.*/, 'Questione');
}

function parseCassazioneCards(html, settore) {
  const out = [];
  const parts = html.split(/<div class="card-news\b/).slice(1);
  for (const p of parts) {
    const href = (p.match(/href="(https:\/\/www\.cortedicassazione\.it\/it\/[a-z]+_dettaglio\.page\?contentId=([A-Z0-9]+))"/) || []);
    if (!href[1]) continue;
    const sezione = clean((p.match(/class="card-category">([\s\S]*?)<\/span>/) || [])[1] || '');
    const estremi = clean((p.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/) || [])[1] || '');
    const pNoComments = p.replace(/<!--[\s\S]*?-->/g, ' ');
    const pBlock = (pNoComments.match(/<p class="mb-3">([\s\S]*?)<\/p>/) || [])[1] || '';
    const materia = clean((pBlock.match(/<span[^>]*>([\s\S]*?)<\/span>/) || [])[1] || '');
    const massima = dedupeMassima(clean(pBlock.replace(/<span[^>]*>[\s\S]*?<\/span>\s*:?/, '')));
    const hidden = clean((p.match(/class="visually-hidden">\s*([\s\S]*?)<\/span>\s*<svg/) || [])[1] || '');
    const pubblicata = slashDate((hidden.match(/del (\d{1,2}\/\d{1,2}\/\d{2,4})\s*$/) || [])[1] || '');
    const deposito = slashDate((estremi.match(/deposito del (\d{1,2}\/\d{1,2}\/\d{2,4})/) || estremi.match(/del (\d{1,2}\/\d{1,2}\/\d{2,4})/) || [])[1] || '');
    if (!estremi || !massima) continue;
    const kind = (estremi.match(/^(Sentenze|Sentenza|Ordinanze|Ordinanza interlocutoria|Ordinanza|Decreto|Relazione|Questione[^n]*)/i) || [])[1] || 'Provvedimento';
    const forced = settore === 'penale' ? ['penale'] : ['civile'];
    const areas = classify(`${materia} ${massima}`, forced);
    out.push({
      id: `cass-${href[2]}`,
      source: settore === 'penale' ? 'cass-pen' : 'cass-civ',
      sourceLabel: 'Corte di Cassazione',
      kind: `${shortKind(kind)} Cass. ${settore === 'penale' ? 'pen.' : 'civ.'}`,
      title: truncate(massima, 260),
      subtitle: [sezione && `${sezione} ${settore}`, estremi.replace(/\s+/g, ' ')].filter(Boolean).join(' — '),
      summary: materia ? sentenceCase(materia.toLowerCase()) : '',
      url: href[1],
      date: sanitizeDate(pubblicata || deposito),
      areas,
      weight: 2,
    });
  }
  return out;
}

export const cassazionePenale = {
  id: 'cass-pen',
  label: 'Cassazione penale',
  url: 'https://www.cortedicassazione.it/it/giurisprudenza_penale.page',
  async fetch() {
    return parseCassazioneCards(await fetchText(this.url), 'penale');
  },
};

export const cassazioneCivile = {
  id: 'cass-civ',
  label: 'Cassazione civile',
  url: 'https://www.cortedicassazione.it/it/giurisprudenza_civile.page',
  async fetch() {
    return parseCassazioneCards(await fetchText(this.url), 'civile');
  },
};

// ---------------------------------------------------------------- Corte di giustizia UE (comunicati stampa in italiano)

export const curiaUE = {
  id: 'curia',
  label: 'Corte di giustizia UE',
  url: 'https://curia.europa.eu/site/rss.jsp?lang=it&secondLang=en',
  async fetch() {
    const xml = await fetchText(this.url);
    const out = [];
    for (const it of parseRssItems(xml)) {
      const head = clean(it.title); // "172/2026 : 26 novembre 2026 - Sentenza della Corte Nelle cause riunite"
      const desc = decodeEntities(it.description);
      // descrizione: causa/parti <br/> materia <br/> <p>sintesi</p>
      const segs = desc.split(/<br\s*\/?>/i).map(clean).filter(Boolean);
      const sintesi = clean((desc.match(/<p>([\s\S]*?)<\/p>/i) || [])[1] || segs[segs.length - 1] || '');
      const causa = segs[0] || '';
      const materia = segs.length > 2 ? segs[1] : '';
      if (!sintesi) continue;
      const tipoRaw = (head.split(' - ').slice(1).join(' - ') || '').trim();
      const tipo = /sentenza del tribunale/i.test(tipoRaw) ? 'Sentenza Tribunale UE'
        : /sentenza/i.test(tipoRaw) ? 'Sentenza Corte UE'
        : /conclusioni/i.test(tipoRaw) ? 'Conclusioni Avv. gen. UE'
        : /parere/i.test(tipoRaw) ? 'Parere Corte UE'
        : /ordinanza/i.test(tipoRaw) ? 'Ordinanza Corte UE' : null;
      if (!tipo) continue; // cerimonie, nomine, statistiche: non interessano ai clienti
      const ctx = `${materia} ${sintesi} ${causa}`
        .replace(/avvocat[oa] general[ei]/gi, ' ')
        .replace(/\btribunale\b/gi, ' ');
      const areas = classify(ctx, ['ue']);
      const guid = clean(it.guid) || it.link;
      out.push({
        id: `curia-${(guid.match(/p1_(\d+)/) || [])[1] || guid}`,
        source: this.id,
        sourceLabel: 'Corte di giustizia UE',
        kind: tipo,
        title: truncate(sintesi, 260),
        subtitle: [causa, materia].filter(Boolean).join(' — '),
        summary: '',
        url: https(clean(it.link)),
        date: sanitizeDate(rfcDate(it.pubDate) || italianDate(head)),
        areas,
        weight: 1,
      });
    }
    return out;
  },
};

// ---------------------------------------------------------------- Agenzia delle Entrate (novità)

export const agenziaEntrate = {
  id: 'ade',
  label: 'Agenzia delle Entrate',
  url: 'https://www.agenziaentrate.gov.it/portale/c/portal/rss/entrate?idrss=0753fcb1-1a42-4f8c-f40d-02793c6aefb4',
  async fetch() {
    const xml = await fetchText(this.url);
    const out = [];
    for (const it of parseRssItems(xml)) {
      const title = clean(it.title);
      if (!title) continue;
      const link = https(clean(it.link));
      const kind = (title.match(/^(Interpello|Risoluzione|Circolare|Provvedimento|Principio di diritto|Comunicato stampa)/i) || [])[1] || 'Novità';
      out.push({
        id: `ade-${(clean(it.guid) || link).replace(/[^a-z0-9]+/gi, '').slice(-40)}`,
        source: this.id,
        sourceLabel: 'Agenzia delle Entrate',
        kind: sentenceCase(kind.toLowerCase()),
        title: truncate(title.replace(/^(Interpello|Risoluzione|Circolare|Provvedimento):\s*/i, ''), 240),
        subtitle: '',
        summary: truncate(clean(it.description), 240),
        url: link,
        date: sanitizeDate(rfcDate(it.pubDate)),
        areas: ['tributario'],
        weight: 1,
      });
    }
    return out;
  },
};

export const SOURCES = [gazzettaSG, gazzettaS1, cassazionePenale, cassazioneCivile, curiaUE, agenziaEntrate];
