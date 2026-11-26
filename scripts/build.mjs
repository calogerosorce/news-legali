#!/usr/bin/env node
// Hub News Legali — raccoglie notizie da fonti ufficiali e pubblica JSON statici.
// Uso: node scripts/build.mjs [--offline]   (--offline = rigenera i JSON dall'archivio senza scaricare)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES, isGuNoise } from './lib/sources.mjs';
import { AREAS, AREA_IDS, classify } from './lib/areas.mjs';
import { enrichWithAI } from './lib/ai.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVE = path.join(ROOT, 'data', 'archive.json');
const STATUS_IN = path.join(ROOT, 'data', 'sources-state.json');
const API = path.join(ROOT, 'api');

const KEEP_DAYS = 150;       // quanto restano in archivio le notizie
const MAX_ARCHIVE = 2500;
const PER_AREA = 40;         // notizie per file api/<area>.json
const ALL_LIMIT = 120;
const PER_STUDIO = 80;      // notizie per file api/studi/<studio>.json
const STALE_HOURS = 72;      // fonte in errore da più di N ore => il workflow fallisce (email da GitHub)

const offline = process.argv.includes('--offline');
const log = (...a) => console.log(...a);

async function readJson(p, fallback) {
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return fallback; }
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

const PUBLIC_FIELDS = ['id', 'source', 'sourceLabel', 'kind', 'title', 'subtitle', 'summary', 'plain', 'url', 'date', 'areas'];
const pub = (i) => Object.fromEntries(PUBLIC_FIELDS.filter((k) => i[k] != null && i[k] !== '').map((k) => [k, i[k]]));

function sortItems(a, b) {
  return (b.date || '').localeCompare(a.date || '')
    || (b.weight || 0) - (a.weight || 0)
    || (b.firstSeen || '').localeCompare(a.firstSeen || '');
}

