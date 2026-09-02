(function () {
  "use strict";

  var NAMES = {1:"Судья", 2:"Вдова", 3:"Мясник", 4:"Кантор"};
  var STORE_KEY = "d4-lichnost/v1";

  var counts = {1:0, 2:0, 3:0, 4:0};
  var total = 0;
  var last = null;
  var rolling = false;

  var faces = {1:document.getElementById("f1"), 2:document.getElementById("f2"),
               3:document.getElementById("f3"), 4:document.getElementById("f4")};
  var rollBtn = document.getElementById("roll");
  var resetBtn = document.getElementById("reset");
  var idleEl = document.getElementById("idle");
  var valEl = document.getElementById("val");
  var whoEl = document.getElementById("who");
  var totalEl = document.getElementById("total");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- тактильный отклик ---------------------------------------------- */

  var canVibrate = typeof navigator !== "undefined" &&
                   typeof navigator.vibrate === "function";

  function buzz(pattern){
    if (!canVibrate) return;
    try { navigator.vibrate(pattern); } catch (e) { /* нет мотора — молчим */ }
  }

  /* ---- хранилище ------------------------------------------------------- */

  function save(){
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        counts: counts, total: total, last: last
      }));
    } catch (e) { /* приватный режим или полная квота — просто не сохраняем */ }
  }

  function load(){
    var raw;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return; }
    if (!raw) return;

    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (!data || typeof data !== "object") return;

    var sum = 0;
    for (var i = 1; i <= 4; i++){
      var n = data.counts && Number(data.counts[i]);
      counts[i] = (isFinite(n) && n >= 0) ? Math.floor(n) : 0;
      sum += counts[i];
    }
    var t = Number(data.total);
    total = (isFinite(t) && t >= 0) ? Math.floor(t) : sum;
    last = (data.last >= 1 && data.last <= 4) ? Math.floor(data.last) : null;
  }

  function clearStore(){
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ok */ }
  }

  /* ---- отрисовка ------------------------------------------------------- */

  function clearFaces(){
    for (var k in faces){ faces[k].classList.remove("lit", "locked"); }
  }

  function paintTally(){
    for (var i = 1; i <= 4; i++){
      document.getElementById("c" + i).textContent = counts[i];
    }
    totalEl.textContent = total;
  }

  function paintResult(n){
    if (n == null){
      valEl.hidden = true;
      whoEl.hidden = true;
      idleEl.hidden = false;
      idleEl.textContent = "Грань ещё не выпала";
      return;
    }
    idleEl.hidden = true;
    valEl.hidden = false;
    whoEl.hidden = false;
    valEl.textContent = "1d4 = " + n;
    whoEl.textContent = NAMES[n];
    faces[n].classList.add("locked");
  }

  function show(n){
    last = n;
    counts[n]++;
    total++;
    paintResult(n);
    paintTally();
    save();
    buzz(55); // фиксация грани — один импульс
  }

  /* ---- бросок ---------------------------------------------------------- */

  function roll(){
    if (rolling) return;
    rolling = true;
    rollBtn.disabled = true;
    clearFaces();
    valEl.hidden = true;
    whoEl.hidden = true;
    idleEl.hidden = false;
    idleEl.textContent = "Кость катится";

    var n = Math.floor(Math.random() * 4) + 1;

    if (reduced){
      idleEl.hidden = true;
      show(n);
      rolling = false;
      rollBtn.disabled = false;
      return;
    }

    var step = 0;
    var steps = 15;

    // короткая серия на всё время анимации: щелчок на каждый оборот грани
    if (canVibrate){
      var pattern = [];
      for (var s = 0; s < steps; s++){
        pattern.push(10, Math.max(1, Math.round(55 + (s + 1) * (s + 1) * 1.6) - 10));
      }
      buzz(pattern);
    }

    function tick(){
      clearFaces();
      if (step < steps){
        var f = (step % 4) + 1;
        faces[f].classList.add("lit");
        step++;
        setTimeout(tick, 55 + step * step * 1.6);
      } else {
        idleEl.hidden = true;
        show(n);
        rolling = false;
        rollBtn.disabled = false;
      }
    }
    tick();
  }

  function reset(){
    if (rolling) return;
    counts = {1:0, 2:0, 3:0, 4:0};
    total = 0;
    last = null;
    paintTally();
    clearFaces();
    paintResult(null);
    clearStore();
  }

  rollBtn.addEventListener("click", roll);
  resetBtn.addEventListener("click", reset);

  /* ---- старт ----------------------------------------------------------- */

  load();
  paintTally();
  if (last != null) paintResult(last);

  /* ---- service worker -------------------------------------------------- */

  if ("serviceWorker" in navigator){
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("./sw.js").catch(function(){
        /* офлайн-кеша не будет, приложение всё равно работает */
      });
    });
  }
})();
