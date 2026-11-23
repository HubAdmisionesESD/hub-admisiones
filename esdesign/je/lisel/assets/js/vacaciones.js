/* Hub de Admisiones ESD — Herramienta de Vacaciones.
 * Sin nombres: las personas se identifican por un código (importable desde Excel).
 * <body data-equipo="vero|lisel|matias|todos"> decide qué equipo se ve.
 * Datos en localStorage (clave esd_vac_v1): solo visibles en este navegador.
 */
(function () {
  'use strict';

  var KEY = 'esd_vac_v1';
  var EQ = { vero: 'Vero', lisel: 'Lisel', matias: 'Matías' };
  var PRE = { vero: 'V', lisel: 'L', matias: 'M' };
  var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var TIPO = { vac: 'Vacaciones', ld: 'Libre disposición' };
  var ESTADO = { pend: 'Pendiente', ok: 'Aprobada', no: 'Rechazada' };
  var DEF_VAC = 22, DEF_LD = 2;

  var scope = document.body.getAttribute('data-equipo') || 'todos';
  var root = document.getElementById('vac-root');
  if (!root) return;

  /* ───────── datos ───────── */
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && Array.isArray(d.personas) && Array.isArray(d.solicitudes)) { d.festivos = d.festivos || {}; return d; }
    } catch (e) { /* sin datos */ }
    return { personas: [], solicitudes: [], festivos: {} };
  }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  var ui = { tab: 'cal', year: new Date().getFullYear(), day: null, msg: '', ok: true, unlocked: false, admYear: new Date().getFullYear() };

  /* ───────── utilidades ───────── */
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
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getMonth() === +m[2] - 1 ? d : null;
  }
  function parseFecha(s) {
    s = (s || '').trim();
    var m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);
    if (m) return parseISO(m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]));
    return parseISO(s);
  }
  function isFest(d) {
    var list = S.festivos[d.getFullYear()];
    return !!list && list.indexOf(iso(d)) >= 0;
  }
  function labDays(a, b) {
    var n = 0, d = new Date(a.getTime());
    while (d <= b) { var w = d.getDay(); if (w !== 0 && w !== 6 && !isFest(d)) n++; d.setDate(d.getDate() + 1); }
    return n;
  }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }

  function personas() { return S.personas.filter(function (p) { return scope === 'todos' || p.equipo === scope; }); }
  function pById(id) { return S.personas.filter(function (p) { return p.id === id; })[0]; }
  function solicitudes() {
    var ids = {};
    personas().forEach(function (p) { ids[p.id] = 1; });
    return S.solicitudes.filter(function (s) { return ids[s.pid]; });
  }
  function dias(s) {
    var a = parseISO(s.desde), b = parseISO(s.hasta);
    return a && b && b >= a ? labDays(a, b) : 0;
  }
  function used(p, tipo, estado) {
    return S.solicitudes.reduce(function (t, s) {
      return t + (s.pid === p.id && s.tipo === tipo && s.estado === estado ? dias(s) : 0);
    }, 0);
  }
  function setMsg(t, ok) { ui.msg = t; ui.ok = ok !== false; }

  /* ───────── cabecera ───────── */
  function header() {
    var box = el('div', 'vac-head');
    var t = el('div');
    t.appendChild(el('h1', 'vac-title', 'Vacaciones'));
    t.appendChild(el('div', 'vac-sub', scope === 'todos' ? 'Vista unificada · todos los equipos' : 'Equipo ' + EQ[scope]));
    box.appendChild(t);

    var P = personas(), Sol = solicitudes();
    var pend = Sol.filter(function (s) { return s.estado === 'pend'; }).length;
    var okd = Sol.reduce(function (n, s) { return n + (s.estado === 'ok' ? dias(s) : 0); }, 0);
    var stats = el('div', 'vac-stats');
    [['Personas', P.length], ['Pendientes', pend], ['Días aprobados', okd]].forEach(function (x) {
      var c = el('div', 'vac-stat');
      c.appendChild(el('div', 'vac-stat-n', String(x[1])));
      c.appendChild(el('div', 'vac-stat-l', x[0]));
      stats.appendChild(c);
    });
    box.appendChild(stats);
    return box;
  }

  function tabs() {
    var bar = el('div', 'vac-tabs');
    var list = [['cal', 'Calendario'], ['sol', 'Solicitudes'], ['eq', 'Equipo']];
    if (scope === 'todos') list.push(['adm', 'Admin 🔒']);
    list.forEach(function (x) {
      bar.appendChild(btn(x[1], 'vac-tab' + (ui.tab === x[0] ? ' on' : ''), function () {
        function go() { ui.tab = x[0]; ui.msg = ''; render(); }
        if (x[0] === 'adm' && !ui.unlocked) {
          window.HubAuth.ask('Introduce la contraseña para abrir Admin.', function () { ui.unlocked = true; go(); });
        } else go();
      }));
    });
    return bar;
  }

  /* ───────── calendario anual ───────── */
  function calendar() {
    var wrap = el('div');
    var nav = el('div', 'vac-year');
    nav.appendChild(btn('‹', 'vac-nav', function () { ui.year--; ui.day = null; render(); }));
    nav.appendChild(el('span', 'vac-year-n', String(ui.year)));
    nav.appendChild(btn('›', 'vac-nav', function () { ui.year++; ui.day = null; render(); }));
    wrap.appendChild(nav);

    var map = {};
    solicitudes().forEach(function (s) {
      if (s.estado === 'no') return;
      var a = parseISO(s.desde), b = parseISO(s.hasta);
      if (!a || !b || b < a) return;
      var d = new Date(a.getTime()), guard = 0;
      while (d <= b && guard++ < 400) {
        var k = iso(d);
        (map[k] = map[k] || []).push(s);
        d.setDate(d.getDate() + 1);
      }
    });

    var grid = el('div', 'vac-months');
    for (var m = 0; m < 12; m++) {
      var mc = el('div', 'vac-month');
      mc.appendChild(el('div', 'vac-month-t', MESES[m]));
      var g = el('div', 'vac-days');
      ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(function (w) { g.appendChild(el('div', 'vac-dow', w)); });
      var first = new Date(ui.year, m, 1);
      var off = (first.getDay() + 6) % 7;
      for (var i = 0; i < off; i++) g.appendChild(el('div', 'vac-day empty'));
      var nd = new Date(ui.year, m + 1, 0).getDate();
      for (var dd = 1; dd <= nd; dd++) {
        var key = ui.year + '-' + pad(m + 1) + '-' + pad(dd);
        var n = (map[key] || []).length;
        var isF = isFest(new Date(ui.year, m, dd));
        var cell = el('button', 'vac-day' + (n ? ' has' : '') + (isF ? ' fest' : '') + (ui.day === key ? ' sel' : ''), String(dd));
        if (isF && !n) cell.title = 'Festivo';
        cell.type = 'button';
        if (n) {
          cell.style.background = 'rgba(29,204,132,' + Math.min(0.2 + 0.15 * n, 0.9).toFixed(2) + ')';
          cell.title = n + (n === 1 ? ' persona' : ' personas');
        }
        (function (k) { cell.addEventListener('click', function () { ui.day = (ui.day === k ? null : k); render(); }); })(key);
        g.appendChild(cell);
      }
      mc.appendChild(g);
      grid.appendChild(mc);
    }
    wrap.appendChild(grid);

    if (ui.day) {
      var box = el('div', 'vac-detail');
      var list = map[ui.day] || [];
      box.appendChild(el('div', 'vac-detail-t', ui.day.split('-').reverse().join('/') + ' · ' + list.length + (list.length === 1 ? ' persona' : ' personas')));
      if (!list.length) box.appendChild(el('div', 'vac-empty', 'Nadie ausente este día.'));
      list.forEach(function (s) {
        var p = pById(s.pid);
        if (!p) return;
        box.appendChild(el('div', 'vac-detail-r',
          p.cod + (scope === 'todos' ? ' · ' + EQ[p.equipo] : '') + ' · ' + TIPO[s.tipo] + ' · ' + ESTADO[s.estado]));
      });
      wrap.appendChild(box);
    }
    wrap.appendChild(el('div', 'vac-legend', 'Más verde = más personas ausentes (incluye pendientes). Los días se cuentan en laborables: de lunes a viernes, sin festivos del calendario laboral importado (subrayados en naranja).'));
    return wrap;
  }

  /* ───────── solicitudes ───────── */
  function select(opts, val) {
    var s = el('select', 'vac-in');
    opts.forEach(function (o) {
      var op = el('option', null, o[1]);
      op.value = o[0];
      if (o[0] === val) op.selected = true;
      s.appendChild(op);
    });
    return s;
  }
  function solTab() {
    var wrap = el('div');
    var P = personas();
    var form = el('div', 'vac-form');
    if (!P.length) {
      wrap.appendChild(el('div', 'vac-empty', 'Aún no hay personas. Añádelas o impórtalas desde la pestaña Equipo.'));
      return wrap;
    }
    var selP = select(P.map(function (p) { return [p.id, p.cod + (scope === 'todos' ? ' · ' + EQ[p.equipo] : '')]; }), P[0].id);
    var selT = select([['vac', TIPO.vac], ['ld', TIPO.ld]], 'vac');
    var d1 = el('input', 'vac-in'); d1.type = 'date';
    var d2 = el('input', 'vac-in'); d2.type = 'date';
    [['Persona', selP], ['Tipo', selT], ['Desde', d1], ['Hasta', d2]].forEach(function (x) {
      var f = el('label', 'vac-f');
      f.appendChild(el('span', null, x[0]));
      f.appendChild(x[1]);
      form.appendChild(f);
    });
    form.appendChild(btn('Registrar', 'vac-btn pri', function () {
      var a = parseISO(d1.value), b = parseISO(d2.value);
      if (!a || !b) { setMsg('Indica las dos fechas.', false); return render(); }
      if (b < a) { setMsg('La fecha final es anterior a la inicial.', false); return render(); }
      S.solicitudes.push({ id: uid(), pid: selP.value, tipo: selT.value, desde: iso(a), hasta: iso(b), estado: 'pend' });
      save(); setMsg('Solicitud registrada (' + labDays(a, b) + ' días laborables).'); render();
    }));
    wrap.appendChild(form);

    var Sol = solicitudes().slice().sort(function (x, y) { return x.desde < y.desde ? 1 : -1; });
    if (!Sol.length) { wrap.appendChild(el('div', 'vac-empty', 'Sin solicitudes todavía.')); return wrap; }
    var tb = el('table', 'vac-table');
    var hr = el('tr');
    ['Código'].concat(scope === 'todos' ? ['Equipo'] : [], ['Tipo', 'Desde', 'Hasta', 'Días', 'Estado', '']).forEach(function (h) { hr.appendChild(el('th', null, h)); });
    var th = el('thead'); th.appendChild(hr); tb.appendChild(th);
    var body = el('tbody');
    Sol.forEach(function (s) {
      var p = pById(s.pid); if (!p) return;
      var tr = el('tr');
      tr.appendChild(el('td', null, p.cod));
      if (scope === 'todos') tr.appendChild(el('td', null, EQ[p.equipo]));
      tr.appendChild(el('td', null, TIPO[s.tipo]));
      tr.appendChild(el('td', null, s.desde.split('-').reverse().join('/')));
      tr.appendChild(el('td', null, s.hasta.split('-').reverse().join('/')));
      tr.appendChild(el('td', null, String(dias(s))));
      var st = el('td'); st.appendChild(el('span', 'vac-chip ' + s.estado, ESTADO[s.estado])); tr.appendChild(st);
      var ac = el('td', 'vac-acts');
      if (s.estado !== 'ok') ac.appendChild(btn('✓', 'vac-ico ok', function () { s.estado = 'ok'; save(); render(); }));
      if (s.estado !== 'no') ac.appendChild(btn('✕', 'vac-ico no', function () { s.estado = 'no'; save(); render(); }));
      ac.appendChild(btn('Borrar', 'vac-ico del', function () {
        window.HubAuth.ask('Introduce la contraseña para borrar esta solicitud.', function () {
          S.solicitudes = S.solicitudes.filter(function (x) { return x.id !== s.id; });
          save(); render();
        });
      }));
      tr.appendChild(ac);
      body.appendChild(tr);
    });
    tb.appendChild(body);
    var sc = el('div', 'vac-scroll'); sc.appendChild(tb); wrap.appendChild(sc);
    return wrap;
  }

  /* ───────── equipo + importación ───────── */
  function parseTable(text) {
    return text.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); }).map(function (l) {
      var d = l.indexOf('\t') >= 0 ? '\t' : (l.indexOf(';') >= 0 ? ';' : ',');
      return l.split(d).map(function (c) { return c.trim().replace(/^"|"$/g, ''); });
    });
  }
  function normEq(v) {
    if (scope !== 'todos') return scope;
    var n = norm(v);
    return EQ[n] ? n : null;
  }
  function nextCod(eq) {
    var n = S.personas.filter(function (p) { return p.equipo === eq; }).length + 1, c;
    do { c = PRE[eq] + '-' + (n < 100 ? '0' : '') + (n < 10 ? '0' : '') + n; n++; }
    while (S.personas.some(function (p) { return p.equipo === eq && p.cod === c; }));
    return c;
  }
  function importPersonas(rows) {
    var ok = 0, bad = 0;
    if (rows.length && /cod/i.test(rows[0][0])) rows = rows.slice(1);
    rows.forEach(function (r) {
      var cod = (r[0] || '').trim(), eq = normEq(r[1]);
      if (!cod || !eq) { bad++; return; }
      var vac = parseFloat(r[2]), ld = parseFloat(r[3]);
      var p = S.personas.filter(function (x) { return x.equipo === eq && x.cod === cod; })[0];
      if (!p) { p = { id: uid(), equipo: eq, cod: cod, vac: DEF_VAC, ld: DEF_LD }; S.personas.push(p); }
      if (!isNaN(vac)) p.vac = vac;
      if (!isNaN(ld)) p.ld = ld;
      ok++;
    });
    return [ok, bad];
  }
  function importSolic(rows) {
    var ok = 0, bad = 0;
    if (rows.length && /cod/i.test(rows[0][0])) rows = rows.slice(1);
    var P = personas();
    rows.forEach(function (r) {
      var p = P.filter(function (x) { return x.cod === (r[0] || '').trim(); })[0];
      var a = parseFecha(r[2]), b = parseFecha(r[3]);
      if (!p || !a || !b || b < a) { bad++; return; }
      var t = /libre|^ld/i.test(r[1] || '') ? 'ld' : 'vac';
      var e = norm(r[4]);
      var est = e.indexOf('apro') === 0 || e === 'ok' ? 'ok' : (e.indexOf('rech') === 0 || e === 'no' ? 'no' : 'pend');
      S.solicitudes.push({ id: uid(), pid: p.id, tipo: t, desde: iso(a), hasta: iso(b), estado: est });
      ok++;
    });
    return [ok, bad];
  }
  function download(name, text) {
    var blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function eqTab() {
    var wrap = el('div');
    var P = personas();

    var add = el('div', 'vac-form');
    var cod = el('input', 'vac-in'); cod.type = 'text'; cod.placeholder = 'Código (opcional)';
    var selE = select(Object.keys(EQ).map(function (k) { return [k, EQ[k]]; }), 'vero');
    var f1 = el('label', 'vac-f'); f1.appendChild(el('span', null, 'Código')); f1.appendChild(cod); add.appendChild(f1);
    if (scope === 'todos') { var f2 = el('label', 'vac-f'); f2.appendChild(el('span', null, 'Equipo')); f2.appendChild(selE); add.appendChild(f2); }
    add.appendChild(btn('Añadir persona', 'vac-btn pri', function () {
      var eq = scope === 'todos' ? selE.value : scope;
      var c = cod.value.trim() || nextCod(eq);
      if (S.personas.some(function (p) { return p.equipo === eq && p.cod === c; })) { setMsg('Ese código ya existe en el equipo.', false); return render(); }
      S.personas.push({ id: uid(), equipo: eq, cod: c, vac: DEF_VAC, ld: DEF_LD });
      save(); setMsg('Persona ' + c + ' añadida.'); render();
    }));
    wrap.appendChild(add);

    if (!P.length) wrap.appendChild(el('div', 'vac-empty', 'Sin personas todavía. Añádelas arriba o impórtalas desde Excel más abajo.'));
    else {
      var tb = el('table', 'vac-table');
      var hr = el('tr');
      ['Código'].concat(scope === 'todos' ? ['Equipo'] : [], ['Vacaciones', 'Usadas', 'Libre disp.', 'Usadas', '']).forEach(function (h) { hr.appendChild(el('th', null, h)); });
      var th = el('thead'); th.appendChild(hr); tb.appendChild(th);
      var body = el('tbody');
      P.forEach(function (p) {
        var tr = el('tr');
        tr.appendChild(el('td', null, p.cod));
        if (scope === 'todos') tr.appendChild(el('td', null, EQ[p.equipo]));
        function num(field) {
          var td = el('td'), i = el('input', 'vac-in num'); i.type = 'number'; i.min = '0'; i.step = '0.5'; i.value = p[field];
          i.addEventListener('change', function () { var v = parseFloat(i.value); if (!isNaN(v) && v >= 0) { p[field] = v; save(); render(); } });
          td.appendChild(i); return td;
        }
        tr.appendChild(num('vac'));
        var uv = used(p, 'vac', 'ok'), up = used(p, 'vac', 'pend');
        tr.appendChild(el('td', uv > p.vac ? 'vac-over' : null, uv + (up ? ' (+' + up + ' pend.)' : '')));
        tr.appendChild(num('ld'));
        var ul = used(p, 'ld', 'ok'), lp = used(p, 'ld', 'pend');
        tr.appendChild(el('td', ul > p.ld ? 'vac-over' : null, ul + (lp ? ' (+' + lp + ' pend.)' : '')));
        var ac = el('td', 'vac-acts');
        ac.appendChild(btn('Borrar', 'vac-ico del', function () {
          window.HubAuth.ask('Introduce la contraseña para borrar a ' + p.cod + ' y sus solicitudes.', function () {
            S.personas = S.personas.filter(function (x) { return x.id !== p.id; });
            S.solicitudes = S.solicitudes.filter(function (x) { return x.pid !== p.id; });
            save(); render();
          });
        }));
        tr.appendChild(ac);
        body.appendChild(tr);
      });
      tb.appendChild(body);
      var sc = el('div', 'vac-scroll'); sc.appendChild(tb); wrap.appendChild(sc);
    }

    if (scope !== 'todos') wrap.appendChild(importBox());
    else wrap.appendChild(el('p', 'vac-help', 'La importación masiva desde Excel y el calendario laboral están en la pestaña Admin.'));
    return wrap;
  }

  function importBox() {
    var imp = null;
    imp = el('div', 'vac-import');
    imp.appendChild(el('div', 'vac-detail-t', 'Importar desde Excel'));
    imp.appendChild(el('p', 'vac-help',
      'Copia las celdas en Excel y pégalas aquí (o carga un CSV). Personas: código · ' + (scope === 'todos' ? 'equipo (Vero, Lisel o Matías) · ' : '') +
      'días de vacaciones · días de libre disposición. Solicitudes: código · tipo (vacaciones / libre disposición) · desde · hasta · estado (opcional).'));
    var kind = select([['per', 'Lo que pego son PERSONAS'], ['sol', 'Lo que pego son SOLICITUDES']], 'per');
    var ta = el('textarea', 'vac-in vac-ta'); ta.rows = 6; ta.placeholder = 'Pega aquí…';
    var file = el('input'); file.type = 'file'; file.accept = '.csv,.tsv,.txt';
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { ta.value = String(r.result || ''); };
      r.readAsText(f);
    });
    var row = el('div', 'vac-row');
    row.appendChild(kind); row.appendChild(file);
    imp.appendChild(row); imp.appendChild(ta);
    var row2 = el('div', 'vac-row');
    row2.appendChild(btn('Importar', 'vac-btn pri', function () {
      var rows = parseTable(ta.value);
      if (!rows.length) { setMsg('No hay datos que importar.', false); return render(); }
      var tipo = kind.value;
      window.HubAuth.ask('Introduce la contraseña para importar datos.', function () {
        var res = tipo === 'per' ? importPersonas(rows) : importSolic(rows);
        save();
        setMsg('Importadas ' + res[0] + ' filas' + (res[1] ? ' · ' + res[1] + ' omitidas (revisa código, equipo o fechas)' : '') + '.', res[0] > 0);
        render();
      });
    }));
    row2.appendChild(btn('Plantilla personas', 'vac-btn', function () {
      download('plantilla_personas.csv', 'codigo;equipo;vacaciones;libre_disposicion\n' + (scope === 'todos' ? 'V-001;Vero;22;2\nL-001;Lisel;22;2\nM-001;Matías;22;2\n' : PRE[scope] + '-001;' + EQ[scope] + ';22;2\n'));
    }));
    row2.appendChild(btn('Plantilla solicitudes', 'vac-btn', function () {
      download('plantilla_solicitudes.csv', 'codigo;tipo;desde;hasta;estado\n' + (scope === 'todos' ? 'V-001' : PRE[scope] + '-001') + ';vacaciones;2026-08-03;2026-08-14;aprobada\n');
    }));
    row2.appendChild(btn('Exportar solicitudes', 'vac-btn', function () {
      var out = 'codigo;equipo;tipo;desde;hasta;dias;estado\n';
      solicitudes().forEach(function (s) { var p = pById(s.pid); if (p) out += [p.cod, EQ[p.equipo], TIPO[s.tipo], s.desde, s.hasta, dias(s), ESTADO[s.estado]].join(';') + '\n'; });
      download('solicitudes_vacaciones.csv', out);
    }));
    imp.appendChild(row2);
    return imp;
  }



  /* ───────── Admin (solo DV): calendario laboral + BBDD ───────── */
  function admTab() {
    var wrap = el('div');
    wrap.appendChild(el('div', 'vac-detail-t', 'Calendario laboral'));
    wrap.appendChild(el('p', 'vac-help', 'Pega los festivos del año (una fila por día: fecha y, si quieres, descripción) o carga un CSV. Cada año importado sustituye al anterior de ese mismo año. Los festivos dejan de contar como laborables.'));
    var yr = el('div', 'vac-year');
    yr.appendChild(btn('‹', 'vac-nav', function () { ui.admYear--; render(); }));
    yr.appendChild(el('span', 'vac-year-n', String(ui.admYear)));
    yr.appendChild(btn('›', 'vac-nav', function () { ui.admYear++; render(); }));
    wrap.appendChild(yr);
    var cur = (S.festivos[ui.admYear] || []).slice().sort();
    wrap.appendChild(el('div', 'vac-legend', cur.length
      ? cur.length + ' festivos cargados en ' + ui.admYear + ': ' + cur.map(function (d) { return d.split('-').reverse().slice(0, 2).join('/'); }).join(' · ')
      : 'Sin festivos cargados en ' + ui.admYear + '.'));
    var ta = el('textarea', 'vac-in vac-ta'); ta.rows = 5; ta.placeholder = '01/01/' + ui.admYear + ';Año Nuevo';
    var file = el('input'); file.type = 'file'; file.accept = '.csv,.tsv,.txt';
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; if (!f) return;
      var r = new FileReader(); r.onload = function () { ta.value = String(r.result || ''); }; r.readAsText(f);
    });
    var row = el('div', 'vac-row'); row.appendChild(file);
    wrap.appendChild(row); wrap.appendChild(ta);
    var r2 = el('div', 'vac-row');
    r2.appendChild(btn('Importar calendario ' + ui.admYear, 'vac-btn pri', function () {
      var rows = parseTable(ta.value), ds = [], bad = 0;
      rows.forEach(function (r) { var d = parseFecha(r[0]); if (d && d.getFullYear() === ui.admYear) ds.push(iso(d)); else if (!/fecha/i.test(r[0] || '')) bad++; });
      if (!ds.length) { setMsg('No hay fechas válidas de ' + ui.admYear + '.', false); return render(); }
      window.HubAuth.ask('Introduce la contraseña para importar el calendario ' + ui.admYear + '.', function () {
        S.festivos[ui.admYear] = ds; save();
        setMsg('Calendario ' + ui.admYear + ' importado: ' + ds.length + ' festivos' + (bad ? ' · ' + bad + ' filas omitidas (otro año o fecha no válida)' : '') + '.'); render();
      });
    }));
    if (cur.length) r2.appendChild(btn('Quitar calendario ' + ui.admYear, 'vac-btn', function () {
      window.HubAuth.ask('Introduce la contraseña para quitar el calendario ' + ui.admYear + '.', function () { delete S.festivos[ui.admYear]; save(); render(); });
    }));
    r2.appendChild(btn('Plantilla festivos', 'vac-btn', function () {
      download('plantilla_festivos.csv', 'fecha;descripcion\n01/01/' + ui.admYear + ';Año Nuevo\n06/01/' + ui.admYear + ';Reyes\n');
    }));
    wrap.appendChild(r2);

    var bd = el('div', 'vac-import');
    bd.appendChild(el('div', 'vac-detail-t', 'Importar BBDD (todos los equipos)'));
    bd.appendChild(el('p', 'vac-help', 'Cada persona se asigna a su JE con la columna equipo (Vero, Lisel o Matías).'));
    bd.appendChild(importBox());
    wrap.appendChild(bd);
    return wrap;
  }

  /* ───────── render ───────── */
  function render() {
    root.textContent = '';
    var card = el('div', 'vac-card');
    card.appendChild(header());
    card.appendChild(tabs());
    if (ui.msg) card.appendChild(el('div', 'vac-msg' + (ui.ok ? '' : ' err'), ui.msg));
    card.appendChild(ui.tab === 'cal' ? calendar() : ui.tab === 'sol' ? solTab() : ui.tab === 'adm' && ui.unlocked ? admTab() : eqTab());
    root.appendChild(card);
  }
  render();
})();