async function main() {
  const now = new Date().toISOString();
  const archive = await readJson(ARCHIVE, { items: [] });
  const state = await readJson(STATUS_IN, {});
  const byId = new Map(archive.items.map((i) => [i.id, i]));
  const report = [];

  if (!offline) {
    const memos = Object.fromEntries(SOURCES.map((s) => [s.id, { ...(state[s.id]?.memo || {}) }]));
    const results = await Promise.allSettled(SOURCES.map((s) => s.fetch({ memo: memos[s.id], log })));
    results.forEach((r, idx) => {
      const s = SOURCES[idx];
      const st = state[s.id] || {};
      if (r.status === 'fulfilled') {
        const items = r.value;
        let added = 0;
        for (const it of items) {
          const prev = byId.get(it.id);
          if (prev) {
            // aggiorna i campi della fonte, conserva firstSeen e spiegazione AI
            byId.set(it.id, { ...prev, ...it, firstSeen: prev.firstSeen, plain: prev.plain });
          } else {
            byId.set(it.id, { ...it, firstSeen: now });
            added++;
          }
        }
        // 0 notizie da una fonte che ne dava = probabile cambio di layout: segnalalo
        const suspicious = items.length === 0 && (st.lastCount || 0) > 0;
        state[s.id] = {
          label: s.label, url: s.url,
          lastOk: suspicious ? st.lastOk : now,
          lastCount: items.length, lastAdded: added,
          lastError: suspicious ? 'Nessuna notizia estratta (layout cambiato?)' : null,
          lastAttempt: now,
          memo: memos[s.id],
        };
        log(`✔ ${s.label}: ${items.length} notizie (${added} nuove)${suspicious ? ' ⚠ 0 estratte' : ''}`);
      } else {
        state[s.id] = { ...st, label: s.label, url: s.url, lastError: String(r.reason?.message || r.reason), lastAttempt: now };
        log(`✘ ${s.label}: ${state[s.id].lastError}`);
      }
      report.push({ id: s.id, ...state[s.id] });
    });
  }

  // riclassifica tutto l'archivio con le regole attuali e scarta il rumore G.U.
  for (const [id, i] of byId) {
    if (i._ct == null) continue;
    if (i.source === 'gu-sg' && isGuNoise(i._ct)) { byId.delete(id); continue; }
    const areas = classify(i._ct, i._fa || []);
    i.areas = areas.length ? areas : ['generale'];
  }

  // pulizia archivio
  const minDate = daysAgo(KEEP_DAYS);
  let items = [...byId.values()].filter((i) => (i.date || '') >= minDate).sort(sortItems).slice(0, MAX_ARCHIVE);

  // spiegazioni AI (opzionali)
  const ai = await enrichWithAI(items, log);
  if (ai.enabled) log(`AI: ${ai.done} spiegazioni generate (${ai.model})`);

  // scrittura
  await mkdir(path.dirname(ARCHIVE), { recursive: true });
  await mkdir(API, { recursive: true });
  await writeFile(ARCHIVE, JSON.stringify({ updatedAt: now, items }, null, 1));
  await writeFile(STATUS_IN, JSON.stringify(state, null, 1));

  const meta = (extra = {}) => ({
    updatedAt: now,
    disclaimer: 'Rassegna automatica da fonti istituzionali. Fa fede il testo pubblicato dalla fonte ufficiale.',
    ...extra,
  });

  await writeFile(path.join(API, 'all.json'), JSON.stringify({ ...meta({ area: 'all' }), items: items.slice(0, ALL_LIMIT).map(pub) }));
  const areaIds = [...AREA_IDS, 'generale'];
  for (const a of areaIds) {
    const list = items.filter((i) => i.areas?.includes(a)).slice(0, PER_AREA).map(pub);
    await writeFile(path.join(API, `${a}.json`), JSON.stringify({ ...meta({ area: a, label: AREAS[a]?.label || 'Generale' }), items: list }));
  }
  // Profili degli studi clienti: un file per studio con le sue materie (config/studi.json)
  const studi = await readJson(path.join(ROOT, 'config', 'studi.json'), {});
  await mkdir(path.join(API, 'studi'), { recursive: true });
  for (const [slug, cfg] of Object.entries(studi)) {
    if (slug.startsWith('_') || !/^[a-z0-9-]+$/.test(slug)) continue;
    const aree = (cfg.aree || []).filter((a) => areaIds.includes(a));
    if (!aree.length) { log(`⚠ studio ${slug}: nessuna area valida`); continue; }
    const list = items.filter((i) => i.areas?.some((a) => aree.includes(a))).slice(0, PER_STUDIO).map(pub);
    await writeFile(path.join(API, 'studi', `${slug}.json`), JSON.stringify({
      ...meta({ studio: slug, nome: cfg.nome || slug }),
      aree: aree.map((a) => ({ id: a, label: AREAS[a]?.label || 'Novità normative' })),
      items: list,
    }));
  }

  const areasIndex = areaIds.map((a) => ({
    id: a, label: AREAS[a]?.label || 'Generale',
    count: items.filter((i) => i.areas?.includes(a)).length,
    url: `api/${a}.json`,
  }));
  await writeFile(path.join(API, 'areas.json'), JSON.stringify({ updatedAt: now, areas: areasIndex }, null, 1));
  await writeFile(path.join(API, 'status.json'), JSON.stringify({
    updatedAt: now, totalItems: items.length, ai,
    sources: Object.entries(state).map(([id, { memo, ...s }]) => ({ id, ...s })),
  }, null, 1));

  log(`Archivio: ${items.length} notizie. Per area: ${areasIndex.map((a) => `${a.id}=${a.count}`).join(', ')}`);

  // Allarme: fonte ferma da troppo tempo -> exit 1 così GitHub manda l'email di workflow fallito.
  // I JSON vengono comunque scritti (e committati dal workflow) prima di uscire.
  if (!offline) {
    const staleLimit = Date.now() - STALE_HOURS * 3600000;
    const stale = Object.entries(state).filter(([, s]) => s.lastError && (!s.lastOk || Date.parse(s.lastOk) < staleLimit));
    if (stale.length) {
      console.error(`ATTENZIONE: fonti ferme da oltre ${STALE_HOURS}h: ${stale.map(([id, s]) => `${id} (${s.lastError})`).join('; ')}`);
      process.exitCode = 2;
    }
    if (report.length && report.every((r) => r.lastError)) {
      console.error('ATTENZIONE: tutte le fonti hanno fallito in questo giro.');
      process.exitCode = 3;
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
