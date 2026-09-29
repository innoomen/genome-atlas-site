/* Тесты: разбор файла quizzes/<id>.md и интерфейс прохождения */
(function (WS) {
  'use strict';
  const esc = s => WS.md.esc(s);

  /* Формат файла (тип по умолчанию — «выбор», для старых файлов без «тип:» ничего не меняется):

     ## Текст вопроса
     тип: выбор
     - [ ] Неверный вариант
     - [x] Верный вариант
     Пояснение: ...
     Подсказка: ...

     ## Текст вопроса
     тип: текст
     ответ: слово | второй вариант написания
     Пояснение: ...

     ## Текст вопроса
     тип: порядок
     - первый шаг
     - второй шаг
     - третий шаг
     Пояснение: ...

     ## Текст вопроса
     тип: разметка
     схема: id-схемы-из-LABEL_SCHEMES
     метки: Метка1, Метка2, Метка3
     Пояснение: ...                                                        */
  function normText(s) { return (s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

  function parse(text, topicId) {
    const { body } = WS.md.parseFrontmatter(text);
    const qs = [];
    let cur = null, field = null;
    body.split('\n').forEach(raw => {
      const line = raw.trim();
      let m;
      if ((m = line.match(/^##\s+(.+)$/))) {
        cur = {
          id: topicId + '-q' + (qs.length + 1), text: m[1], type: 'выбор',
          options: [], items: [], answers: [], scheme: '', labels: [],
          explanation: '', hint: ''
        };
        qs.push(cur); field = 'text'; return;
      }
      if (!cur || !line) return;
      if ((m = line.match(/^тип:\s*(.+)$/i))) { cur.type = m[1].trim().toLowerCase(); field = null; return; }
      if ((m = line.match(/^ответ:\s*(.+)$/i))) { cur.answers = m[1].split('|').map(s => s.trim()).filter(Boolean); field = null; return; }
      if ((m = line.match(/^схема:\s*(.+)$/i))) { cur.scheme = m[1].trim(); field = null; return; }
      if ((m = line.match(/^метки:\s*(.+)$/i))) { cur.labels = m[1].split(',').map(s => s.trim()).filter(Boolean); field = null; return; }
      if ((m = line.match(/^[-*]\s*\[( |x|X)\]\s*(.+)$/))) {
        cur.options.push({ text: m[2], correct: m[1].toLowerCase() === 'x' }); field = null; return;
      }
      if (cur.type === 'порядок' && (m = line.match(/^[-*]\s+(.+)$/))) { cur.items.push(m[1]); field = null; return; }
      if ((m = line.match(/^Пояснение:\s*(.*)$/i))) { cur.explanation = m[1]; field = 'explanation'; return; }
      if ((m = line.match(/^Подсказка:\s*(.*)$/i))) { cur.hint = m[1]; field = 'hint'; return; }
      if (field) cur[field] += ' ' + line;
    });
    return qs.filter(q => {
      if (q.type === 'текст') return q.answers.length > 0;
      if (q.type === 'порядок') return q.items.length >= 2;
      if (q.type === 'разметка') return !!(LABEL_SCHEMES[q.scheme] && q.labels.length >= 1);
      return q.options.length >= 2 && q.options.some(o => o.correct);
    });
  }

  /* ---------- схемы для вопросов типа «разметка» ---------- */
  /* Координаты — проценты от картинки, тот же приём, что HOTSPOTS в lab.js. */
  const LABEL_SCHEMES = {
    'replication-fork-quiz': {
      image: 'media/images/replication-fork-quiz.svg',
      points: {
        'Геликаза': { left: 55, top: 42.5, w: 13, h: 15 },
        'Топоизомераза': { left: 71, top: 42.5, w: 13, h: 15 },
        'ДНК-полимераза': { left: 47.1, top: 56.7, w: 13, h: 15 },
        'Праймаза': { left: 40.9, top: 25.4, w: 13, h: 15 }
      }
    }
  };

  /* ---------- сохранение результатов (только в браузере читателя) ---------- */
  const key = id => 'ws.quiz.' + id;
  function load(id) { try { return JSON.parse(localStorage.getItem(key(id))); } catch (e) { return null; } }
  function save(id, score, total) {
    try {
      const prev = load(id);
      const best = prev && prev.best > score ? prev.best : score;
      localStorage.setItem(key(id), JSON.stringify({ best, last: score, total, date: new Date().toISOString().slice(0, 10) }));
    } catch (e) { /* хранилище недоступно — не страшно */ }
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* ---------- интерфейс ---------- */
  function mount(el, topic, L) {
    const total = topic.questions.length;
    if (!total) { el.innerHTML = '<p class="muted">Тест для этой темы ещё не написан.</p>'; return; }

    function start() {
      const prev = load(topic.id);
      el.innerHTML = '<div class="quiz-start"><p>' + total + ' ' + (total === 1 ? 'вопрос' : total < 5 ? 'вопроса' : 'вопросов') +
        '. После ответа показывается пояснение.</p>' +
        (prev ? '<p class="muted">Ваш лучший результат: <strong>' + prev.best + ' из ' + prev.total + '</strong> (' + esc(prev.date) + ')</p>' : '') +
        '<button class="btn btn-primary" id="q-go">' + esc(L.quizStart) + '</button></div>';
      el.querySelector('#q-go').addEventListener('click', run);
    }

    function run() {
      const order = shuffle(topic.questions.map((q, i) => i));
      let pos = 0, score = 0;

      function progressHtml() { return '<p class="quiz-progress">Вопрос ' + (pos + 1) + ' из ' + total + '</p>'; }

      function hintHtml(q) {
        return q.hint ? '<button class="btn btn-link" id="q-hint">Подсказка</button><p class="quiz-hint" hidden>' + WS.md.inline(q.hint) + '</p>' : '';
      }
      function wireHint() {
        const hint = el.querySelector('#q-hint');
        if (hint) hint.addEventListener('click', () => { el.querySelector('.quiz-hint').hidden = false; hint.hidden = true; });
      }

      function finishQuestion(isCorrect, explanation) {
        if (isCorrect) score++;
        const last = pos === total - 1;
        el.querySelector('.quiz-feedback').innerHTML =
          '<p class="fb ' + (isCorrect ? 'fb-ok' : 'fb-bad') + '"><strong>' + (isCorrect ? 'Верно.' : 'Неверно.') + '</strong> ' +
          WS.md.inline(explanation || '') + '</p>' +
          '<button class="btn btn-primary" id="q-next">' + (last ? 'Показать результат' : 'Дальше') + '</button>';
        const next = el.querySelector('#q-next');
        next.focus();
        next.addEventListener('click', () => { pos++; if (pos < total) show(); else finish(); });
      }

      function show() {
        const q = topic.questions[order[pos]];
        if (q.type === 'текст') return showText(q);
        if (q.type === 'порядок') return showOrder(q);
        if (q.type === 'разметка') return showLabel(q);
        return showChoice(q);
      }

      function showChoice(q) {
        const opts = shuffle(q.options);
        el.innerHTML =
          '<div class="quiz-q">' + progressHtml() +
          '<p class="quiz-text">' + WS.md.inline(q.text) + '</p>' +
          '<div class="quiz-opts" role="group" aria-label="Варианты ответа">' +
          opts.map((o, i) => '<button class="opt" data-i="' + i + '">' + WS.md.inline(o.text) + '</button>').join('') + '</div>' +
          hintHtml(q) + '<div class="quiz-feedback" aria-live="polite"></div></div>';
        wireHint();
        el.querySelectorAll('.opt').forEach(btn => btn.addEventListener('click', () => {
          const chosen = opts[+btn.dataset.i];
          el.querySelectorAll('.opt').forEach((b, i) => { b.disabled = true; if (opts[i].correct) b.classList.add('correct'); });
          if (!chosen.correct) btn.classList.add('wrong');
          finishQuestion(chosen.correct, q.explanation);
        }));
      }

      function showText(q) {
        el.innerHTML =
          '<div class="quiz-q">' + progressHtml() +
          '<p class="quiz-text">' + WS.md.inline(q.text) + '</p>' +
          '<form class="quiz-text-form" id="q-text-form">' +
          '<input type="text" class="quiz-text-input" id="q-text-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Впишите ответ">' +
          '<button class="btn btn-primary" type="submit">Ответить</button></form>' +
          hintHtml(q) + '<div class="quiz-feedback" aria-live="polite"></div></div>';
        wireHint();
        const form = el.querySelector('#q-text-form');
        const input = el.querySelector('#q-text-input');
        input.focus();
        form.addEventListener('submit', e => {
          e.preventDefault();
          input.disabled = true;
          form.querySelector('button').disabled = true;
          const correct = q.answers.some(a => normText(a) === normText(input.value));
          input.classList.add(correct ? 'correct' : 'wrong');
          const note = correct ? '' : ' Правильный ответ: «' + q.answers[0] + '».';
          finishQuestion(correct, (q.explanation || '') + note);
        });
      }

      function showOrder(q) {
        const correctOrder = q.items;
        const pool = shuffle(correctOrder.map((t, i) => ({ text: t, i })));
        const st = { picked: [] };
        renderOrder();

        function renderOrder() {
          const remaining = pool.filter(o => st.picked.indexOf(o) === -1);
          el.innerHTML =
            '<div class="quiz-q">' + progressHtml() +
            '<p class="quiz-text">' + WS.md.inline(q.text) + '</p>' +
            '<p class="muted">Кликайте пункты по порядку. Ошиблись — нажмите на добавленный пункт, чтобы убрать его.</p>' +
            '<ol class="quiz-order-picked">' + (st.picked.length
              ? st.picked.map((o, li) => '<li><button type="button" class="quiz-order-item" data-picked="' + li + '">' + WS.md.inline(o.text) + '</button></li>').join('')
              : '<li class="quiz-order-empty">— пока пусто —</li>') + '</ol>' +
            '<div class="quiz-order-pool">' + remaining.map(o => '<button type="button" class="opt" data-idx="' + pool.indexOf(o) + '">' + WS.md.inline(o.text) + '</button>').join('') + '</div>' +
            hintHtml(q) + '<div class="quiz-feedback" aria-live="polite"></div></div>';
          wireHint();
          el.querySelectorAll('.quiz-order-pool .opt').forEach(btn => btn.addEventListener('click', () => {
            st.picked.push(pool[+btn.dataset.idx]);
            if (st.picked.length < pool.length) renderOrder(); else submitOrder();
          }));
          el.querySelectorAll('.quiz-order-item').forEach(btn => btn.addEventListener('click', () => {
            st.picked.splice(+btn.dataset.picked, 1); renderOrder();
          }));
        }

        function submitOrder() {
          const isCorrect = st.picked.every((o, i) => o.i === i);
          el.innerHTML =
            '<div class="quiz-q">' + progressHtml() +
            '<p class="quiz-text">' + WS.md.inline(q.text) + '</p>' +
            '<ol class="quiz-order-picked quiz-order-picked--final">' + st.picked.map(o => '<li>' + WS.md.inline(o.text) + '</li>').join('') + '</ol>' +
            '<div class="quiz-feedback" aria-live="polite"></div></div>';
          finishQuestion(isCorrect, q.explanation);
        }
      }

      function showLabel(q) {
        const scheme = LABEL_SCHEMES[q.scheme];
        const order2 = shuffle(q.labels.map((t, i) => i));
        const st = { idx: 0, mistake: false };
        renderLabel();

        function renderLabel() {
          const currentLabel = q.labels[order2[st.idx]];
          const hsHtml = Object.keys(scheme.points).map(key2 => {
            const p = scheme.points[key2];
            return '<button type="button" class="lab-hotspot" data-key="' + esc(key2) + '" ' +
              'style="left:' + p.left + '%;top:' + p.top + '%;width:' + p.w + '%;height:' + p.h + '%"></button>';
          }).join('');
          el.innerHTML =
            '<div class="quiz-q">' + progressHtml() +
            '<p class="quiz-text">' + WS.md.inline(q.text) + '</p>' +
            '<p class="quiz-label-target">Найдите на схеме: <strong>' + esc(currentLabel) + '</strong> <span class="muted">(' + (st.idx + 1) + ' из ' + q.labels.length + ')</span></p>' +
            '<div class="lab-scene"><img class="lab-scene-bg" src="' + esc(scheme.image) + '" alt="">' + hsHtml + '</div>' +
            hintHtml(q) + '<div class="quiz-feedback" aria-live="polite"></div></div>';
          wireHint();
          el.querySelectorAll('.lab-hotspot').forEach(btn => btn.addEventListener('click', () => onPick(btn, currentLabel)));
        }

        function onPick(btn, currentLabel) {
          if (btn.disabled) return;
          if (normText(btn.dataset.key) === normText(currentLabel)) {
            btn.disabled = true;
            btn.classList.add('correct');
            st.idx++;
            if (st.idx < q.labels.length) setTimeout(renderLabel, 350);
            else setTimeout(() => {
              el.querySelectorAll('.lab-hotspot').forEach(b => b.disabled = true);
              finishQuestion(!st.mistake, q.explanation);
            }, 350);
          } else {
            st.mistake = true;
            btn.classList.add('wrong');
            setTimeout(() => btn.classList.remove('wrong'), 450);
          }
        }
      }

      function finish() {
        save(topic.id, score, total);
        const ratio = score / total;
        const msg = L.result(score, total, ratio);
        el.innerHTML = '<div class="quiz-result"><p class="quiz-score">' + score + ' <span>из ' + total + '</span></p>' +
          '<p>' + esc(msg) + '</p><button class="btn" id="q-again">Пройти снова</button></div>';
        el.querySelector('#q-again').addEventListener('click', run);
        WS.quiz.onSaved && WS.quiz.onSaved(topic.id);
      }

      show();
    }

    start();
  }

  WS.quiz = { parse, mount, load };
})(window.WS = window.WS || {});
