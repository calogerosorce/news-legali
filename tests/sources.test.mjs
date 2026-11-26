// Test dei parser sulle copie reali delle fonti (tests/fixtures).
// Avvio: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
process.env.NEWS_FIXTURES = FIX;
const S = await import('../scripts/lib/sources.mjs');
const { classify } = await import('../scripts/lib/areas.mjs');

function checkItems(items, min) {
  assert.ok(items.length >= min, `attese almeno ${min} notizie, trovate ${items.length}`);
  const ids = new Set();
  for (const i of items) {
    assert.ok(i.id && !ids.has(i.id), `id unico: ${i.id}`); ids.add(i.id);
    assert.match(i.url, /^https:\/\//, 'url https');
    assert.match(i.date, /^\d{4}-\d{2}-\d{2}$/, 'data ISO');
    assert.ok(i.title.length > 15, `titolo sensato: ${i.title}`);
    assert.ok(!/[<>]|&[a-z]+;/i.test(i.title + i.subtitle), `niente HTML/entità: ${i.title}`);
    assert.ok(i.areas.length >= 1, 'almeno un\'area');
    assert.ok(i.kind && i.kind.length <= 40, `tipo breve: ${i.kind}`);
  }
}

test('Cassazione penale', async () => {
  const items = await S.cassazionePenale.fetch();
  checkItems(items, 8);
  assert.ok(items.every((i) => i.areas.includes('penale')));
  const t = items.find((i) => i.id === 'cass-SZP53854');
  assert.ok(t, 'sentenza 39323 presente');
  assert.ok(!/Applicabilità\.\s+Libertà/.test(t.title), 'massima non duplicata');
  assert.match(t.subtitle, /Prima sezione penale/);
});

test('Cassazione civile', async () => {
  const items = await S.cassazioneCivile.fetch();
  checkItems(items, 8);
  assert.ok(items.every((i) => !/^\d+\.\s+[A-Z]/.test(i.title)), 'senza prefissi del massimario');
});

test('Corte di giustizia UE: solo decisioni', async () => {
  const items = await S.curiaUE.fetch();
  checkItems(items, 3);
  assert.ok(items.every((i) => /UE/.test(i.kind)));
  assert.ok(!items.some((i) => /impegno solenne/i.test(i.title)), 'cerimonie escluse');
});

test('Agenzia delle Entrate', async () => {
  checkItems(await S.agenziaEntrate.fetch(), 10);
});

test('Gazzetta Ufficiale SG (pagine 30 giorni): filtra il rumore', async () => {
  const memo = {};
  const items = await S.gazzettaSG.fetch({ memo });
  checkItems(items, 3);
  assert.ok(!items.some((i) => /colli berici|disciplinare/i.test(i.title)), 'niente DOP/consorzi');
  const pct = items.find((i) => i.id === 'gu-26A06999');
  assert.ok(pct && pct.areas.includes('professione'), 'decreto Giustizia su PCT in professione');
  assert.equal(pct.kind, 'Decreto ministeriale');
  assert.match(pct.subtitle, /^Ministero della giustizia - decreto 10 novembre 2026 — G\.U\. Serie Generale n\. 274 del 24-11-2026$/);
  const legge = items.find((i) => i.id === 'gu-26G00235');
  assert.equal(legge.kind, 'Legge');
  assert.equal(legge.url, 'https://www.gazzettaufficiale.it/eli/id/2026/11/24/26G00235/SG');
  assert.equal(memo.issues.length, 1, 'numero elaborato memorizzato');
});

test('Gazzetta Ufficiale SG (riserva RSS)', async () => {
  const { gazzettaSG } = S;
  const items = await gazzettaSG.fetch.call({ ...gazzettaSG, url: 'x' }, { memo: {} }); // pagine ok
  assert.ok(items.length);
  // simula pagine 30giorni non raggiungibili -> usa RSS
  const rssOnly = await (async () => {
    const orig = process.env.NEWS_FIXTURES;
    const { mkdtemp, copyFile } = await import('node:fs/promises');
    const os = await import('node:os');
    const dir = await mkdtemp(path.join(os.tmpdir(), 'nl-'));
    await copyFile(path.join(FIX, 'gu-sg.xml'), path.join(dir, 'gu-sg.xml'));
    process.env.NEWS_FIXTURES = dir;
    try { return await gazzettaSG.fetch({ memo: {} }); } finally { process.env.NEWS_FIXTURES = orig; }
  })();
  const forense = rssOnly.find((i) => /ordinamento forense/i.test(i.title));
  assert.ok(forense && forense.areas.includes('professione'));
  assert.match(forense.subtitle, /^Decreto legislativo 25 novembre 2026, n\. 216/);
  assert.ok(!rssOnly.some((i) => /medicinal|prosciutto|nomina/i.test(i.title)), 'niente farmaci/consorzi/nomine');
});

test('Corte costituzionale (G.U. 1ª S.S.): solo decisioni', async () => {
  const items = await S.gazzettaS1.fetch({ memo: {} });
  assert.equal(items.length, 2, 'solo le 2 sentenze, niente atti di promovimento');
  const adoz = items.find((i) => i.id === 'gu-T-260194');
  assert.ok(adoz.areas.includes('famiglia'), 'adozione -> famiglia');
  assert.match(adoz.title, /^Adozione e affidamento/);
  assert.match(adoz.title, /Disponibilità/, 'accenti corretti');
  assert.ok(!/\(T-260194\)|\.{3}/.test(adoz.title));
  assert.match(adoz.subtitle, /^Sentenza n\. 194 7 ottobre - 12 novembre 2026 — G\.U\. 1ª Serie Speciale n\. 46/);
  assert.ok(items.find((i) => i.id === 'gu-T-260196').areas.includes('penale'));
});

test('Arbitro Bancario Finanziario', async () => {
  const memo = {};
  const items = await S.abf.fetch({ memo });
  const coord = items.find((i) => i.id === 'abf-2026-9724');
  assert.ok(coord, 'decisione del Collegio di coordinamento presente');
  assert.match(coord.title, /carte di credito revolving/);
  assert.match(coord.url, /^https:\/\/www\.arbitrobancariofinanziario\.it\/decisioni\/2026\/10\/Dec-20261022-9724\.pdf$/);
  assert.equal(coord.date, '2026-10-27');
  const gruppo = items.find((i) => i.kind === 'Decisioni ABF');
  assert.ok(gruppo && /60 nuove decisioni/.test(gruppo.title), 'riepilogo del gruppo');
  assert.ok(items.every((i) => i.areas.includes('bancario')));
  // secondo giro: usa la memoria, stesso risultato
  const again = await S.abf.fetch({ memo });
  assert.equal(again.length, items.length);
});

test('classificazione', () => {
  assert.deepEqual(classify('Atti persecutori - Remissione della querela'), ['penale']);
  assert.ok(classify('Assegno divorzile e affidamento condiviso dei figli').includes('famiglia'));
  assert.ok(classify('Licenziamento per giusta causa del lavoratore').includes('lavoro'));
  assert.ok(classify('Ricorso al TAR contro il permesso di costruire').includes('amministrativo'));
  assert.ok(classify('Riforma dell\'ordinamento forense').includes('professione'));
  assert.deepEqual(classify('Attività derivativa e impostazione grafica'), []);
  assert.ok(!classify('Il tribunale ha deciso').includes('professione'), 'parola debole da sola non basta');
  assert.ok(classify('Opposizione a decreto ingiuntivo su contratto di conto corrente').includes('bancario'));
  assert.ok(!classify('Superbonus 110% - cessione del credito d\'imposta').includes('bancario'), 'crediti fiscali esclusi');
  assert.ok(classify('Costituzione di parte civile nel processo').includes('penale'));
});
