/* Крыска-помощница: бегает внизу экрана, по клику рассказывает короткие факты */
(function (WS) {
  'use strict';

  const FACTS = [
    'ДНК одной твоей клетки — это почти 2 метра нити, свёрнутой в ядро размером в пару микрометров.',
    'Пары A–T держатся двумя водородными связями, а G–C — тремя, поэтому GC-богатые участки ДНК плавятся при более высокой температуре.',
    'Геном человека — около 3,1 млрд пар оснований, но белок кодирует лишь 1–2 % из них.',
    'Тимин в ДНК — это метилированный урацил: метка «так и задумано», чтобы отличить его от испорченного цитозина.',
    'Нуклеосома — это ДНК, обёрнутая почти два раза вокруг восьми гистонов, как нитка на катушке.',
    'Гистоновые метки работают по системе «писец — ластик — читатель»: одни ставят метку, другие её снимают, третьи реагируют на неё.',
    'Одна замена буквы в гене *HBB* — и получается серповидноклеточная анемия. Масштаб изменения не всегда определяет тяжесть болезни.',
    'Эпигенетические метки не меняют текст ДНК, но клетка «помнит» их и передаёт дочерним клеткам при делении.',
    'Филадельфийская хромосома была первой находкой, которая напрямую связала конкретную поломку ДНК с конкретным раком — задолго до расшифровки генома.',
    'BCR::ABL1 — это киназа, у которой «сломан тормоз»: она включена всегда, как педаль газа, которую заело.',
    'Венетоклакс не блокирует фермент — он имитирует маленький кусочек белка (BH3-домен) и «освобождает» клетку для запрограммированной гибели.',
    'JAK–STAT — один из самых прямых путей сигнализации: от рецептора на мембране до включения генов в ядре всего в несколько шагов.',
    'ПЦР удваивает ДНК за цикл: 20 циклов — и из одной молекулы получится больше миллиона копий.',
    'Секвенирование по Сэнгеру изобрели в 1977 году, и оно до сих пор остаётся золотым стандартом для подтверждения одной конкретной мутации.',
    'Nanopore читает ДНК в реальном времени, пропуская нить через белковую пору и измеряя изменения электрического тока.',
    'NGS-панель может проверить десятки генов сразу — быстрее, чем секвенировать их по одному классическим методом Сэнгера.',
    'CAR-T-клетки — это «живое лекарство»: собственные T-клетки пациента, переученные находить опухоль напрямую, без участия HLA.',
    'CRISPR-Cas9 — на самом деле бактериальная иммунная система: так бактерии запоминают вирусы, которые на них нападали.',
    'Base editing может точечно заменить одну букву ДНК на другую, вообще не разрезая обе цепи.',
    'Мышата рождаются слепыми и без шёрстки, зато их геном почти на 85% совпадает с человеческим — поэтому они частые герои лабораторных исследований.',
    'Репликация ДНК идёт сразу в обе стороны от точки начала двумя вилками — так геном копируется вдвое быстрее.',
    'На отстающей цепи ДНК синтезируется короткими кусочками — фрагментами Оказаки, которые потом сшивает ДНК-лигаза.',
    'Теломераза достраивает концы хромосом — без неё клетка теряла бы кусочек ДНК при каждом делении.',
    'У РНК-полимеразы нет «корректора» ошибок, как у ДНК-полимеразы, — но это не страшно: мРНК живёт недолго.',
    'Один и тот же ген может дать разные белки благодаря альтернативному сплайсингу — интроны вырезаются по-разному.',
    'Энхансер может «включать» ген, находясь за десятки тысяч пар оснований от него, — ДНК просто образует петлю.',
    'В норме NF-κB сидит в цитоплазме «под замком» у белка IκB — сигнал снимает замок, и он бежит в ядро.',
    'p53 называют «стражем генома»: при повреждении ДНК он может остановить деление клетки или запустить её гибель.',
    'Белок p53 в норме живёт всего несколько минут — MDM2 постоянно его разрушает, пока не появится сигнал тревоги.',
    'RAS — это молекулярный переключатель: включён с GTP, выключен с GDP, и «залипает» включённым при мутациях вроде G12D.',
    'Кариотип показывает крупные поломки хромосом, а точечные мутации внутри генов видит только секвенирование.',
    'FISH-зонд светится там, где находит свою последовательность ДНК, — так на одном стекле видно конкретную перестройку.',
    'Таргетные ингибиторы часто просто затыкают «карман» киназы, куда в норме садится АТФ, — и фермент перестаёт работать.',
    'Венетоклакс — не яд для клетки, а «освободитель»: он снимает блок с её собственной программы гибели.',
    'Биспецифическое антитело одной «рукой» держит опухолевую клетку, а другой — T-лимфоцит, сближая их для атаки.',
    'CAR-T-клеткам не нужен HLA, чтобы узнать опухоль, — они просто «видят» нужный белок прямо на её поверхности.',
    'Генная терапия гемофилии часто использует вирус AAV: он доставляет ген в печень и остаётся там, не встраиваясь в ДНК.',
    'Base editing умеет превратить C в T или A в G прямо в ДНК, вообще не разрезая обе цепи спирали.',
    'Первый геном человека расшифровывали больше 10 лет и потратили около 3 млрд долларов — сегодня это можно сделать за один день.',
    'Слово «мутация» звучит страшно, но большинство из них безобидны: клетка либо чинит их, либо просто не замечает.'
  ];

  const KEY_COUNT = 'ws.rat.facts';
  const KEY_COOLDOWN = 'ws.rat.cooldownUntil';
  const COOLDOWN_MS = 60000;
  const PORTRAIT = 'media/images/brand/rat-simple.svg';

  function loadCount() { try { return +localStorage.getItem(KEY_COUNT) || 0; } catch (e) { return 0; } }
  function saveCount(n) { try { localStorage.setItem(KEY_COUNT, n); } catch (e) { /* ignore */ } }
  function loadCooldownUntil() { try { return +localStorage.getItem(KEY_COOLDOWN) || 0; } catch (e) { return 0; } }
  function saveCooldownUntil(ts) { try { localStorage.setItem(KEY_COOLDOWN, ts); } catch (e) { /* ignore */ } }

  const BURROW_SVG = '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><ellipse cx="24" cy="36" rx="20" ry="8" fill="#6b4a2f"/><ellipse cx="24" cy="34" rx="13" ry="7" fill="#1c130c"/><path d="M6 36 Q24 20 42 36" stroke="#8a6238" stroke-width="4" fill="none" stroke-linecap="round"/></svg>';

  function mount() {
    let root = document.getElementById('rat-widget');
    if (!root) { root = document.createElement('div'); root.id = 'rat-widget'; document.body.appendChild(root); }

    const st = { factsRead: loadCount(), lastIdx: -1, dialogueEl: null };

    root.innerHTML =
      '<div class="rat-runner" id="rat-runner">' +
      '<button type="button" class="rat-runner-btn" aria-label="Крыска-помощница: нажмите, чтобы узнать факт"><img src="' + PORTRAIT + '" alt="" draggable="false"></button>' +
      '<button type="button" class="rat-dismiss" id="rat-dismiss" aria-label="Убрать крыску в норку">×</button>' +
      '</div>' +
      '<button type="button" class="rat-burrow" id="rat-burrow" aria-label="Позвать крыску обратно">' + BURROW_SVG + '</button>';

    const runner = root.querySelector('#rat-runner');
    const runnerBtn = root.querySelector('.rat-runner-btn');
    const dismiss = root.querySelector('#rat-dismiss');
    const burrow = root.querySelector('#rat-burrow');

    function closeDialogue() {
      if (st.dialogueEl) { st.dialogueEl.remove(); st.dialogueEl = null; }
    }

    function showBubble(html, onClose) {
      closeDialogue();
      const wrap = document.createElement('div');
      wrap.className = 'rat-bubble';
      wrap.innerHTML =
        '<div class="lab-dialogue" style="cursor:default"><img class="lab-portrait" src="' + PORTRAIT + '" alt="Крыска">' +
        '<div class="lab-dlg-text"><p style="margin:0">' + html + '</p></div>' +
        '<button type="button" class="rat-close" aria-label="Закрыть">×</button></div>';
      root.appendChild(wrap);
      st.dialogueEl = wrap;
      wrap.querySelector('.rat-close').addEventListener('click', () => { closeDialogue(); if (onClose) onClose(); });
      return wrap;
    }

    function hideToBurrow() {
      closeDialogue();
      runner.classList.add('is-hidden');
      burrow.classList.add('show');
    }

    function comeOutOfBurrow() {
      runner.classList.remove('is-hidden');
      burrow.classList.remove('show');
    }

    function pickFact() {
      if (FACTS.length === 1) return FACTS[0];
      let i;
      do { i = Math.floor(Math.random() * FACTS.length); } while (i === st.lastIdx);
      st.lastIdx = i;
      return FACTS[i];
    }

    function celebrate() {
      runner.classList.add('is-paused');
      showBubble('Ура, ты уже узнал(а) 5 фактов! Так держать! <span class="rat-heart">💕</span>');
      const until = Date.now() + COOLDOWN_MS;
      saveCooldownUntil(until);
      setTimeout(() => { hideToBurrow(); runner.classList.remove('is-paused'); }, 2600);
    }

    function onRatClick() {
      st.factsRead++;
      saveCount(st.factsRead);
      runner.classList.add('is-paused');
      if (st.factsRead % 5 === 0) {
        celebrate();
        return;
      }
      showBubble(pickFact(), () => runner.classList.remove('is-paused'));
    }

    function onBurrowClick() {
      if (Date.now() < loadCooldownUntil()) {
        showBubble('Иди учись! 📚', null);
        setTimeout(closeDialogue, 1800);
        return;
      }
      comeOutOfBurrow();
    }

    runnerBtn.addEventListener('click', onRatClick);
    dismiss.addEventListener('click', e => { e.stopPropagation(); hideToBurrow(); });
    burrow.addEventListener('click', onBurrowClick);

    if (Date.now() < loadCooldownUntil()) hideToBurrow();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  WS.rat = { mount };
})(window.WS = window.WS || {});
