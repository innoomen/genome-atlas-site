/* Автоссылки: первое упоминание термина/белка в теме становится ссылкой (как в Википедии) */
(function (WS) {
  'use strict';

  const CYR = /[а-яё]/i;
  const ENDINGS = 'аеёиоуыэюяйь';
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const isAcronym = f => f === f.toUpperCase() && /[A-ZА-ЯЁ]/.test(f);

  // регулярное выражение для одной формы слова с учётом русских окончаний
  function wordPattern(w) {
    if (!CYR.test(w)) {
      const plural = /^[a-z]{4,}$/i.test(w) && !isAcronym(w) ? 's?' : '';
      return escRe(w) + plural;
    }
    const letters = w.replace(/[^а-яё]/gi, '').length;
    if (letters <= 4) {
      let s = w;
      if (!isAcronym(w) && s.length > 2 && 'аяоеь'.indexOf(s[s.length - 1].toLowerCase()) >= 0) s = s.slice(0, -1);
      return escRe(s) + '(?:а|у|е|ы|и|о|ом|ов|ам|ах|ой|ами|ей|ью)?';
    }
    let stem = w, cut = 0;
    while (cut < 2 && ENDINGS.indexOf(stem[stem.length - 1].toLowerCase()) >= 0 && stem.length > 3) { stem = stem.slice(0, -1); cut++; }
    return escRe(stem) + '[а-яё]{0,4}';
  }

  function formPattern(form) {
    return form.trim().split(/\s+/).map(wordPattern).join('\\s+');
  }

  const entries = [];
  let regex = null;
  let groupToEntry = [];

  function build() {
    const D = WS.data;
    const all = D.terms.concat(D.proteins);
    const seen = new Set();
    const forms = [];
    all.forEach(e => {
      [e.title, e.en].concat(e.syn).forEach(f => {
        if (!f) return;
        const k = f.toLowerCase();
        if (seen.has(k)) return;
        seen.add(k);
        forms.push({ form: f, entry: e });
      });
    });
    forms.sort((a, b) => b.form.length - a.form.length);
    groupToEntry = forms;
    const src = forms.map(f => '(' + formPattern(f.form) + ')').join('|');
    regex = src ? new RegExp('(?<![\\p{L}\\p{N}_])(?:' + src + ')(?![\\p{L}\\p{N}_])', 'giu') : null;
  }

  function match(m) {
    for (let i = 1; i < m.length; i++) {
      if (m[i] !== undefined) {
        const f = groupToEntry[i - 1];
        if (isAcronym(f.form) && m[i] !== f.form) return null; // "ДНК" — только заглавными
        return f.entry;
      }
    }
    return null;
  }

  function shortDef(e) {
    const t = WS.md.plain(e.def || '');
    const first = t.split(/(?<=[.!?])\s/)[0] || t;
    return first.length > 180 ? first.slice(0, 177) + '…' : first;
  }

  const SKIP = 'A,H1,H2,H3,H4,H5,H6,CODE,PRE,BUTTON,FIGCAPTION,SCRIPT,STYLE,SUMMARY,SVG,TH';

  /* Расставляет ссылки внутри root. seen — Set ключей "kind:id" уже оформленных ссылок;
     skipKeys — что не ссылать вообще (например, страница самого термина). */
  function apply(root, seen, skipKeys) {
    if (!regex) return;
    const skip = new Set(SKIP.split(','));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        for (let p = n.parentNode; p && p !== root; p = p.parentNode) {
          if (skip.has(p.nodeName.toUpperCase()) || (p.dataset && p.dataset.noautolink !== undefined)) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const text = node.nodeValue;
      regex.lastIndex = 0;
      let m, last = 0, frag = null;
      while ((m = regex.exec(text))) {
        const e = match(m);
        if (!e) continue;
        const k = e.kind + ':' + e.id;
        if (seen.has(k) || (skipKeys && skipKeys.has(k))) continue;
        seen.add(k);
        frag = frag || document.createDocumentFragment();
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const a = document.createElement('a');
        a.href = e.url;
        a.className = 'term ' + (e.kind === 'bestiary' ? 'term-prot' : 'term-gl');
        a.title = shortDef(e);
        a.textContent = m[0];
        frag.appendChild(a);
        last = m.index + m[0].length;
      }
      if (frag) {
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    });
  }

  /* Где используется каждый термин: обходим сырой текст тем */
  let usage = null;
  function usageMap() {
    if (usage) return usage;
    usage = {};
    if (!regex) return usage;
    WS.data.topics.forEach(t => {
      const raw = ['basic', 'advanced', 'clinical'].map(k => WS.md.plain(t.sections[k] || '')).join(' \n ');
      const found = new Set();
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(raw))) {
        const e = match(m);
        if (e) found.add(e.kind + ':' + e.id);
      }
      found.forEach(k => { (usage[k] = usage[k] || []).push(t); });
    });
    return usage;
  }

  WS.autolink = { build, apply, usageOf: e => usageMap()[e.kind + ':' + e.id] || [], shortDef };
})(window.WS = window.WS || {});
