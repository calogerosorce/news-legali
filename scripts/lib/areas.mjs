// Aree di pratica e parole chiave per classificare le notizie.
// Le parole sono cercate (senza accenti, minuscolo) nel titolo + sommario.
// Prefisso "=" = parola intera (es. "=iva" non deve matchare "derivativa").
// Prefisso "!" = parola chiave forte (vale 2 punti: basta da sola anche nelle aree "deboli").

export const AREAS = {
  penale: {
    label: 'Penale',
    keywords: [
      'penale', 'penali', 'reato', 'reati', 'reati e pene', 'imputat', 'indagat',
      'pena detentiva', '=pene', 'carcer', 'detenut', 'detenzione', 'penitenziari',
      'misure cautelari', 'custodia cautelare', 'misure di sicurezza', 'liberta vigilata',
      'intercettazion', 'stupefacent', 'furto', 'rapina', 'truffa', 'omicidio', 'lesioni personali',
      'stalking', 'atti persecutori', 'maltrattament', 'violenza sessuale', 'querela',
      'riciclaggio', 'bancarotta', 'peculato', 'corruzione', 'concussione', 'estorsione',
      'usura', 'ricettazione', 'associazione mafiosa', 'associazione per delinquere',
      'sequestro preventivo', 'confisca', 'processo penale', 'codice penale',
      'procedura penale', 'pubblico ministero', 'giudice per le indagini', 'dibattimento',
      'patteggiamento', 'messa alla prova', 'reati tributari', 'guida in stato di ebbrezza',
      'omissione di soccorso', 'esecuzione penale', 'casellario giudiziale',
      '!parte civile', '!parti civili', 'persona offesa', '!vittima del reato', '!vittime di reato',
      '!risarcimento del danno da reato', '!costituzione di parte civile',
    ],
  },
  civile: {
    label: 'Civile',
    keywords: [
      'civile', 'contratto', 'contratti', 'contrattual', 'obbligazion', '!responsabilita civile',
      'risarcimento', 'danno non patrimoniale', 'danno biologico', 'proprieta', 'possesso',
      '!condominio', 'condomin', '!locazione', 'locazioni', 'sfratto', '!successione', 'successioni',
      'eredita', 'ereditari', 'testament', 'donazione', '!usucapione', 'servitu',
      'esecuzione forzata', '!pignoramento', 'espropriazione forzata', 'ipoteca',
      'fondo patrimoniale', 'responsabilita patrimoniale', '!liquidazione giudiziale',
      'crisi d\'impresa', 'crisi di impresa', 'fallimento', 'fallimentare', 'concordato',
      'sovraindebitamento', 'consumatore', 'consumatori', 'clausole abusive', 'garanzia',
      'assicurazion', 'sinistro stradale', '!responsabilita medica', 'responsabilita sanitaria',
      'colpa medica', 'diffamazione a mezzo', 'diritto d\'autore', 'marchio', 'brevett',
      'societa', 'societario', 'appalto privato', 'compravendita', 'mutuo', '=banca',
      'bancari', 'intermediari finanziari', 'protezione dei dati', 'privacy', '!processo civile',
      '!codice civile', '!procedura civile', 'mediazione civile',
    ],
  },
  bancario: {
    label: 'Bancario e finanziario',
    keywords: [
      '!contratti bancari', '!contratto bancario', '!rapporti bancari', '!rapporto bancario', '!conto corrente',
      '!conti correnti', '=mutuo', '!contratto di mutuo', '=mutui', '!decreto ingiuntivo', '!cessione del credito',
      '!cessione dei crediti', '!cartolarizzazion', '!fideiussion', '!anatocismo', '!usura bancaria',
      '!tasso usurario', '!interessi usurari', 'interessi moratori', '!commissione di massimo scoperto',
      '!intermediari finanziari', '!intermediario finanziario', '!arbitro bancario finanziario', '=abf',
      '!credito al consumo', '!centrale rischi', '=crif', '!leasing', '=banca', '=banche', 'bancari',
      '!istituto di credito', '!istituti di credito', '!servizi di investimento', '=consob',
      '!testo unico bancario', '!testo unico della finanza', 'titoli di credito', '=assegno bancario',
      '=cambiale', '!carta di credito', '!carte di pagamento', '!servizi di pagamento', '!phishing',
      '!sovraindebitamento', '!segnalazione alla centrale', '!estinzione anticipata', '!piano di ammortamento',
      '!tassi effettivi globali medi', '!legge sull\'usura', '!usura', '!tasso soglia', '!credito ai consumatori',
      '!contratti di credito', '!garanzia autonoma', '!polizza fideiussoria', '!opposizione a decreto ingiuntivo',
    ],
  },
  famiglia: {
    label: 'Famiglia e minori',
    keywords: [
      'famiglia', 'familiar', '!separazione personale', '!separazione dei coniugi', '!separazione consensuale',
      '!divorzio', '!divorzil', '!scioglimento del matrimonio', '!cessazione degli effetti civili',
      'matrimonio', 'coniug', '!affidamento dei figli', '!affidamento condiviso', '!adozione e affidamento',
      '!assegno di mantenimento', '!assegno divorzile', '!casa familiare', 'mantenimento',
      '=minori', '!minorenn', '!filiazione', '=figli', '=figlio', '=figlia', '!responsabilita genitoriale', 'genitori',
      '!adozione di minori', '!adozione del minore', '!adozione di maggiorenni', '!adozioni internazionali',
      '!adozione in casi particolari', '!stato di adottabilita', 'adottiv', 'adottand',
      '!unione civile', '!unioni civili', '!unite civilmente', 'convivenz',
      '!violenza domestica', '!codice rosso', '!tribunale per i minorenni',
      '!tribunale per le persone, per i minorenni e per le famiglie', '!amministrazione di sostegno',
      '!amministratore di sostegno', 'interdizione', '!tutela del minore', '!sottrazione internazionale',
      'maltrattamenti contro familiari',
    ],
  },
  lavoro: {
    label: 'Lavoro e previdenza',
    keywords: [
      'lavoro', 'lavorator', 'lavoratrice', 'licenziament', 'retribuzion', 'stipendio',
      'contratto collettivo', 'ccnl', 'previdenz', 'pension', '=inps', '=inail',
      'infortunio sul lavoro', 'infortuni sul lavoro', 'malattia professionale',
      'sicurezza sul lavoro', 'sicurezza nei luoghi di lavoro', 'sindacal', 'sciopero',
      'rapporto di lavoro', 'datore di lavoro', 'dipendent', 'lavoro subordinato', 'mansioni',
      'demansionamento', 'mobbing', 'trattamento di fine rapporto', '=tfr', 'contratto a termine',
      'somministrazione di lavoro', 'cassa integrazione', 'naspi', 'pubblico impiego',
      'impiego pubblico', 'assistenza sociale', 'previdenza e assistenza', 'contributi previdenziali',
    ],
  },
  tributario: {
    label: 'Tributario e fiscale',
    keywords: [
      'tribut', 'fiscal', 'fisco', '=irpef', '=ires', '=irap', '=iva', '=imposta', 'imposte',
      'imposte e tasse', 'tasse', 'avviso di accertamento', 'accertamento fiscale', 'accertamento tributario', 'accertamento con adesione', 'agenzia delle entrate', 'riscossione',
      'cartella di pagamento', 'cartelle', 'contribuent', 'interpello', 'dichiarazione dei redditi',
      'detrazion', 'deduzion', 'credito d\'imposta', 'crediti d\'imposta',
      'agevolazion', 'dogan', 'accise', 'catast', '=imu', '=tari', 'rottamazione',
      'definizione agevolata', 'concordato preventivo biennale', 'giustizia tributaria',
      'corte di giustizia tributaria', 'sanzioni tributarie', 'd.p.r. n. 600', 'd.p.r. n. 602',
      'd.p.r. n. 633', 'statuto del contribuente', 'zes unica', 'transfer pricing',
    ],
  },
  amministrativo: {
    label: 'Amministrativo',
    keywords: [
      'amministrativ', 'pubblica amministrazione', 'pubbliche amministrazioni', '!appalti pubblici',
      '!contratti pubblici', '!codice dei contratti', 'gara d\'appalto', 'procedura di gara',
      'concessione', 'concessioni demaniali', '!=tar', '!consiglio di stato', 'urbanistic',
      'edilizi', 'edilizia', '!permesso di costruire', 'condono', '!abuso edilizio', 'espropri',
      '!procedimento amministrativo', '!accesso agli atti', 'accesso civico', 'trasparenza',
      'enti locali', '=comuni', '=regioni', 'autorizzazione', 'sanzioni amministrative',
      '!codice della strada', 'responsabilita erariale', '!corte dei conti', 'ambiente',
      'ambientale', 'rifiuti', 'paesaggistic', 'beni culturali', '!interdittiva antimafia',
    ],
  },
  immigrazione: {
    label: 'Immigrazione e cittadinanza',
    keywords: [
      'immigrazion', 'stranier', 'straniero', 'cittadinanza', 'permesso di soggiorno',
      'protezione internazionale', 'protezione speciale', 'richiedent', 'diritto di asilo', 'domanda di asilo', '=asilo politico', 'rifugiat',
      'espulsione', 'rimpatri', 'trattenimento', 'ricongiungimento familiare', 'visto d\'ingresso',
      'apolid',
    ],
  },
  professione: {
    label: 'Professione forense e giustizia',
    keywords: [
      '!avvocat', '!professione forense', '!ordinamento forense', '!consiglio nazionale forense',
      '!ordine degli avvocati', '!ordinamento giudiziario', 'magistrat', 'uffici giudiziari',
      'giustizia', '!processo telematico', 'deposito telematico', 'portale telematico',
      '!negoziazione assistita', 'mediazione', 'arbitrato', '!spese di giustizia',
      '!contributo unificato', '!patrocinio a spese dello stato', '!gratuito patrocinio',
      'compensi', '!parametri forensi', 'tribunale', 'tribunali', 'corte d\'appello',
      'giudice di pace', 'geografia giudiziaria', '!ministero della giustizia', 'notifiche',
      'avvocato e procuratore', 'udienza', 'cartabia',
    ],
  },
  ue: {
    label: 'Diritto UE',
    keywords: [
      'unione europea', 'corte di giustizia dell\'unione', 'diritto dell\'unione',
      'direttiva (ue)', 'regolamento (ue)', 'direttiva ue', 'regolamento ue', 'trattato',
      'carta dei diritti fondamentali', 'cedu', 'corte europea dei diritti',
    ],
  },
};

