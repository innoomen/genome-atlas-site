/* Модель данных: разбирает bundle.js (собранный из файлов контента) */
(function (WS) {
  'use strict';
  const M = WS.md;
  const bundle = window.WS_BUNDLE || { files: {}, built: '' };
  const files = bundle.files;

  const arr = v => (Array.isArray(v) ? v : v ? [v] : []);
  const num = (v, d) => (isNaN(parseFloat(v)) ? d : parseFloat(v));
  const byOrder = (a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ru');

  const blocks = [];
  const topics = [];
  const terms = [];
  const proteins = [];
  const quizzes = {};
  const animations = {};
  const animationTitles = {};

  Object.keys(files).sort().forEach(path => {
    const text = files[path];
    let m;
    if ((m = path.match(/^content\/([^/]+)\/_block\.md$/))) {
      const { meta, body } = M.parseFrontmatter(text);
      blocks.push({
        id: m[1], number: num(meta.order, 99), order: num(meta.order, 99),
        title: meta.title || m[1], title_en: meta.title_en || '', summary: meta.summary || '',
        status: meta.status || 'ready', planned: arr(meta.planned), intro: body, topics: []
      });
    } else if ((m = path.match(/^content\/([^/]+)\/([^/]+)\.md$/))) {
      const { meta, body } = M.parseFrontmatter(text);
      const s = M.sections(body);
      topics.push({
        id: meta.id || m[2], blockId: m[1], path,
        title: meta.title || m[2], title_en: meta.title_en || '',
        order: num(meta.order, 99), summary: meta.summary || '', updated: meta.updated || '',
        animation: arr(meta.animation), videos: meta.videos || '', related: arr(meta.related), exclude: arr(meta.exclude),
        sections: s, questions: []
      });
    } else if ((m = path.match(/^glossary\/([^/]+)\.md$/))) {
      const { meta, body } = M.parseFrontmatter(text);
      terms.push({
        kind: 'glossary', id: m[1], title: meta.term || m[1], en: meta.term_en || '',
        syn: arr(meta.synonyms), related: arr(meta.related), def: body, url: '#/glossary/' + m[1]
      });
    } else if ((m = path.match(/^bestiary\/([^/]+)\.md$/))) {
      const { meta, body } = M.parseFrontmatter(text);
      const h = M.byHeading(body);
      proteins.push({
        kind: 'bestiary', id: m[1], title: meta.name || m[1], en: meta.name_en || '',
        cls: meta.class || '', habitat: meta.habitat || '', syn: arr(meta.synonyms),
        image: meta.image || '', gene: meta.gene || '', related: arr(meta.related),
        // "подпись:UniProt-код" -> ссылки на AlphaFold DB
        alphafold: arr(meta.alphafold).map(s => { const i = s.lastIndexOf(':'); return { label: s.slice(0, i).trim(), id: s.slice(i + 1).trim() }; }).filter(a => a.id),
        abilities: h['способности'] || '', weaknesses: h['уязвимости'] || '',
        role: h['роль в гематологии'] || '', def: h['способности'] || body, url: '#/bestiary/' + m[1]
      });
    } else if ((m = path.match(/^quizzes\/([^/]+)\.md$/))) {
      quizzes[m[1]] = WS.quiz ? WS.quiz.parse(text, m[1]) : [];
    } else if ((m = path.match(/^media\/animations\/([^/]+)\.svg$/))) {
      animations[m[1]] = text;
      const tm = text.match(/<title[^>]*>([^<]*)<\/title>/);
      const title = tm ? tm[1].replace(/^Анимация:\s*/i, '') : '';
      animationTitles[m[1]] = title.charAt(0).toUpperCase() + title.slice(1);
    }
  });

  blocks.sort((a, b) => a.order - b.order);
  const blockById = {};
  blocks.forEach(b => { blockById[b.id] = b; });
  topics.forEach(t => { t.questions = quizzes[t.id] || []; });
  // глобальный порядок: по порядку блоков, затем по порядку тем
  topics.sort((a, b) => {
    const ba = blockById[a.blockId], bb = blockById[b.blockId];
    return ((ba ? ba.order : 99) - (bb ? bb.order : 99)) || byOrder(a, b);
  });
  topics.forEach(t => { const b = blockById[t.blockId]; if (b) b.topics.push(t); });
  terms.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  proteins.sort((a, b) => a.title.localeCompare(b.title, 'ru'));

  const topicById = {}, termById = {}, proteinById = {};
  topics.forEach(t => { topicById[t.id] = t; });
  terms.forEach(t => { termById[t.id] = t; });
  proteins.forEach(p => { proteinById[p.id] = p; });

  WS.data = {
    built: bundle.built, blocks, topics, terms, proteins, quizzes, animations, animationTitles,
    blockById, topicById, termById, proteinById,
    hasContent: topics.length > 0
  };
})(window.WS = window.WS || {});
