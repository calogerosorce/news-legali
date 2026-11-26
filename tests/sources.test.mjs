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

test('Gazzetta Ufficiale SG: filtra il rumore', async () => {
  const items = await S.gazzettaSG.fetch();
  checkItems(items, 1);
  assert.ok(!items.some((i) => /medicinal|prosciutto|nomina/i.test(i.title)), 'niente farmaci/consorzi/nomine');
  const forense = items.find((i) => /ordinamento forense/i.test(i.title));
  if (forense) {
    assert.ok(forense.areas.includes('professione'));
    assert.match(forense.subtitle, /^Decreto legislativo 25 novembre 2026, n\. 216/);
  }
});

test('GU 1ª serie speciale (se fixture presente)', { skip: !existsSync(path.join(FIX, 'gu-s1.xml')) }, async () => {
  const items = await S.gazzettaS1.fetch();
  assert.ok(!items.some((i) => /promovimento|ricorso/i.test(i.subtitle)));
});

test('classificazione', () => {
  assert.deepEqual(classify('Atti persecutori - Remissione della querela'), ['penale']);
  assert.ok(classify('Assegno divorzile e affidamento condiviso dei figli').includes('famiglia'));
  assert.ok(classify('Licenziamento per giusta causa del lavoratore').includes('lavoro'));
  assert.ok(classify('Ricorso al TAR contro il permesso di costruire').includes('amministrativo'));
  assert.ok(classify('Riforma dell\'ordinamento forense').includes('professione'));
  assert.deepEqual(classify('Attività derivativa e impostazione grafica'), []);
  assert.ok(!classify('Il tribunale ha deciso').includes('professione'), 'parola debole da sola non basta');
});
