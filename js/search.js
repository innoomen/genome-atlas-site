/* Поиск без сервера: темы, термины глоссария, белки; русские и английские названия; словоформы */
(function (WS) {
  'use strict';

  const ENDINGS = 'аеёиоуыэюяйь';
  const words = s => (String(s || '').toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []);

  function stem(t) {
    if (!/[а-яё]/.test(t) || t.length < 5) return t;
    let cut = 0;
    while (cut < 2 && t.length > 3 && ENDINGS.indexOf(t[t.length - 1]) >= 0) { t = t.slice(0, -1); cut++; }
    return t;
  }

  let docs = [];
  const TYPE = { topic: 'Тема', glossary: 'Термин', bestiary: 'Белок' };

  function build() {
    const D = WS.data;
    docs = [];
    D.topics.forEach(t => docs.push(mk('topic', t.id, t.title, [t.title_en], t.summary,
      ['basic', 'advanced', 'clinical'].map(k => WS.md.plain(t.sections[k])).join(' '), '#/topic/' + t.id,
      (D.blockById[t.blockId] || {}).title)));
    D.terms.forEach(e => docs.push(mk('glossary', e.id, e.title, [e.en].concat(e.syn), WS.md.plain(e.def), '', e.url)));
    D.proteins.forEach(e => docs.push(mk('bestiary', e.id, e.title, [e.en, e.gene].concat(e.syn),
      WS.md.plain(e.abilities), WS.md.plain(e.weaknesses + ' ' + e.role), e.url, e.cls)));
  }

  function mk(type, id, title, alt, summary, body, url, extra) {
    return {
      type, id, title, alt: alt.filter(Boolean), summary, url, extra: extra || '',
      wTitle: words(title), wAlt: words(alt.join(' ')), wSum: words(summary), wBody: words(body)
    };
  }

  const has = (ws, st) => ws.some(w => w.startsWith(st));

  function query(q, limit) {
    const tokens = words(q);
    if (!tokens.length) return [];
    const stems = tokens.map(stem);
    const out = [];
    docs.forEach(d => {
      let score = 0;
      for (const st of stems) {
        let s = 0;
        if (has(d.wTitle, st)) s = 10;
        else if (has(d.wAlt, st)) s = 8;
        else if (has(d.wSum, st)) s = 3;
        else if (has(d.wBody, st)) s = 1;
        if (!s) return;
        score += s;
      }
      // точное совпадение всего названия — выше
      if (d.title.toLowerCase() === q.trim().toLowerCase()) score += 20;
      if (d.type === 'topic') score += 0.5;
      out.push({ d, score });
    });
    out.sort((a, b) => b.score - a.score || a.d.title.localeCompare(b.d.title, 'ru'));
    return out.slice(0, limit || 50).map(x => x.d);
  }

  WS.search = { build, query, TYPE };
})(window.WS = window.WS || {});