export const AREA_IDS = Object.keys(AREAS);

function norm(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'");
}

const COMPILED = Object.fromEntries(
  Object.entries(AREAS).map(([id, a]) => [
    id,
    a.keywords.map((k) => {
      const strong = k.startsWith('!');
      if (strong) k = k.slice(1);
      const whole = k.startsWith('=');
      const w = norm(whole ? k.slice(1) : k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return { re: new RegExp(whole ? `\\b${w}\\b` : `(^|[^a-z])${w}`, 'i'), pts: strong ? 2 : 1 };
    }),
  ]),
);

/** Ritorna {area: punteggio} per le aree che matchano. */
export function scoreAreas(text) {
  const t = norm(text);
  const out = {};
  for (const [id, regs] of Object.entries(COMPILED)) {
    let n = 0;
    for (const r of regs) if (r.re.test(t)) n += r.pts;
    if (n) out[id] = n;
  }
  return out;
}

/**
 * Classifica: aree forzate dalla fonte + aree trovate dalle parole chiave.
 * Le aree "deboli" (professione, amministrativo, civile) richiedono 2 match
 * se non sono forzate, per evitare falsi positivi (es. "tribunale" ovunque).
 */
// Esclusioni: se il testo parla di questo, l'area non si applica (falsi positivi noti).
const EXCLUDE = {
  bancario: /credit[oi] d'?\s?imposta|superbonus|bonus edilizi|crediti fiscali/i,
};

export function classify(text, forced = []) {
  const scores = scoreAreas(text);
  for (const [id, re] of Object.entries(EXCLUDE)) if (re.test(text) && !forced.includes(id)) delete scores[id];
  const weak = { professione: 2, amministrativo: 2, civile: 2, famiglia: 2, ue: 1 };
  const areas = new Set(forced);
  for (const [id, n] of Object.entries(scores)) {
    if (n >= (weak[id] || 1)) areas.add(id);
  }
  return [...areas];
}
