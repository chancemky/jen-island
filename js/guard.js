// Boot guard: a plain script that runs before the game's modules. If the game can't
// start (an error while loading or starting, or files that don't match after an update)
// the player sees a card with "Try again" and "Repair" instead of an empty screen, and
// the error is reported (jen_island_errors) even though the game itself never ran.
// Repair clears this device's cached copy of the game files (never the island) and reloads.
(function () {
  var URL_ = 'https://cgbaigeergwvbmghrakb.supabase.co/rest/v1/jen_island_errors', KEY = 'sb_publishable_w1-MKpH0ysDz_nXEt25cXA_n_1H5DBo';
  var sent = 0, shown = false, errors = [];
  function device() { try { return localStorage.getItem('jenisland.device') || 'guard'; } catch (e) { return 'guard'; } }
  function report(message, stack) {
    message = String(message || 'unknown error').slice(0, 480);
    errors.push(message);
    if (sent++ >= 5 || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    try {
      fetch(URL_, { method: 'POST', keepalive: true, headers: { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify([{ device: device(), version: 'guard', message: '[boot] ' + message, stack: String(stack || '').slice(0, 3800), context: { ua: navigator.userAgent.slice(0, 160), standalone: !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)), started: !!window.__started } }]) }).catch(function () {});
    } catch (e) {}
  }
  addEventListener('error', function (e) { report(e.message || (e.target && e.target.src ? 'failed to load ' + e.target.src : 'error'), e.error && e.error.stack); if (!window.__started) soon(); }, true);
  addEventListener('unhandledrejection', function (e) { var r = e.reason || {}; report(r.message || r, r.stack); if (!window.__started) soon(); });

  function repair() {
    var done = function () { location.replace(location.pathname + '?repaired=' + Date.now()); };
    var jobs = [];
    try { if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })); } catch (e) {}
    try { if (window.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })); } catch (e) {}
    // refetch every game file past the browser's cache so the next start has matching files
    jobs.push(fetch('sw.js', { cache: 'reload' }).then(function (r) { return r.text(); }).then(function (t) {
      var m = t.match(/const SHELL = (\[[^\]]*\])/), list = m ? JSON.parse(m[1]) : [];
      return Promise.all(list.map(function (f) { return fetch(f, { cache: 'reload' }).catch(function () {}); }));
    }).catch(function () {}));
    Promise.all(jobs).then(done, done);
    setTimeout(done, 6000);
  }
  window.__repairGame = repair;
  // the game's own start failed: show the card now, with what went wrong
  window.__guardFail = function (e) { lastError = (e && (e.message || String(e))) || ''; report('[start] ' + lastError, e && e.stack); card(true); };
  var lastError = '';
  function card(force) {
    if (shown || (window.__started && !force)) return; shown = true;
    var vi = false; try { vi = (localStorage.getItem('jenisland.lang') || '') === 'vi'; } catch (e) {}
    var el = document.createElement('div');
    el.setAttribute('style', 'position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:rgba(40,28,24,.55);font-family:Nunito,system-ui,sans-serif;padding:20px');
    el.innerHTML = '<div style="background:#fffaf0;border:3px solid #5b3f36;border-radius:24px;padding:22px;max-width:340px;text-align:center;color:#5b3f36">'
      + '<h2 style="margin:0 0 8px;font-size:21px">' + (vi ? 'Ối, game chưa mở được' : 'Oops, the island didn\'t open') + '</h2>'
      + '<p style="font-weight:700;line-height:1.4;margin:0 0 16px">' + (vi ? 'Hòn đảo của bạn vẫn an toàn. Thử lại, hoặc bấm Sửa để tải lại các tệp của game.' : 'Your island is safe. Try again, or tap Repair to download the game\'s files fresh.') + '</p>'
      + (lastError ? '<p style="font-size:11px;opacity:.7;margin:-8px 0 12px;word-break:break-word">' + lastError.replace(/[<>&]/g, '') + '</p>' : '')
      + '<button data-a="retry" style="font:inherit;font-weight:900;font-size:16px;width:100%;padding:12px;border-radius:999px;border:3px solid #5b3f36;background:#fff;margin-bottom:8px">' + (vi ? 'Thử lại' : 'Try again') + '</button>'
      + '<button data-a="repair" style="font:inherit;font-weight:900;font-size:16px;width:100%;padding:12px;border-radius:999px;border:3px solid #5b3f36;background:#f08ca0;color:#fff">' + (vi ? 'Sửa và tải lại' : 'Repair') + '</button></div>';
    (document.body || document.documentElement).appendChild(el);
    el.querySelector('[data-a="retry"]').onclick = function () { location.reload(); };
    el.querySelector('[data-a="repair"]').onclick = function () { this.textContent = vi ? 'Đang sửa…' : 'Repairing…'; this.disabled = true; repair(); };
  }
  var timer = null;
  function soon() { clearTimeout(timer); timer = setTimeout(card, 2500); }
  // nothing started after a long wait (a hung start): offer the same way out. The clock
  // stops while the game waits for the player (the welcome screen, the password form).
  var hang = null;
  function arm() { clearTimeout(hang); hang = setTimeout(function () { if (!window.__started) { report('the game did not start within 45 s'); card(); } }, 45000); }
  window.__guardWait = function (waiting) { if (waiting) clearTimeout(hang); else arm(); };
  arm();
})();
