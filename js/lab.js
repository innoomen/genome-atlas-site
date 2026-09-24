/* Виртуальная лаборатория: разбор lab/<id>.md и point-and-click движок уровня */
(function (WS) {
  'use strict';
  const esc = s => WS.md.esc(s);

  /* Формат файла (см. lab/extraction.md):
     ---
     title: ...
     scene: media/lab/<id>/bench.png
     portrait: media/lab/<id>/mouse-portrait.png
     ---
     ## Интро
     строка реплики
     ещё строка

     ## Шаг: текст пункта протокола
     клик: hotspot-id, hotspot-id2
     подсказка: что сказать при неверном клике
     результат: текст с {ng} и {ratio} (только у последнего шага)          */
  function parse(text, id) {
    const { meta, body } = WS.md.parseFrontmatter(text);
    const intro = [];
    const steps = [];
    let mode = null, cur = null;
    body.split('\n').forEach(raw => {
      const line = raw.trim();
      let m;
      if ((m = line.match(/^##\s+Интро\s*$/i))) { mode = 'intro'; cur = null; return; }
      if ((m = line.match(/^##\s+Шаг:\s*(.+)$/i))) { cur = { text: m[1].trim(), clicks: [], hint: '', result: '' }; steps.push(cur); mode = 'step'; return; }
      if (!line) return;
      if (mode === 'intro') { intro.push(line); return; }
      if (mode === 'step' && cur) {
        if ((m = line.match(/^клик:\s*(.+)$/i))) { cur.clicks = m[1].split(',').map(s => s.trim()).filter(Boolean); return; }
        if ((m = line.match(/^подсказка:\s*(.+)$/i))) { cur.hint = m[1].trim(); return; }
        if ((m = line.match(/^результат:\s*(.+)$/i))) { cur.result = m[1].trim(); return; }
      }
    });
    return {
      id, title: meta.title || id, title_en: meta.title_en || '',
      order: isNaN(parseFloat(meta.order)) ? 99 : parseFloat(meta.order),
      scene: meta.scene || '', portrait: meta.portrait || '',
      intro, steps: steps.filter(s => s.clicks.length)
    };
  }

  /* ---------- координаты hotspot'ов по уровням (проценты от сцены) ---------- */
  /* Подобраны примерно по словесной раскладке — уточняются визуально, когда придёт готовый арт. */
  const HOTSPOTS = {
    extraction: {
      'tube-rack':         { left: 3,  top: 56, w: 12, h: 26, label: 'Штатив с пробирками' },
      'reagent-lysis-rbc': { left: 17, top: 36, w: 8,  h: 34, label: 'Лизис эритроцитов' },
      'reagent-lysis-wbc': { left: 26, top: 36, w: 8,  h: 34, label: 'Лизис лейкоцитов' },
      'reagent-binding':   { left: 35, top: 36, w: 8,  h: 34, label: 'ДНК-связывающий раствор' },
      'reagent-ethanol':   { left: 44, top: 36, w: 8,  h: 34, label: 'Спирт' },
      'reagent-elution':   { left: 53, top: 36, w: 8,  h: 34, label: 'Элюирующий буфер' },
      vortex:              { left: 63, top: 54, w: 12, h: 22, label: 'Вортекс' },
      centrifuge:          { left: 77, top: 48, w: 18, h: 32, label: 'Центрифуга' },
      'spin-column':       { left: 63, top: 80, w: 10, h: 15, label: 'Колонка' },
      'waste-bucket':      { left: 3,  top: 82, w: 12, h: 15, label: 'Ведро для отходов' },
      'measuring-device':  { left: 77, top: 12, w: 18, h: 24, label: 'Измерительный прибор' },
      protocol:            { left: 38, top: 82, w: 14, h: 15, label: 'Протокол' }
    }
  };

  /* ---------- сохранение результата (только в браузере читателя) ---------- */
  const scoreKey = id => 'ws.lab.' + id;
  function loadBest(id) { try { return JSON.parse(localStorage.getItem(scoreKey(id))); } catch (e) { return null; } }
  function saveBest(id, score, mistakes) {
    try {
      const prev = loadBest(id);
      const best = prev && prev.score > score ? prev.score : score;
      localStorage.setItem(scoreKey(id), JSON.stringify({ score: best, last: score, mistakes, date: new Date().toISOString().slice(0, 10) }));
      return best;
    } catch (e) { return score; }
  }

  /* ---------- монтаж уровня ---------- */
  function mount(el, level) {
    const hotspots = HOTSPOTS[level.id] || {};
    const st = { phase: 'intro', introIdx: 0, stepIdx: 0, clickIdx: 0, score: 0, mistakes: 0, checklistOpen: false, toast: null, measureText: '' };
    let typeTimer = null;

    function stopTyping() { if (typeTimer) { clearInterval(typeTimer); typeTimer = null; } }

    function dialogueBox(text, opts) {
      opts = opts || {};
      const portrait = level.portrait
        ? '<img class="lab-portrait" src="' + esc(level.portrait) + '" alt="Лабораторный ассистент" onerror="this.style.display=\'none\'">'
        : '<div class="lab-portrait lab-portrait--blank" aria-hidden="true">🐭</div>';
      return '<div class="lab-dialogue' + (opts.overlay ? ' lab-dialogue--overlay' : '') + '" id="lab-dlg" role="button" tabindex="0" aria-label="Дальше">' +
        portrait +
        '<div class="lab-dlg-text"><p id="lab-dlg-p"></p><span class="lab-dlg-more" aria-hidden="true">▼</span></div>' +
        '</div>';
    }

    function wireDialogue(fullText, onAdvance) {
      const box = el.querySelector('#lab-dlg');
      const p = el.querySelector('#lab-dlg-p');
      let shown = 0;
      stopTyping();
      typeTimer = setInterval(() => {
        shown++;
        p.textContent = fullText.slice(0, shown);
        if (shown >= fullText.length) stopTyping();
      }, 18);
      const advance = () => {
        if (typeTimer) { stopTyping(); p.textContent = fullText; return; }
        onAdvance();
      };
      box.addEventListener('click', advance);
      box.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); } });
      box.focus();
    }

    function renderIntro() {
      const line = level.intro[st.introIdx] || '';
      el.innerHTML = '<div class="lab-level lab-level--intro">' + dialogueBox(line) + '</div>';
      wireDialogue(line, () => {
        st.introIdx++;
        if (st.introIdx < level.intro.length) renderIntro(); else { st.phase = 'play'; renderPlay(); }
      });
    }

    function sceneHtml() {
      const step = level.steps[st.stepIdx];
      const hasImg = !!level.scene;
      const hsHtml = Object.keys(hotspots).map(id => {
        const h = hotspots[id];
        return '<button type="button" class="lab-hotspot" data-id="' + esc(id) + '" data-label="' + esc(h.label) + '" title="' + esc(h.label) + '" aria-label="' + esc(h.label) + '" ' +
          'style="left:' + h.left + '%;top:' + h.top + '%;width:' + h.w + '%;height:' + h.h + '%"></button>';
      }).join('');
      return '<div class="lab-scene' + (hasImg ? '' : ' lab-scene--placeholder') + '" id="lab-scene">' +
        (hasImg ? '<img class="lab-scene-bg" src="' + esc(level.scene) + '" alt="" onerror="this.closest(\'.lab-scene\').classList.add(\'lab-scene--placeholder\')">' : '') +
        hsHtml + '</div>' +
        '<div class="lab-tube" aria-hidden="true"><span class="lab-tube-fill" style="height:' + Math.min(100, st.stepIdx / level.steps.length * 100) + '%"></span></div>';
    }

    function checklistHtml() {
      if (!st.checklistOpen) return '';
      const items = level.steps.map((s, i) => {
        const cls = i < st.stepIdx ? 'done' : i === st.stepIdx ? 'current' : '';
        const sub = i === st.stepIdx && s.clicks.length > 1 ? ' <span class="lab-sub">(' + st.clickIdx + '/' + s.clicks.length + ')</span>' : '';
        return '<li class="' + cls + '">' + esc(s.text) + sub + '</li>';
      }).join('');
      return '<div class="lab-checklist"><h3>Протокол: ' + esc(level.title) + '</h3><ol>' + items + '</ol>' +
        '<button class="btn btn-small" id="lab-close-protocol">Закрыть</button></div>';
    }

    function renderPlay() {
      el.innerHTML = '<div class="lab-level">' +
        '<div class="lab-hud"><span class="lab-score">Очки: ' + st.score + '</span>' +
        '<span class="lab-step-name">' + esc((level.steps[st.stepIdx] || {}).text || '') + '</span></div>' +
        sceneHtml() + checklistHtml() +
        (st.toast ? dialogueBox(st.toast, { overlay: true }) : '') +
        '</div>';
      el.querySelectorAll('.lab-hotspot').forEach(btn => btn.addEventListener('click', () => onHotspot(btn.dataset.id)));
      const proto = el.querySelector('[data-id="protocol"]');
      if (proto) proto.addEventListener('click', () => { st.checklistOpen = !st.checklistOpen; renderPlay(); });
      const closeBtn = el.querySelector('#lab-close-protocol');
      if (closeBtn) closeBtn.addEventListener('click', e => { e.stopPropagation(); st.checklistOpen = false; renderPlay(); });
      if (st.toast) wireDialogue(st.toast, () => { st.toast = null; renderPlay(); });
    }

    function onHotspot(id) {
      if (st.toast || id === 'protocol') return;
      const step = level.steps[st.stepIdx];
      if (!step) return;
      const expected = step.clicks[st.clickIdx];
      if (id === expected) {
        st.score++;
        st.clickIdx++;
        if (st.clickIdx >= step.clicks.length) {
          const result = step.result;
          st.stepIdx++;
          st.clickIdx = 0;
          if (result) {
            const ng = (40 + Math.random() * 80).toFixed(1);
            const ratio = (1.72 + Math.random() * 0.18).toFixed(2);
            st.measureText = result.replace('{ng}', ng).replace('{ratio}', ratio);
          }
          if (st.stepIdx >= level.steps.length) { finish(); return; }
        }
      } else {
        st.score--;
        st.mistakes++;
        st.toast = step.hint || 'Это не то. Попробуй ещё раз.';
      }
      renderPlay();
    }

    function finish() {
      const best = saveBest(level.id, st.score, st.mistakes);
      el.innerHTML = '<div class="lab-level lab-level--result">' +
        (st.measureText ? dialogueBox(st.measureText) : '') +
        '</div>';
      if (st.measureText) {
        wireDialogue(st.measureText, showResult);
      } else showResult();

      function showResult() {
        el.innerHTML = '<div class="lab-level lab-level--result">' +
          '<div class="lab-result"><h3>Уровень пройден</h3>' +
          '<p class="lab-score-big">' + st.score + ' <span>очков</span></p>' +
          '<p class="muted">Ошибок: ' + st.mistakes + ' · Лучший результат: ' + best + '</p>' +
          '<button class="btn btn-primary" id="lab-again">Сыграть снова</button>' +
          '<a class="btn btn-link" href="#/lab">К списку уровней</a>' +
          '</div></div>';
        el.querySelector('#lab-again').addEventListener('click', () => {
          st.phase = 'intro'; st.introIdx = 0; st.stepIdx = 0; st.clickIdx = 0; st.score = 0; st.mistakes = 0; st.checklistOpen = false; st.toast = null; st.measureText = '';
          renderIntro();
        });
      }
    }

    if (level.intro.length) renderIntro(); else { st.phase = 'play'; renderPlay(); }
  }

  WS.lab = { parse, mount };
})(window.WS = window.WS || {});
