/* ── Contraseña común del Hub + distintivo de estrellitas ──
 * Aviso: es un freno de cortesía en el navegador, no seguridad real. */
(function () {
  'use strict';
  var HASH = 2610499252639749; // hash de la contraseña (no se guarda en claro)
  function hash(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  var overlay, input, errEl, msgEl, cb = null;

  function build() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'pwd-overlay';
    overlay.hidden = true;
    var box = document.createElement('div');
    box.className = 'pwd-modal';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    var h = document.createElement('h3'); h.textContent = 'Acción protegida';
    msgEl = document.createElement('p');
    input = document.createElement('input'); input.type = 'password'; input.placeholder = 'Contraseña'; input.autocomplete = 'off';
    errEl = document.createElement('div'); errEl.className = 'pwd-err'; errEl.textContent = 'Contraseña incorrecta'; errEl.hidden = true;
    var row = document.createElement('div'); row.className = 'pwd-btns';
    var no = document.createElement('button'); no.type = 'button'; no.className = 'pwd-btn cancel'; no.textContent = 'Cancelar';
    var ok = document.createElement('button'); ok.type = 'button'; ok.className = 'pwd-btn ok'; ok.textContent = 'Confirmar';
    row.appendChild(no); row.appendChild(ok);
    [h, msgEl, input, errEl, row].forEach(function (n) { box.appendChild(n); });
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    function close() { overlay.hidden = true; cb = null; }
    function confirm() {
      if (hash(input.value) === HASH) { var f = cb; close(); if (f) f(); }
      else { errEl.hidden = false; input.value = ''; input.focus(); }
    }
    no.addEventListener('click', close);
    ok.addEventListener('click', confirm);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') close(); });
  }
  function ask(msg, fn) {
    build();
    cb = fn;
    msgEl.textContent = msg || 'Introduce la contraseña para continuar.';
    errEl.hidden = true; input.value = '';
    overlay.hidden = false;
    setTimeout(function () { input.focus(); }, 30);
  }
  function badge() {
    if (document.getElementById('pwdBadge')) return;
    var b = document.createElement('div');
    b.id = 'pwdBadge';
    b.className = 'pwd-badge';
    b.title = 'Las acciones de importar y borrar piden contraseña';
    b.setAttribute('aria-label', 'Acciones protegidas con contraseña');
    b.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><span>✱✱✱✱✱✱✱✱✱✱✱✱✱</span>';
    document.body.appendChild(b);
  }
  window.HubAuth = { ask: ask, badge: badge };
  document.addEventListener('DOMContentLoaded', function () {
    var app = document.body.getAttribute('data-app');
    if (app === 'vac' || app === 'org') badge();
  });
})();

/* Hub de Admisiones ESD — montaje común de todas las páginas.
 * Cada página declara en <body>:
 *   data-root   ruta relativa a la raíz del repo ("", "../", "../../")
 *   data-sub    subtítulo de la cabecera
 *   data-back   (opcional) enlace del botón "Inicio"
 *   data-funnel "1" para mostrar el embudo y la tarjeta Matrículas
 * y su contenido dentro de <main id="page">.
 */
