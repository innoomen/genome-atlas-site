/* Тесты: разбор файла quizzes/<id>.md и интерфейс прохождения */
(function (WS) {
  'use strict';
  const esc = s => WS.md.esc(s);

  /* Формат файла:
     ## Текст вопроса
     - [ ] Неверный вариант
     - [x] Верный вариант
     Пояснение: ...
     Подсказка: ...                                                    */
  function parse(text, topicId) {
    const { body } = WS.md.parseFrontmatter(text);
    const qs = [];
    let cur = null, field = null;
    body.split('\n').forEach(raw => {
      const line = raw.trim();
      let m;
      if ((m = line.match(/^##\s+(.+)$/))) {
        cur = { id: topicId + '-q' + (qs.length + 1), text: m[1], options: [], explanation: '', hint: '' };
        qs.push(cur); field = 'text'; return;
      }
      if (!cur || !line) return;
      if ((m = line.match(/^[-*]\s*\[( |x|X)\]\s*(.+)$/))) {
        cur.options.push({ text: m[2], correct: m[1].toLowerCase() === 'x' }); field = null; return;
      }
      if ((m = line.match(/^Пояснение:\s*(.*)$/i))) { cur.explanation = m[1]; field = 'explanation'; return; }
      if ((m = line.match(/^Подсказка:\s*(.*)$/i))) { cur.hint = m[1]; field = 'hint'; return; }
      if (field) cur[field] += ' ' + line;
    });
    return qs.filter(q => q.options.length >= 2 && q.options.some(o => o.correct));
  }

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
        ', в каждом один верный ответ. После ответа показывается пояснение.</p>' +
        (prev ? '<p class="muted">Ваш лучший результат: <strong>' + prev.best + ' из ' + prev.total + '</strong> (' + esc(prev.date) + ')</p>' : '') +
        '<button class="btn btn-primary" id="q-go">' + esc(L.quizStart) + '</button></div>';
      el.querySelector('#q-go').addEventListener('click', run);
    }

    function run() {
      const order = shuffle(topic.questions.map((q, i) => i));
      let pos = 0, score = 0;

      function show() {
        const q = topic.questions[order[pos]];
        const opts = shuffle(q.options);
        el.innerHTML =
          '<div class="quiz-q"><p class="quiz-progress">Вопрос ' + (pos + 1) + ' из ' + total + '</p>' +
          '<p class="quiz-text">' + WS.md.inline(q.text) + '</p>' +
          '<div class="quiz-opts" role="group" aria-label="Варианты ответа">' +
          opts.map((o, i) => '<button class="opt" data-i="' + i + '">' + WS.md.inline(o.text) + '</button>').join('') + '</div>' +
          (q.hint ? '<button class="btn btn-link" id="q-hint">Подсказка</button><p class="quiz-hint" hidden>' + WS.md.inline(q.hint) + '</p>' : '') +
          '<div class="quiz-feedback" aria-live="polite"></div></div>';
        const hint = el.querySelector('#q-hint');
        if (hint) hint.addEventListener('click', () => { el.querySelector('.quiz-hint').hidden = false; hint.hidden = true; });
        el.querySelectorAll('.opt').forEach(btn => btn.addEventListener('click', () => answer(q, opts, btn)));
      }

      function answer(q, opts, btn) {
        const chosen = opts[+btn.dataset.i];
        el.querySelectorAll('.opt').forEach((b, i) => {
          b.disabled = true;
          if (opts[i].correct) b.classList.add('correct');
        });
        if (!chosen.correct) btn.classList.add('wrong');
        else score++;
        const last = pos === total - 1;
        el.querySelector('.quiz-feedback').innerHTML =
          '<p class="fb ' + (chosen.correct ? 'fb-ok' : 'fb-bad') + '"><strong>' + (chosen.correct ? 'Верно.' : 'Неверно.') + '</strong> ' +
          WS.md.inline(q.explanation || '') + '</p>' +
          '<button class="btn btn-primary" id="q-next">' + (last ? 'Показать результат' : 'Дальше') + '</button>';
        const next = el.querySelector('#q-next');
        next.focus();
        next.addEventListener('click', () => { pos++; if (pos < total) show(); else finish(); });
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
