/* Hub de Admisiones ESD — Organízate (tareas YO / EQUIPO).
 * <body data-equipo="vero|lisel|matias|todos">: JE = su equipo; todos = vista unificada de DV.
 * Datos en localStorage (clave esd_org_v1): solo visibles en este navegador.
 */
(function () {
  'use strict';

  var KEY = 'esd_org_v1';
  var JES = {
    vero: { n: 'Vero', c: '#FB923C' },
    lisel: { n: 'Lisel', c: '#A78BFA' },
    matias: { n: 'Matías', c: '#22D3EE' },
    dv: { n: 'DV', c: '#F0A830' }
  };
  var PRIO = { alta: 'Alta', media: 'Media', baja: 'Baja' };
  var COLS = [['pend', 'Pendiente'], ['curso', 'En curso'], ['hecha', 'Hecha']];

  var scope = document.body.getAttribute('data-equipo') || 'todos';
  var isDV = scope === 'todos';
  var root = document.getElementById('org-root');
  if (!root) return;

  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && Array.isArray(d.colabs) && Array.isArray(d.tareas)) return d;
    } catch (e) { /* sin datos */ }
    return { colabs: [], tareas: [] };
  }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  var ui = { amb: 'yo', filt: { vero: true, lisel: true, matias: true, dv: true }, msg: '', ok: true };

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function btn(label, cls, fn) {
    var b = el('button', cls, label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function fmt(d) { return d ? d.split('-').reverse().join('/') : 'Sin fecha'; }
  function setMsg(t, ok) { ui.msg = t; ui.ok = ok !== false; }
  function colabById(id) { return S.colabs.filter(function (c) { return c.id === id; })[0]; }
  function jeTag(k) {
    var t = el('span', 'org-tag', JES[k].n);
    t.style.background = JES[k].c;
    return t;
  }
  function select(opts, val) {
    var s = el('select', 'vac-in');
    opts.forEach(function (o) {
      var op = el('option', null, o[1]); op.value = o[0];
      if (o[0] === val) op.selected = true;
      s.appendChild(op);
    });
    return s;
  }
  function download(name, text) {
    var blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function parseTable(text) {
    return text.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); }).map(function (l) {
      var d = l.indexOf('\t') >= 0 ? '\t' : (l.indexOf(';') >= 0 ? ';' : ',');
      return l.split(d).map(function (c) { return c.trim().replace(/^"|"$/g, ''); });
    });
  }

  /* ───────── datos visibles ───────── */
  function visTareas() {
    return S.tareas.filter(function (t) {
      if (t.ambito !== ui.amb) return false;
      return isDV ? ui.filt[t.je] : t.je === scope;
    });
  }
  function visColabs() {
    return S.colabs.filter(function (c) { return isDV ? ui.filt[c.je] : c.je === scope; });
  }

  /* ───────── cabecera, pestañas YO/EQUIPO, filtros ───────── */
  function header() {
    var box = el('div', 'vac-head');
    var t = el('div');
    t.appendChild(el('h1', 'vac-title', 'Organízate'));
    var sub = el('div', 'vac-sub', isDV ? 'Vista unificada · todos los JE' : 'Equipo ' + JES[scope].n);
    sub.style.color = '#c4b5fd';
    t.appendChild(sub);
    box.appendChild(t);

    var all = S.tareas.filter(function (x) { return isDV ? ui.filt[x.je] : x.je === scope; });
    var td = today();
    var stats = el('div', 'vac-stats');
    [['Pendientes', all.filter(function (x) { return x.estado === 'pend'; }).length],
     ['En curso', all.filter(function (x) { return x.estado === 'curso'; }).length],
     ['Hechas', all.filter(function (x) { return x.estado === 'hecha'; }).length],
     ['Vencidas', all.filter(function (x) { return x.estado !== 'hecha' && x.fecha && x.fecha < td; }).length]].forEach(function (x) {
      var c = el('div', 'vac-stat');
      var n = el('div', 'vac-stat-n', String(x[1])); n.style.color = '#c4b5fd';
      c.appendChild(n);
      c.appendChild(el('div', 'vac-stat-l', x[0]));
      stats.appendChild(c);
    });
    box.appendChild(stats);
    return box;
  }
  function tabs() {
    var bar = el('div', 'vac-tabs');
    [['yo', 'YO'], ['eq', 'EQUIPO']].forEach(function (x) {
      bar.appendChild(btn(x[1], 'vac-tab big' + (ui.amb === x[0] ? ' on org' : ''), function () { ui.amb = x[0]; ui.msg = ''; render(); }));
    });
    if (isDV) {
      var f = el('div', 'org-filt');
      Object.keys(JES).forEach(function (k) {
        var b = btn(JES[k].n, 'org-chip' + (ui.filt[k] ? ' on' : ''), function () { ui.filt[k] = !ui.filt[k]; render(); });
        b.style.setProperty('--c', JES[k].c);
        f.appendChild(b);
      });
      bar.appendChild(f);
    }
    return bar;
  }

  /* ───────── alta de tarea ───────── */
  function addForm() {
    var form = el('div', 'vac-form');
    function field(label, node) { var f = el('label', 'vac-f'); f.appendChild(el('span', null, label)); f.appendChild(node); form.appendChild(f); }
    var tit = el('input', 'vac-in'); tit.type = 'text'; tit.placeholder = 'Nueva tarea…'; tit.style.minWidth = '220px';
    field('Tarea', tit);
    var selJe = null;
    if (isDV) { selJe = select(['dv', 'vero', 'lisel', 'matias'].map(function (k) { return [k, JES[k].n]; }), 'dv'); field('JE', selJe); }
    var selCo = null;
    if (ui.amb === 'eq') {
      var cs = visColabs();
      if (cs.length) {
        selCo = select([['', 'Sin asignar']].concat(cs.map(function (c) { return [c.id, c.nombre + (isDV ? ' · ' + JES[c.je].n : '')]; })), '');
        field('Colaborador', selCo);
      }
    }
    var fec = el('input', 'vac-in'); fec.type = 'date'; field('Fecha límite', fec);
    var pr = select([['media', 'Media'], ['alta', 'Alta'], ['baja', 'Baja']], 'media'); field('Prioridad', pr);
    form.appendChild(btn('Añadir', 'vac-btn pri org', function () {
      var t = tit.value.trim();
      if (!t) { setMsg('Escribe el título de la tarea.', false); return render(); }
      var je = isDV ? selJe.value : scope, co = selCo ? selCo.value : '';
      if (co) { var c = colabById(co); if (c) je = c.je; }
      S.tareas.push({ id: uid(), je: je, ambito: ui.amb, colab: co, titulo: t, fecha: fec.value, prio: pr.value, estado: 'pend' });
      save(); setMsg('Tarea añadida.'); render();
    }));
    return form;
  }

  /* ───────── tablero ───────── */
  function board() {
    var td = today();
    var grid = el('div', 'org-board');
    var list = visTareas();
    COLS.forEach(function (col, ci) {
      var c = el('div', 'org-col');
      var items = list.filter(function (t) { return t.estado === col[0]; });
      c.appendChild(el('div', 'org-col-t', col[1] + ' · ' + items.length));
      if (!items.length) c.appendChild(el('div', 'vac-empty', '—'));
      items.sort(function (a, b) { return (a.fecha || '9') < (b.fecha || '9') ? -1 : 1; }).forEach(function (t) {
        var card = el('div', 'org-card');
        card.style.borderLeftColor = JES[t.je].c;
        var top = el('div', 'org-card-top');
        top.appendChild(el('div', 'org-card-t', t.titulo));
        if (isDV) top.appendChild(jeTag(t.je));
        card.appendChild(top);
        var meta = el('div', 'org-meta');
        if (t.colab) { var co = colabById(t.colab); meta.appendChild(el('span', null, '👤 ' + (co ? co.nombre : '—'))); }
        var late = t.estado !== 'hecha' && t.fecha && t.fecha < td;
        meta.appendChild(el('span', late ? 'org-late' : null, '📅 ' + fmt(t.fecha) + (late ? ' · vencida' : '')));
        meta.appendChild(el('span', 'org-prio ' + t.prio, PRIO[t.prio]));
        card.appendChild(meta);
        var acts = el('div', 'vac-acts');
        if (ci > 0) acts.appendChild(btn('◂', 'vac-ico', function () { t.estado = COLS[ci - 1][0]; save(); render(); }));
        if (ci < 2) acts.appendChild(btn('▸', 'vac-ico ok', function () { t.estado = COLS[ci + 1][0]; save(); render(); }));
        acts.appendChild(btn('Borrar', 'vac-ico del', function () {
          window.HubAuth.ask('Introduce la contraseña para borrar esta tarea.', function () {
            S.tareas = S.tareas.filter(function (x) { return x.id !== t.id; });
            save(); render();
          });
        }));
        card.appendChild(acts);
        c.appendChild(card);
      });
      grid.appendChild(c);
    });
    return grid;
  }

  /* ───────── colaboradores (solo en EQUIPO) ───────── */
  function colabPanel() {
    var det = el('details', 'org-colabs');
    det.open = true;
    var cs = visColabs();
    det.appendChild(el('summary', null, 'Colaboradores (' + cs.length + ')'));

    var chips = el('div', 'org-chips');
    if (!cs.length) chips.appendChild(el('span', 'vac-empty', 'Aún no hay colaboradores. Añádelos o impórtalos desde Excel.'));
    cs.forEach(function (c) {
      var ch = el('span', 'org-colab');
      ch.style.borderColor = JES[c.je].c;
      ch.appendChild(el('span', null, c.nombre));
      if (isDV) ch.appendChild(jeTag(c.je));
      ch.appendChild(btn('✕', 'org-x', function () {
        window.HubAuth.ask('Introduce la contraseña para quitar a ' + c.nombre + ' del equipo.', function () {
          S.colabs = S.colabs.filter(function (x) { return x.id !== c.id; });
          S.tareas.forEach(function (t) { if (t.colab === c.id) t.colab = ''; });
          save(); render();
        });
      }));
      chips.appendChild(ch);
    });
    det.appendChild(chips);

    var add = el('div', 'vac-form');
    var nm = el('input', 'vac-in'); nm.type = 'text'; nm.placeholder = 'Nombre del colaborador';
    var f1 = el('label', 'vac-f'); f1.appendChild(el('span', null, 'Nombre')); f1.appendChild(nm); add.appendChild(f1);
    var selJe = null;
    if (isDV) {
      selJe = select(['vero', 'lisel', 'matias'].map(function (k) { return [k, JES[k].n]; }), 'vero');
      var f2 = el('label', 'vac-f'); f2.appendChild(el('span', null, 'Asignar a JE')); f2.appendChild(selJe); add.appendChild(f2);
    }
    add.appendChild(btn('Añadir colaborador', 'vac-btn pri org', function () {
      var n = nm.value.trim(), je = isDV ? selJe.value : scope;
      if (!n) { setMsg('Escribe un nombre.', false); return render(); }
      S.colabs.push({ id: uid(), je: je, nombre: n });
      save(); setMsg('Colaborador añadido a ' + JES[je].n + '.'); render();
    }));
    det.appendChild(add);

    var imp = el('div', 'vac-import');
    imp.appendChild(el('div', 'vac-detail-t', 'Importar colaboradores desde Excel'));
    imp.appendChild(el('p', 'vac-help', isDV
      ? 'Copia las celdas y pégalas aquí (o carga un CSV): nombre · JE (Vero, Lisel o Matías). Cada persona queda asignada al JE que indiques.'
      : 'Copia las celdas con un nombre por fila y pégalas aquí (o carga un CSV). Se añaden al equipo de ' + JES[scope].n + '.'));
    var ta = el('textarea', 'vac-in vac-ta'); ta.rows = 5; ta.placeholder = 'Pega aquí…';
    var file = el('input'); file.type = 'file'; file.accept = '.csv,.tsv,.txt';
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; if (!f) return;
      var r = new FileReader(); r.onload = function () { ta.value = String(r.result || ''); }; r.readAsText(f);
    });
    var row = el('div', 'vac-row'); row.appendChild(file);
    imp.appendChild(row); imp.appendChild(ta);
    var r2 = el('div', 'vac-row');
    r2.appendChild(btn('Importar', 'vac-btn pri org', function () {
      var rows = parseTable(ta.value);
      if (!rows.length) { setMsg('No hay datos que importar.', false); return render(); }
      window.HubAuth.ask('Introduce la contraseña para importar colaboradores.', function () {
        if (rows.length && /^nombre$/i.test(rows[0][0])) rows = rows.slice(1);
        var ok = 0, bad = 0;
        rows.forEach(function (r) {
          var n = (r[0] || '').trim(), je = isDV ? norm(r[1]) : scope;
          if (!n || !JES[je] || je === 'dv') { bad++; return; }
          if (S.colabs.some(function (c) { return c.je === je && norm(c.nombre) === norm(n); })) { bad++; return; }
          S.colabs.push({ id: uid(), je: je, nombre: n }); ok++;
        });
        save();
        setMsg('Importados ' + ok + ' colaboradores' + (bad ? ' · ' + bad + ' omitidos (repetidos o JE no válido)' : '') + '.', ok > 0);
        render();
      });
    }));
    r2.appendChild(btn('Plantilla', 'vac-btn', function () {
      download('plantilla_colaboradores.csv', isDV ? 'nombre;je\nEjemplo uno;Vero\nEjemplo dos;Lisel\nEjemplo tres;Matías\n' : 'nombre\nEjemplo uno\nEjemplo dos\n');
    }));
    imp.appendChild(r2);
    det.appendChild(imp);
    return det;
  }

  function render() {
    root.textContent = '';
    var card = el('div', 'vac-card org-card-wrap');
    card.appendChild(header());
    card.appendChild(tabs());
    if (ui.msg) card.appendChild(el('div', 'vac-msg' + (ui.ok ? '' : ' err'), ui.msg));
    card.appendChild(addForm());
    card.appendChild(board());
    if (ui.amb === 'eq') card.appendChild(colabPanel());
    root.appendChild(card);
  }
  render();
})();