(function () {
  'use strict';

  var body = document.body;
  var ROOT = body.getAttribute('data-root') || '';
  var SUB = body.getAttribute('data-sub') || 'Admisiones';
  var BACK = body.getAttribute('data-back') || '';
  var FUNNEL = body.getAttribute('data-funnel') === '1';
  var KEY = 'esd_accesos_v1';

  var DEFAULTS = [
    { nombre: 'CRM de admisiones', url: '' },
    { nombre: 'Calendario de entrevistas', url: '' },
    { nombre: 'Plantillas de email', url: '' }
  ];

  /* ───────── utilidades ───────── */
  function html(str) {
    var t = document.createElement('template');
    t.innerHTML = str.trim();
    return t.content.firstChild;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ───────── estructura: fondo + cabecera + página + embudo + pie ───────── */
  var page = document.getElementById('page');
  var wrap = document.createElement('div');
  wrap.className = 'wrap t-dark';
  wrap.id = 'wrap';
  body.insertBefore(wrap, page);

  wrap.appendChild(html('<div class="bg-image"></div>'));
  wrap.appendChild(html('<div class="bg-overlay"></div>'));
  wrap.appendChild(html('<div class="bg-grid"></div>'));

  var backHtml = BACK
    ? '<a class="back-btn" href="' + esc(BACK) + '" aria-label="Volver al inicio">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>Inicio</a>'
    : '';

  wrap.appendChild(html(
    '<header class="topbar">' +
      '<div class="brand">' +
        '<div class="brand-sq"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
          '<rect x="2" y="2" width="7" height="7" rx="1.5" fill="#FB923C"/><rect x="11" y="2" width="7" height="7" rx="1.5" fill="#A78BFA"/>' +
          '<rect x="2" y="11" width="7" height="7" rx="1.5" fill="#A78BFA"/><rect x="11" y="11" width="7" height="7" rx="1.5" fill="#FB923C"/></svg></div>' +
        '<div><div class="brand-name">Hub de Admisiones</div><div class="brand-sub">' + esc(SUB) + '</div></div>' +
        backHtml +
      '</div>' +
      '<div class="topbar-r">' +
        '<div class="logo-pill" style="background:#D6E6F8"><img style="mix-blend-mode:multiply" src="' + ROOT + 'assets/img/logo_letra_sin_fondo.png" alt="Grupo Planeta"></div></div>' +
    '</header>'
  ));

  wrap.appendChild(page);

  if (FUNNEL) {
    function card(t) {
      return '<div class="fcard"><div class="fcard-t">' + t + '</div><div class="fcard-n">—</div><div class="fcard-c">Dato por conectar</div></div>';
    }
    wrap.appendChild(html(
      '<section class="embudo"><div class="cards">' +
        card('Leads') + card('Contactados') + card('Entrevistados') + card('PF') +
      '</div><div class="mat-row"><div class="mat"><div class="mat-t">Matrículas</div><div class="mat-n">—</div><div class="mat-c">Por conectar</div></div></div></section>'
    ));
  }

  wrap.appendChild(html('<footer class="foot">Hub de Admisiones ESD</footer>'));

  /* ───────── Gatos decorativos (data-gatos="birrete,planeta,ia,tumbado") ─────────
   * Los GIF van en assets/img/gato-<nombre>.webp. Si falta alguno, simplemente no se muestra. */
  (function () {
    var lista = (body.getAttribute('data-gatos') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    lista.forEach(function (nombre) {
      var img = document.createElement('img');
      img.className = 'gato gato-' + nombre;
      img.alt = nombre === 'ia' ? 'Asistente' : '';
      if (nombre !== 'ia') img.setAttribute('aria-hidden', 'true');
      img.src = ROOT + 'assets/img/gato-' + nombre + '.webp';
      img.addEventListener('error', function () { img.remove(); var b = document.getElementById('gatoBocadillo'); if (b && nombre === 'ia') b.remove(); });

      if (nombre !== 'ia') { wrap.appendChild(img); return; }

      /* Gato IA: más pequeño, abajo a la derecha, con bocadillo */
      var caja = document.createElement('div');
      caja.className = 'gato-ia-box';
      var bocadillo = document.createElement('div');
      bocadillo.id = 'gatoBocadillo';
      bocadillo.className = 'gato-bocadillo';
      bocadillo.setAttribute('role', 'status');
      bocadillo.appendChild(document.createTextNode('m'));
      var ia = document.createElement('span');
      ia.className = 'gato-ia-txt';
      ia.textContent = 'IA';
      bocadillo.appendChild(ia);
      bocadillo.appendChild(document.createTextNode('u!'));
      caja.appendChild(bocadillo);
      var btnGato = document.createElement('button');
      btnGato.type = 'button';
      btnGato.className = 'gato-ia-btn';
      btnGato.setAttribute('aria-label', 'Asistente mIAu');
      btnGato.appendChild(img);
      caja.appendChild(btnGato);
      wrap.appendChild(caja);

      var timer = null;
      function mostrar() {
        bocadillo.classList.add('on');
        clearTimeout(timer);
        timer = setTimeout(function () { bocadillo.classList.remove('on'); }, 9000);
      }
      btnGato.addEventListener('click', function () {
        if (bocadillo.classList.contains('on')) { bocadillo.classList.remove('on'); clearTimeout(timer); }
        else mostrar();
      });
      setTimeout(mostrar, 1200);
    });
  })();

  /* ───────── Accesos rápidos (editables, como en el AdminHub) ───────── */
  var items = [];
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    items = Array.isArray(saved) ? saved : DEFAULTS.slice();
  } catch (e) { items = DEFAULTS.slice(); }

  /* Compartido para todos los usuarios: Cloudflare Worker + KV (el mismo del AdminHub).
   * localStorage queda como copia de respaldo si el Worker no responde. */
  var WORKER_URL = ((window.HUB_CONFIG || {}).WORKER_URL || '').replace(/\/+$/, '');

  var pending = 0; // operaciones en curso: mientras haya, no se pisa la lista con una lectura antigua

  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function ensureIds(arr) {
    arr.forEach(function (a) { if (!a.id) a.id = newId(); });
    return arr;
  }
  function saveLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* sin almacenamiento */ }
  }
  ensureIds(items);

  /* Cada cambio se aplica sobre la ÚLTIMA lista de Cloudflare (leer → modificar → guardar),
   * así no se pisan los accesos que han añadido otras personas. */
  function applyOp(list, op) {
    var i;
    if (op.t === 'add') { list.unshift(op.item); }
    else if (op.t === 'edit') {
      for (i = 0; i < list.length; i++) if (list[i].id === op.id) { list[i].nombre = op.nombre; list[i].url = op.url; }
    } else if (op.t === 'del') {
      list = list.filter(function (a) { return a.id !== op.id; });
    } else if (op.t === 'move') {
      var fi = -1, ti = -1;
      for (i = 0; i < list.length; i++) { if (list[i].id === op.id) fi = i; if (list[i].id === op.target) ti = i; }
      if (fi >= 0 && ti >= 0 && fi !== ti) { var m = list.splice(fi, 1)[0]; list.splice(ti, 0, m); }
    }
    return list;
  }
  function parseRemote(data) {
    if (!data || !data.value) return null;
    var v = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    return Array.isArray(v) ? ensureIds(v) : null;
  }
  function change(op) {
    // 1) se ve al instante
    items = applyOp(items.slice(), op);
    saveLocal(); renderList();
    if (!WORKER_URL) return;
    // 2) se sincroniza con la lista compartida
    pending++;
    fetch(WORKER_URL + '/kv?key=' + encodeURIComponent(KEY))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var base = parseRemote(data);
        // Si Cloudflare está vacío, la primera lista que se guarda lo inicializa.
        var merged = base ? applyOp(base, op) : items;
        return fetch(WORKER_URL + '/kv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: KEY, value: merged })
        }).then(function () { items = merged; saveLocal(); });
      })
      .catch(function () { /* sin red: queda la copia local */ })
      .then(function () { pending--; renderList(); });
  }

  function loadRemote() {
    if (!WORKER_URL || pending) return;
    fetch(WORKER_URL + '/kv?key=' + encodeURIComponent(KEY))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (pending) return;
        var v = parseRemote(data);
        if (!v) return;
        items = v; saveLocal(); renderList();
      })
      .catch(function () { /* sin red: se usa la copia local */ });
  }

  var PENCIL = '<svg width="{S}" height="{S}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>';

  var drawer = html(
    '<div class="accesos-wrap" id="accWrap">' +
      '<div class="accesos-panel">' +
        '<div class="accesos-panel-header"><span class="accesos-panel-title">Accesos rápidos</span>' +
          '<button class="accesos-add-btn" id="accAdd" type="button" title="Añadir acceso" aria-label="Añadir acceso">' + PENCIL.replace(/\{S\}/g, '12') + '</button></div>' +
        '<div id="accList"></div>' +
      '</div>' +
      '<button class="accesos-card" id="accCard" type="button" aria-label="Accesos rápidos">' +
        '<div class="acc-icon-wrap"><div class="acc-ring2"></div><div class="acc-ring1"></div>' +
          '<div class="acc-icon-inner"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f0a830" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div></div>' +
        '<span class="acc-label">Accesos Rápidos</span>' +
      '</button>' +
    '</div>'
  );
  wrap.appendChild(drawer);

  var modal = html(
    '<div class="acc-modal-overlay" id="accModal" hidden>' +
      '<div class="acc-modal" role="dialog" aria-modal="true" aria-labelledby="accTitle">' +
        '<div class="acc-modal-head"><h2 id="accTitle">Nuevo acceso</h2>' +
          '<button class="acc-modal-close" id="accClose" type="button" aria-label="Cerrar">✕</button></div>' +
        '<div class="acc-field"><label for="accNombre">Nombre *</label><input id="accNombre" type="text" placeholder="Nombre del acceso"></div>' +
        '<div class="acc-field"><label for="accUrl">URL</label><input id="accUrl" type="url" placeholder="https://…"></div>' +
        '<p class="acc-err" id="accErr" hidden></p>' +
        '<div class="acc-modal-foot">' +
          '<button class="acc-btn-delete" id="accDel" type="button" hidden>' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg><span id="accDelTxt">Eliminar</span></button>' +
          '<button class="acc-btn-cancel" id="accCancel" type="button">Cancelar</button>' +
          '<button class="acc-btn-save" id="accSave" type="button">Guardar</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
  body.appendChild(modal);

  var list = document.getElementById('accList');
  var dragIdx = null;
  var editIdx = null;
  var confirmDel = false;

  function renderList() {
    list.textContent = '';
    if (!items.length) {
      var empty = document.createElement('div');
      empty.className = 'acc-loading';
      empty.textContent = 'Sin accesos todavía';
      list.appendChild(empty);
      return;
    }
    items.forEach(function (a, i) {
      var row = document.createElement('div');
      row.className = 'acc-item';
      row.draggable = true;
      row.style.marginBottom = '5px';

      var dot = document.createElement('div');
      dot.className = 'acc-dot';

      var txt = document.createElement('span');
      txt.className = 'acc-text' + (a.url ? ' link' : '');
      txt.textContent = a.nombre;
      if (a.url) txt.addEventListener('click', function () { window.open(a.url, '_blank', 'noopener'); });

      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'acc-edit';
      edit.setAttribute('aria-label', 'Editar acceso');
      edit.innerHTML = PENCIL.replace(/\{S\}/g, '11');
      edit.addEventListener('click', function (ev) { ev.stopPropagation(); openModal(i); });

      row.appendChild(dot); row.appendChild(txt); row.appendChild(edit);

      row.addEventListener('dragstart', function (ev) {
        dragIdx = i;
        try { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(i)); } catch (e) {}
        setTimeout(function () { row.classList.add('dragging'); }, 0);
      });
      row.addEventListener('dragend', function () {
        row.classList.remove('dragging');
        [].forEach.call(list.querySelectorAll('.acc-item'), function (x) { x.classList.remove('drag-over'); });
        dragIdx = null;
      });
      row.addEventListener('dragover', function (ev) {
        ev.preventDefault();
        if (dragIdx === null) return;
        [].forEach.call(list.querySelectorAll('.acc-item'), function (x) { x.classList.remove('drag-over'); });
        row.classList.add('drag-over');
      });
      row.addEventListener('drop', function (ev) {
        ev.preventDefault();
        if (dragIdx === null || dragIdx === i) return;
        change({ t: 'move', id: items[dragIdx].id, target: items[i].id });
      });

      list.appendChild(row);
    });
  }

  var nombreIn = document.getElementById('accNombre');
  var urlIn = document.getElementById('accUrl');
  var errP = document.getElementById('accErr');
  var delBtn = document.getElementById('accDel');
  var delTxt = document.getElementById('accDelTxt');

  function setErr(msg) { errP.textContent = msg || ''; errP.hidden = !msg; }

  function openModal(idx) {
    editIdx = (typeof idx === 'number') ? idx : null;
    confirmDel = false;
    delTxt.textContent = 'Eliminar';
    setErr('');
    document.getElementById('accTitle').textContent = editIdx === null ? 'Nuevo acceso' : 'Editar acceso';
    nombreIn.value = editIdx === null ? '' : items[editIdx].nombre;
    urlIn.value = editIdx === null ? '' : (items[editIdx].url || '');
    delBtn.hidden = editIdx === null;
    modal.hidden = false;
    setTimeout(function () { nombreIn.focus(); }, 30);
  }
  function closeModal() { modal.hidden = true; }

  document.getElementById('accAdd').addEventListener('click', function (e) { e.stopPropagation(); openModal(); });
  document.getElementById('accClose').addEventListener('click', closeModal);
  document.getElementById('accCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  nombreIn.addEventListener('input', function () { setErr(''); });

  document.getElementById('accSave').addEventListener('click', function () {
    var nombre = nombreIn.value.trim();
    var url = urlIn.value.trim();
    if (!nombre) { setErr('El nombre es obligatorio.'); return; }
    if (editIdx !== null) change({ t: 'edit', id: items[editIdx].id, nombre: nombre, url: url });
    else change({ t: 'add', item: { id: newId(), nombre: nombre, url: url } });
    closeModal();
  });

  delBtn.addEventListener('click', function () {
    if (editIdx === null) return;
    var idx = editIdx;
    window.HubAuth.ask('Introduce la contraseña para eliminar este acceso.', function () {
      change({ t: 'del', id: items[idx].id });
      closeModal();
    });
  });

  var accWrap = document.getElementById('accWrap');
  document.getElementById('accCard').addEventListener('click', function (e) {
    e.stopPropagation();
    accWrap.classList.toggle('open');
    if (accWrap.classList.contains('open')) loadRemote();
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#accWrap') && !e.target.closest('#accModal')) accWrap.classList.remove('open');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeModal(); accWrap.classList.remove('open'); }
  });

  renderList();
  loadRemote();
})();
