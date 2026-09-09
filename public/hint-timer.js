(function () {
  var hint = document.querySelector('.mini-tip');
  if (!hint) return;

  var WAIT_MS = 5 * 60 * 1000;
  var storageKey = 'ctf_nivel_inicio_' + window.location.pathname;

  var start = 0;
  try {
    start = Number(window.localStorage.getItem(storageKey));
    if (!start) {
      start = Date.now();
      window.localStorage.setItem(storageKey, String(start));
    }
  } catch (e) {
    start = Date.now();
  }

  function revelarAyuda() {
    hint.hidden = false;
  }

  var elapsed = Date.now() - start;
  if (elapsed >= WAIT_MS) {
    revelarAyuda();
  } else {
    window.setTimeout(revelarAyuda, WAIT_MS - elapsed);
  }
})();
