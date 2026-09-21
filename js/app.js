/* Приложение: маршрутизация и экраны */
(function (WS) {
  'use strict';
  const D = WS.data, M = WS.md, esc = M.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const main = $('#main');

  /* ---------- хранилище настроек читателя (только в браузере) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  let level = store.get('ws.level', 'basic') === 'advanced' ? 'advanced' : 'basic';
  let clinical = store.get('ws.clinical', '0') === '1';

  /* ---------- подписи интерфейса ---------- */
  const LABELS = {
    block: 'Блок', blocks: 'Блоки', quizTitle: 'Проверьте себя', quizStart: 'Начать тест',
    result: (s, t, r) => r === 1 ? 'Отличный результат — все ответы верны.' : r >= 0.8 ? 'Хороший результат. Загляните в пояснения к ошибкам.' : r >= 0.6 ? 'Неплохо, но есть что повторить.' : 'Стоит перечитать тему и попробовать ещё раз.'
  };
  const L = () => LABELS;

  const plural = (n, f) => { const a = n % 100, b = n % 10; return f[a > 10 && a < 20 ? 2 : b === 1 ? 0 : b >= 2 && b <= 4 ? 1 : 2]; };
  const fmtDate = s => { const d = new Date(s); return isNaN(d) ? esc(s) : d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }); };
  const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  const firstSentence = md => { const t = M.plain(md); return truncate(t.split(/(?<=[.!?])\s/)[0] || t, 200); };

  // светлая / тёмная тема: выбор читателя или настройка системы
  let mode = document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light';

  function applyTheme() {
    const root = document.documentElement;
    root.dataset.mode = mode;
    const m = $('#mode-toggle');
    m.textContent = mode === 'dark' ? '☀️ Светлая' : '🌙 Тёмная';
    m.setAttribute('aria-pressed', mode === 'dark');
    m.title = mode === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему';
  }

  /* ---------- общие фрагменты ---------- */
  function crumbs(list) {
    return '<nav class="crumbs" aria-label="Хлебные крошки">' + list.map((c, i) =>
      i < list.length - 1 ? '<a href="' + c[0] + '">' + esc(c[1]) + '</a><span aria-hidden="true">›</span>' : '<span aria-current="page">' + esc(c[1]) + '</span>').join('') + '</nav>';
  }

  function blockLabel(b) { return L().block + ' ' + b.number; }

  function quizBadge(t) {
    const r = WS.quiz.load(t.id);
    return r ? '<span class="badge badge-ok" title="Лучший результат в тесте">✓ ' + r.best + '/' + r.total + '</span>' : '';
  }

  function chips(items) {
    return items.length ? '<ul class="chips">' + items.map(i => '<li><a href="' + i.url + '">' + esc(i.title) + '</a></li>').join('') + '</ul>' : '';
  }

  function setTitle(t) { document.title = (t ? t + ' — ' : '') + 'Атлас генома'; }

  /* ---------- главная ---------- */
  function viewHome() {
    setTitle('');
    const cards = D.blocks.map(b => {
      const soon = b.status === 'soon' || !b.topics.length;
      return '<a class="card block-card' + (soon ? ' is-soon' : '') + '" href="#/block/' + b.id + '">' +
        '<span class="block-num">' + b.number + '</span>' +
        '<h3>' + esc(b.title) + '</h3>' + (b.title_en ? '<p class="en">' + esc(b.title_en) + '</p>' : '') +
        '<p>' + esc(b.summary) + '</p>' +
        '<p class="card-meta">' + (soon ? '<span class="badge">Скоро</span>' : '<span class="badge badge-ready">' + b.topics.length + ' ' + plural(b.topics.length, ['тема', 'темы', 'тем']) + '</span>') + '</p></a>';
    }).join('');
    const nb = D.blocks.length;
    const extra =
      '<a class="card block-card" href="#/glossary"><span class="block-num">' + (nb + 1) + '</span><h3>Глоссарий</h3><p class="en">Glossary</p><p>Определения всех терминов в алфавитном порядке, с английскими названиями и связями.</p><p class="card-meta"><span class="badge badge-ready">' + D.terms.length + ' ' + plural(D.terms.length, ['термин', 'термина', 'терминов']) + '</span></p></a>' +
      '<a class="card block-card" href="#/bestiary"><span class="block-num">' + (nb + 2) + '</span><h3>Бестиарий белков</h3><p class="en">Protein bestiary</p><p>Карточки белков и ферментов: среда обитания, способности, уязвимости и роль в гематологии.</p><p class="card-meta"><span class="badge badge-ready">' + D.proteins.length + ' ' + plural(D.proteins.length, ['карточка', 'карточки', 'карточек']) + '</span></p></a>';

    main.innerHTML =
      '<section class="hero"><h1>Атлас генома</h1>' +
      '<p class="lead">Открытый справочник по молекулярной генетике: от структуры ДНК до клиники в гематологии. Для школьников, студентов, ординаторов и врачей.</p>' +
      '<form class="hero-search" id="hero-search"><label class="sr-only" for="hq">Поиск</label><input id="hq" type="search" placeholder="Например: репликация, нуклеосома, polymerase"><button class="btn btn-primary">Найти</button></form></section>' +
      '<section aria-labelledby="blocks-h"><h2 id="blocks-h">' + L().blocks + '</h2><div class="grid">' + cards + extra + '</div></section>';
    $('#hero-search').addEventListener('submit', e => { e.preventDefault(); goSearch($('#hq').value); });
  }

  /* ---------- блок ---------- */
  function viewBlock(id) {
    const b = D.blockById[id];
    if (!b) return view404();
    setTitle(b.title);
    const soon = !b.topics.length;
    let body;
    if (!soon) {
      body = '<ol class="topic-list">' + b.topics.map((t, i) =>
        '<li><a class="card topic-card" href="#/topic/' + t.id + '"><span class="topic-num">' + (i + 1) + '</span><span class="topic-txt"><strong>' + esc(t.title) + '</strong>' +
        (t.title_en ? ' <span class="en">' + esc(t.title_en) + '</span>' : '') + '<br><span class="muted">' + esc(t.summary) + '</span></span>' + quizBadge(t) + '</a></li>').join('') + '</ol>';
    } else {
      body = '<div class="soon-box"><p><span class="badge">Скоро</span> Этот блок ещё в работе.</p>' +
        (b.planned.length ? '<p>Запланированные темы:</p><ul>' + b.planned.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' : '') + '</div>';
    }
    main.innerHTML = crumbs([['#/', 'Главная'], [null, blockLabel(b)]]) +
      '<header class="page-head"><p class="eyebrow">' + esc(blockLabel(b)) + '</p><h1>' + esc(b.title) + '</h1>' +
      (b.title_en ? '<p class="en">' + esc(b.title_en) + '</p>' : '') + '<p class="lead">' + esc(b.summary) + '</p></header>' +
      (b.intro ? '<div class="prose">' + M.render(b.intro) + '</div>' : '') + body;
  }

  /* ---------- тема ---------- */
  function viewTopic(id) {
    const t = D.topicById[id];
    if (!t) return view404();
    setTitle(t.title);
    const b = D.blockById[t.blockId];
    const s = t.sections;
    const i = D.topics.indexOf(t);
    const prev = D.topics[i - 1], next = D.topics[i + 1];
    const related = t.related.map(r => D.topicById[r]).filter(Boolean).map(x => ({ url: '#/topic/' + x.id, title: x.title }));

    const empty = txt => '<p class="muted">' + txt + '</p>';
    const noAnim = t.animation.length === 1 && t.animation[0] === 'none';
    const anims = t.animation.filter(n => D.animations[n]);

    main.innerHTML =
      crumbs([['#/', 'Главная'], ['#/block/' + b.id, blockLabel(b)], [null, t.title]]) +
      '<header class="page-head"><h1>' + esc(t.title) + '</h1>' + (t.title_en ? '<p class="en">' + esc(t.title_en) + '</p>' : '') +
      '<p class="lead">' + esc(t.summary) + '</p></header>' +

      '<div class="topic" id="topic" data-level="' + level + '" data-clinical="' + (clinical ? '1' : '0') + '">' +
      '<div class="layerbar" role="group" aria-label="Уровень изложения"><span class="layerbar-label">Слой:</span>' +
      '<div class="seg" role="radiogroup" aria-label="Слой глубины">' +
      '<button type="button" role="radio" data-level="basic" aria-checked="' + (level === 'basic') + '">Базовый</button>' +
      '<button type="button" role="radio" data-level="advanced" aria-checked="' + (level === 'advanced') + '">Продвинутый</button></div>' +
      '<label class="switch"><input type="checkbox" id="clin-toggle"' + (clinical ? ' checked' : '') + '><span>Клинический слой</span></label></div>' +

      '<article class="article prose">' +
      '<section class="layer layer-basic"><div class="md" data-md>' + M.render(s.basic || '') + '</div></section>' +
      '<section class="layer layer-advanced"><h2 class="layer-title"><span class="tag tag-adv">Продвинутый слой</span></h2><div class="md" data-md>' + M.render(s.advanced || '') + '</div></section>' +
      '</article>' +

      '<section class="sec" aria-labelledby="h-fig"><h2 id="h-fig">Иллюстрации</h2>' +
      (s.figures ? '<div class="figures">' + M.render(s.figures) + '</div>' : empty('Иллюстрации к теме пока не добавлены.')) + '</section>' +

      // animation: none в шапке подтемы — раздела «Анимация» на странице нет совсем
      (noAnim ? '' : '<section class="sec" aria-labelledby="h-anim"><h2 id="h-anim">' + (anims.length > 1 ? 'Анимации' : 'Анимация') + '</h2>' +
      (anims.length ? (anims.length > 1 && s.animation ? '<div class="prose small">' + M.render(s.animation) + '</div>' : '') +
        anims.map(n => '<div class="anim-block">' + (D.animationTitles[n] ? '<h3 class="anim-title">' + esc(D.animationTitles[n]) + '</h3>' : '') +
          '<div class="anim">' + D.animations[n] + '</div><div class="anim-bar"><button type="button" class="btn btn-small anim-toggle">⏸ Остановить</button></div>' +
          (s['animation_' + n] || (anims.length === 1 ? s.animation : '') ? '<div class="prose small">' + M.render(s['animation_' + n] || s.animation) + '</div>' : '') + '</div>').join('')
        : empty('Анимация для этой темы в разработке.')) + '</section>') +

      // videos: none в шапке подтемы — раздела «Видео» на странице нет совсем
      (t.videos === 'none' ? '' : '<section class="sec" aria-labelledby="h-vid"><h2 id="h-vid">Видео</h2>' +
      (s.videos ? '<div class="prose">' + M.render(s.videos) + '</div>' : empty('Подборка видео пока не добавлена.')) + '</section>') +

      '<section class="sec" aria-labelledby="h-src"><h2 id="h-src">Статьи и источники</h2>' +
      (s.sources ? '<div class="prose">' + M.render(s.sources) + '</div>' : empty('Источники пока не добавлены.')) + '</section>' +

      '<section class="sec clinical" aria-labelledby="h-clin"><h2 id="h-clin"><span class="tag tag-clin">Клинический слой</span> Как это выглядит в гематологии</h2>' +
      '<div class="clin-off"><p class="muted">Клинический слой скрыт.</p><button type="button" class="btn btn-small" id="clin-show">Показать</button></div>' +
      '<div class="clin-on prose"><div class="md" data-md>' + M.render(s.clinical || '') + '</div></div></section>' +

      '<section class="sec quiz" id="quiz" aria-labelledby="h-quiz"><h2 id="h-quiz">' + esc(L().quizTitle) + '</h2><div id="quiz-box"></div></section>' +

      '<section class="sec" aria-labelledby="h-rel"><h2 id="h-rel">Связанные темы</h2>' + (related.length ? chips(related) : empty('—')) + '</section>' +
      '</div>' +

      '<nav class="pager" aria-label="Соседние темы">' +
      (prev ? '<a class="pager-prev" href="#/topic/' + prev.id + '"><span>← Предыдущая</span><strong>' + esc(prev.title) + '</strong></a>' : '<span></span>') +
      (next ? '<a class="pager-next" href="#/topic/' + next.id + '"><span>Следующая →</span><strong>' + esc(next.title) + '</strong></a>' : '<span></span>') + '</nav>' +
      (t.updated ? '<p class="updated muted">Последнее обновление: ' + fmtDate(t.updated) + '. Материал — черновик, требует научной вычитки автором.</p>' : '');

    /* автоссылки: первое упоминание среди видимых слоёв */
    const topicEl = $('#topic');
    const mds = $$('[data-md]', topicEl);
    const originals = mds.map(el => el.innerHTML);
    const skip = new Set();
    t.exclude.forEach(x => { skip.add('glossary:' + x); skip.add('bestiary:' + x); });
    function relink() {
      const seen = new Set();
      mds.forEach((el, k) => {
        el.innerHTML = originals[k];
        const layer = el.closest('.layer');
        const visible = layer ? (layer.classList.contains('layer-advanced') ? topicEl.dataset.level === 'advanced' : true) : topicEl.dataset.clinical === '1';
        if (visible) WS.autolink.apply(el, seen, skip);
      });
    }
    relink();

    topicEl.addEventListener('click', e => {
      const lb = e.target.closest('[data-level]');
      if (lb && lb.closest('.seg')) {
        level = lb.dataset.level; store.set('ws.level', level);
        topicEl.dataset.level = level;
        $$('.seg button', topicEl).forEach(x => x.setAttribute('aria-checked', x.dataset.level === level));
        relink();
      }
      if (e.target.id === 'clin-show') setClinical(true);
    });
    function setClinical(v) {
      clinical = v; store.set('ws.clinical', v ? '1' : '0');
      topicEl.dataset.clinical = v ? '1' : '0';
      $('#clin-toggle').checked = v;
      relink();
    }
    $('#clin-toggle').addEventListener('change', e => setClinical(e.target.checked));

    /* анимация: пауза (доступность), по умолчанию стоит при prefers-reduced-motion */
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $$('.anim-block', topicEl).forEach(block => {
      const animEl = $('.anim', block), btn = $('.anim-toggle', block);
      const setPaused = p => { animEl.classList.toggle('paused', p); btn.textContent = p ? '▶ Запустить' : '⏸ Остановить'; btn.setAttribute('aria-pressed', p); };
      setPaused(reduce);
      btn.addEventListener('click', () => setPaused(!animEl.classList.contains('paused')));
    });

    WS.quiz.mount($('#quiz-box'), t, Object.assign({}, L(), { quizStart: L().quizStart }));
  }

  /* ---------- глоссарий ---------- */
  function usageBlocks(e) {
    return Array.from(new Set(WS.autolink.usageOf(e).map(t => t.blockId)));
  }

  function linkedHtml(md, e) {
    const div = document.createElement('div');
    div.innerHTML = M.render(md);
    WS.autolink.apply(div, new Set(), new Set([e.kind + ':' + e.id]));
    return div.innerHTML;
  }

  function relatedChips(e) {
    const rel = e.related.map(r => D.termById[r] || D.proteinById[r]).filter(Boolean);
    return rel.length ? '<p class="meta-row"><span class="meta-k">См. также:</span></p>' + chips(rel) : '';
  }

  function usedIn(e) {
    const u = WS.autolink.usageOf(e);
    return u.length ? '<p class="meta-row"><span class="meta-k">Используется в темах:</span></p>' + chips(u.map(t => ({ url: '#/topic/' + t.id, title: t.title }))) : '';
  }

  function viewGlossary() {
    setTitle('Глоссарий');
    const blocksUsed = D.blocks.filter(b => b.topics.length);
    const letterOf = e => e.title.trim()[0].toUpperCase();
    main.innerHTML = crumbs([['#/', 'Главная'], [null, 'Глоссарий']]) +
      '<header class="page-head"><h1>Глоссарий</h1><p class="en">Glossary</p><p class="lead">Определения технических терминов. Русское название, английское название и связи с другими терминами.</p></header>' +
      '<div class="toolbar"><label>Блок: <select id="g-block"><option value="">Все</option>' + blocksUsed.map(b => '<option value="' + b.id + '">' + esc(blockLabel(b) + '. ' + b.title) + '</option>').join('') + '</select></label></div>' +
      '<nav class="letters" id="letters" aria-label="Алфавитный указатель"></nav><div id="g-list"></div>';

    function draw() {
      const bf = $('#g-block').value;
      const list = D.terms.filter(e => !bf || usageBlocks(e).includes(bf));
      const groups = {};
      list.forEach(e => { (groups[letterOf(e)] = groups[letterOf(e)] || []).push(e); });
      const letters = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'ru'));
      $('#letters').innerHTML = letters.map(l => '<button type="button" class="letter" data-l="' + l + '">' + l + '</button>').join('');
      $('#g-list').innerHTML = letters.map(l =>
        '<section class="letter-group" data-l="' + l + '"><h2 class="letter-head">' + l + '</h2>' +
        groups[l].map(e => '<article class="entry"><h3><a href="' + e.url + '">' + esc(e.title) + '</a>' + (e.en ? ' <span class="en">' + esc(e.en) + '</span>' : '') + '</h3>' +
          '<div class="md">' + linkedHtml(e.def, e) + '</div></article>').join('') + '</section>').join('') ||
        '<p class="muted">В этом блоке пока нет терминов.</p>';
    }
    draw();
    $('#g-block').addEventListener('change', draw);
    $('#letters').addEventListener('click', e => {
      const b = e.target.closest('.letter');
      if (b) { const g = $('.letter-group[data-l="' + b.dataset.l + '"]'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  }

  function viewTerm(id) {
    const e = D.termById[id];
    if (!e) return view404();
    setTitle(e.title);
    main.innerHTML = crumbs([['#/', 'Главная'], ['#/glossary', 'Глоссарий'], [null, e.title]]) +
      '<header class="page-head"><p class="eyebrow">Термин</p><h1>' + esc(e.title) + '</h1>' + (e.en ? '<p class="en">' + esc(e.en) + '</p>' : '') + '</header>' +
      '<div class="prose">' + linkedHtml(e.def, e) + '</div>' +
      (e.syn.length ? '<p class="meta-row"><span class="meta-k">Синонимы:</span> ' + e.syn.map(esc).join(', ') + '</p>' : '') +
      relatedChips(e) + usedIn(e);
  }

  /* ---------- бестиарий ---------- */
  function sigil(p) {
    if (p.image) return '<img class="sigil-img" src="' + esc(p.image) + '" alt="Иллюстрация: ' + esc(p.title) + '" loading="lazy">';
    let h = 0; for (const ch of p.cls || p.title) h = (h * 31 + ch.charCodeAt(0)) % 360;
    const label = (p.gene || p.en || p.title).split(/[,\s]+/)[0].replace(/::.*/, '').replace(/[^A-Za-zА-Яа-я0-9]/g, '').slice(0, 5).toUpperCase() || p.title.slice(0, 3).toUpperCase();
    return '<div class="sigil" style="--h:' + h + '" role="img" aria-label="Эмблема: ' + esc(p.title) + '"><span>' + esc(label) + '</span></div>';
  }

  function viewBestiary() {
    setTitle('Бестиарий белков');
    const classes = Array.from(new Set(D.proteins.map(p => p.cls).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'));
    const blocksUsed = D.blocks.filter(b => b.topics.length);
    main.innerHTML = crumbs([['#/', 'Главная'], [null, 'Бестиарий']]) +
      '<header class="page-head"><h1>Бестиарий белков</h1><p class="en">Protein bestiary</p><p class="lead">Карточки белков и ферментов: где живут, что умеют, чем их можно победить и какую роль играют в гематологии.</p></header>' +
      '<div class="toolbar"><label>Класс: <select id="b-class"><option value="">Все</option>' + classes.map(c => '<option>' + esc(c) + '</option>').join('') + '</select></label>' +
      '<label>Блок: <select id="b-block"><option value="">Все</option>' + blocksUsed.map(b => '<option value="' + b.id + '">' + esc(blockLabel(b) + '. ' + b.title) + '</option>').join('') + '</select></label></div>' +
      '<div class="grid beast-grid" id="b-list"></div>';
    function draw() {
      const c = $('#b-class').value, bf = $('#b-block').value;
      const list = D.proteins.filter(p => (!c || p.cls === c) && (!bf || usageBlocks(p).includes(bf)));
      $('#b-list').innerHTML = list.map(p =>
        '<a class="card beast-card" href="' + p.url + '">' + sigil(p) + '<h3>' + esc(p.title) + '</h3>' + (p.en ? '<p class="en">' + esc(p.en) + '</p>' : '') +
        '<p class="card-meta">' + (p.cls ? '<span class="badge">' + esc(p.cls) + '</span> ' : '') + (p.habitat ? '<span class="badge badge-hab">' + esc(p.habitat) + '</span>' : '') + '</p>' +
        '<p class="muted">' + esc(firstSentence(p.abilities)) + '</p></a>').join('') || '<p class="muted">Ничего не найдено.</p>';
    }
    draw();
    $('#b-class').addEventListener('change', draw);
    $('#b-block').addEventListener('change', draw);
  }

  function viewProtein(id) {
    const p = D.proteinById[id];
    if (!p) return view404();
    setTitle(p.title);
    const field = (k, md) => md ? '<section class="stat"><h3>' + k + '</h3><div class="md">' + linkedHtml(md, p) + '</div></section>' : '';
    main.innerHTML = crumbs([['#/', 'Главная'], ['#/bestiary', 'Бестиарий'], [null, p.title]]) +
      '<article class="beast-full"><div class="beast-side">' + sigil(p) +
      '<dl class="beast-facts"><dt>Класс</dt><dd>' + esc(p.cls || '—') + '</dd><dt>Среда обитания</dt><dd>' + esc(p.habitat || '—') + '</dd>' +
      (p.gene ? '<dt>Ген</dt><dd><em>' + esc(p.gene) + '</em></dd>' : '') + '</dl></div>' +
      '<div class="beast-main"><header class="page-head"><p class="eyebrow">Карточка белка</p><h1>' + esc(p.title) + '</h1>' + (p.en ? '<p class="en">' + esc(p.en) + '</p>' : '') + '</header>' +
      field('Способности', p.abilities) + field('Уязвимости', p.weaknesses) + field('Роль в гематологии', p.role) +
      (p.alphafold.length ? '<section class="stat"><h3>Структура в AlphaFold DB</h3><ul class="chips">' + p.alphafold.map(a =>
        '<li><a href="https://alphafold.ebi.ac.uk/entry/' + encodeURIComponent(a.id) + '" target="_blank" rel="noopener noreferrer">' + esc(a.label) + ' <span class="muted">(' + esc(a.id) + ')</span> ↗</a></li>').join('') +
        '</ul><p class="muted small">Предсказанные моделью AlphaFold трёхмерные структуры (не экспериментальные данные). Для комплексов показаны отдельные субъединицы, для слитых белков — белки-партнёры. Открывается на сайте EMBL-EBI.</p></section>' : '') +
      (p.syn.length ? '<p class="meta-row"><span class="meta-k">Синонимы:</span> ' + p.syn.map(esc).join(', ') + '</p>' : '') +
      relatedChips(p) + usedIn(p) + '</div></article>';
  }

  /* ---------- поиск ---------- */
  function goSearch(q) { q = (q || '').trim(); if (q) location.hash = '#/search?q=' + encodeURIComponent(q); }

  function viewSearch(q) {
    setTitle('Поиск: ' + q);
    const res = WS.search.query(q, 60);
    main.innerHTML = crumbs([['#/', 'Главная'], [null, 'Поиск']]) +
      '<header class="page-head"><h1>Поиск</h1></header>' +
      '<form class="hero-search" id="s-form"><label class="sr-only" for="sq">Запрос</label><input id="sq" type="search" value="' + esc(q) + '"><button class="btn btn-primary">Найти</button></form>' +
      (res.length ? '<p class="muted">Найдено: ' + res.length + '</p><ul class="results">' + res.map(d =>
        '<li><a class="result" href="' + d.url + '"><span class="badge badge-' + d.type + '">' + WS.search.TYPE[d.type] + '</span> <strong>' + esc(d.title) + '</strong>' +
        (d.alt[0] ? ' <span class="en">' + esc(d.alt[0]) + '</span>' : '') + (d.extra ? ' <span class="muted">· ' + esc(d.extra) + '</span>' : '') +
        '<br><span class="muted">' + esc(truncate(d.summary, 170)) + '</span></a></li>').join('') + '</ul>'
        : '<p>По запросу «' + esc(q) + '» ничего не найдено. Попробуйте другое слово или английское название.</p>');
    $('#s-form').addEventListener('submit', e => { e.preventDefault(); goSearch($('#sq').value); });
  }

  /* ---------- о проекте / 404 ---------- */
  function viewAbout() {
    setTitle('О проекте');
    main.innerHTML = crumbs([['#/', 'Главная'], [null, 'О проекте']]) +
      '<header class="page-head"><h1>О проекте</h1></header><div class="prose">' +
      '<p><strong>Атлас генома</strong> — открытый бесплатный справочник по молекулярной генетике для тех, кто хочет повторить, обновить или узнать что-то новое: школьников, студентов, ординаторов и врачей-гематологов.</p>' +
      '<h2>Как читать</h2><ul><li><strong>Базовый слой</strong> — суть простыми словами и аналогии.</li><li><strong>Продвинутый слой</strong> — механизмы, ключевые молекулы, термины.</li><li><strong>Клинический слой</strong> — «Как это выглядит в гематологии»: мутация → болезнь → лабораторный тест → терапия. Доступен и на базовом уровне.</li></ul>' +
      '<p>Выбор слоя запоминается в вашем браузере. Кнопка в шапке переключает светлую и тёмную тему оформления.</p>' +
      '<h2>Важно</h2><p>Это образовательный ресурс, а не клинические рекомендации. Он не заменяет консультацию врача. Тексты прототипа — черновики и проходят научную вычитку; клинические данные проверяйте по первоисточникам.</p>' +
      '<h2>Приватность</h2><p>Сайт не собирает персональные данные. Слой, вид оформления и результаты тестов хранятся только в вашем браузере.</p>' +
      '<p class="muted">Версия прототипа 0.1. Контент собран: ' + esc(D.built || '—') + '.</p></div>';
  }

  function view404() {
    setTitle('Не найдено');
    main.innerHTML = '<header class="page-head"><h1>Страница не найдена</h1></header><p>Такой страницы нет. <a href="#/">На главную</a> или воспользуйтесь поиском.</p>';
  }

  function viewEmpty() {
    main.innerHTML = '<header class="page-head"><h1>Нет данных</h1></header><p>Файл <code>data/bundle.js</code> пуст или не найден. Запустите <code>build.bat</code> в папке проекта и обновите страницу.</p>';
  }

  /* ---------- маршрутизатор ---------- */
  function route() {
    if (!D.hasContent) { viewEmpty(); return; }
    const raw = location.hash.replace(/^#\/?/, '');
    const qi = raw.indexOf('?');
    const path = (qi >= 0 ? raw.slice(0, qi) : raw).split('/').filter(Boolean).map(decodeURIComponent);
    const params = new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : '');
    const [a, b] = path;
    closeSuggest();
    if (!a) viewHome();
    else if (a === 'block') viewBlock(b);
    else if (a === 'topic') viewTopic(b);
    else if (a === 'glossary') b ? viewTerm(b) : viewGlossary();
    else if (a === 'bestiary') b ? viewProtein(b) : viewBestiary();
    else if (a === 'search') viewSearch(params.get('q') || '');
    else if (a === 'about') viewAbout();
    else view404();
    window.scrollTo(0, 0);
  }

  /* ---------- поисковая строка с подсказками ---------- */
  const qInput = $('#q'), sug = $('#suggest');
  let sugItems = [], sugIdx = -1;
  function closeSuggest() { sug.hidden = true; qInput.setAttribute('aria-expanded', 'false'); sugIdx = -1; }
  function drawSuggest() {
    sugItems = qInput.value.trim() ? WS.search.query(qInput.value, 7) : [];
    if (!sugItems.length) { closeSuggest(); return; }
    sug.innerHTML = sugItems.map((d, i) => '<li role="option" id="sg-' + i + '" data-i="' + i + '"><span class="badge badge-' + d.type + '">' + WS.search.TYPE[d.type] + '</span> ' + esc(d.title) + (d.alt[0] ? ' <span class="en">' + esc(d.alt[0]) + '</span>' : '') + '</li>').join('');
    sug.hidden = false; qInput.setAttribute('aria-expanded', 'true'); sugIdx = -1;
  }
  function markSuggest() {
    $$('li', sug).forEach((li, i) => li.setAttribute('aria-selected', i === sugIdx));
    if (sugIdx >= 0) qInput.setAttribute('aria-activedescendant', 'sg-' + sugIdx); else qInput.removeAttribute('aria-activedescendant');
  }
  qInput.addEventListener('input', drawSuggest);
  qInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (sugItems.length) { sugIdx = (sugIdx + 1) % sugItems.length; markSuggest(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (sugItems.length) { sugIdx = (sugIdx - 1 + sugItems.length) % sugItems.length; markSuggest(); } }
    else if (e.key === 'Escape') closeSuggest();
  });
  $('#search-form').addEventListener('submit', e => {
    e.preventDefault();
    if (sugIdx >= 0 && sugItems[sugIdx]) { location.hash = sugItems[sugIdx].url; qInput.value = ''; }
    else goSearch(qInput.value);
    closeSuggest();
  });
  sug.addEventListener('mousedown', e => {
    const li = e.target.closest('li');
    if (li) { e.preventDefault(); location.hash = sugItems[+li.dataset.i].url; qInput.value = ''; closeSuggest(); }
  });
  qInput.addEventListener('blur', () => setTimeout(closeSuggest, 120));
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); qInput.focus(); }
  });

  /* ---------- запуск ---------- */
  $('.skip').addEventListener('click', e => { e.preventDefault(); main.focus(); });
  $('#mode-toggle').addEventListener('click', () => { mode = mode === 'dark' ? 'light' : 'dark'; store.set('ws.mode', mode); applyTheme(); });
  if (D.built) $('#built').textContent = 'Контент собран: ' + D.built + '.';
  WS.autolink.build();
  WS.search.build();
  applyTheme();
  window.addEventListener('hashchange', route);
  route();
})(window.WS = window.WS || {});
