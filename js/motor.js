// Motor roguelike: partida por pisos, puertas por categoría, encuentros con tiradas y jefes.
(function () {
  const CLAVE_PARTIDA = 'dicecrawlerclub.partida.v2';
  const CLAVE_RECORD = 'dicecrawlerclub.record';
  const CURA_TRAS_JEFE = 6;

  const $ = (id) => document.getElementById(id);
  const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const barajar = (lista) => lista.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const esc = (s) => String(s);

  let estado = cargar() || nuevaPartida();
  let animando = false;

  // ======================================================================
  // Estado y guardado
  // ======================================================================

  function nuevaPartida() {
    return {
      fase: 'creacion',
      personaje: null,
      piso: 0,
      paso: 0,
      vida: 0, vidaMax: 0, oro: 0,
      atributos: { fisico: 0, mental: 0, social: 0 },
      inventario: [],
      banderas: [],
      vistos: [],
      puertas: [],
      encuentro: null,
      mejoras: [],
      registro: [],
      stats: { encuentros: 0, tiradas: 0, exitos: 0 },
      resultado: null,
    };
  }

  function guardar() {
    try { localStorage.setItem(CLAVE_PARTIDA, JSON.stringify(estado)); } catch (e) { /* sin almacenamiento */ }
  }

  function cargar() {
    try { return JSON.parse(localStorage.getItem(CLAVE_PARTIDA)); } catch (e) { return null; }
  }

  function leerRecord() {
    try { return JSON.parse(localStorage.getItem(CLAVE_RECORD)) || { partidas: 0, victorias: 0, mejorPiso: 0 }; }
    catch (e) { return { partidas: 0, victorias: 0, mejorPiso: 0 }; }
  }

  function guardarRecord(victoria) {
    const r = leerRecord();
    r.partidas++;
    if (victoria) r.victorias++;
    r.mejorPiso = Math.max(r.mejorPiso, estado.piso + 1);
    try { localStorage.setItem(CLAVE_RECORD, JSON.stringify(r)); } catch (e) { /* nada */ }
  }

  // ======================================================================
  // Personaje
  // ======================================================================

  function tiene(objeto) { return estado.inventario.includes(objeto); }

  function bonusObjetos(atributo) {
    return [...new Set(estado.inventario)]
      .reduce((s, o) => s + ((OBJETOS[o] && OBJETOS[o].bonus && OBJETOS[o].bonus[atributo]) || 0), 0);
  }

  function modificador(atributo) { return estado.atributos[atributo] + bonusObjetos(atributo); }

  function cumple(cond) {
    if (!cond) return true;
    if (cond.objeto && !tiene(cond.objeto)) return false;
    if (cond.bandera && !estado.banderas.includes(cond.bandera)) return false;
    if (cond.oro && estado.oro < cond.oro) return false;
    return true;
  }

  function describirRequisito(req) {
    if (req.objeto) return 'necesitas: ' + req.objeto;
    if (req.oro) return 'necesitas ' + req.oro + ' de oro';
    if (req.bandera) return 'aún no sabes lo suficiente';
    return '';
  }

  function resolverValor(v) {
    if (typeof v === 'number') return v;
    const negativo = v.trim().startsWith('-');
    const t = Dados.tirar(v.replace(/^[+-]/, ''));
    return negativo ? -t.total : t.total;
  }

  function aplicarEfectos(ef) {
    const frases = [];
    if (!ef) return frases;
    if (ef.atributos) {
      for (const [k, v] of Object.entries(ef.atributos)) {
        estado.atributos[k] += v;
        frases.push((v >= 0 ? '+' : '') + v + ' ' + ATRIBUTOS[k].nombre + ' permanente.');
      }
    }
    if (ef.vidaMax) { estado.vidaMax += ef.vidaMax; frases.push('+' + ef.vidaMax + ' vida máxima.'); }
    if (ef.vida !== undefined) {
      const n = resolverValor(ef.vida);
      const antes = estado.vida;
      estado.vida = Math.max(0, Math.min(estado.vidaMax, estado.vida + n));
      if (n < 0) frases.push('Pierdes ' + -n + ' de vida.');
      else if (estado.vida > antes) frases.push('Recuperas ' + (estado.vida - antes) + ' de vida.');
    }
    if (ef.oro !== undefined) {
      const n = resolverValor(ef.oro);
      const real = Math.max(-estado.oro, n);
      estado.oro += real;
      if (real > 0) frases.push('Ganas ' + real + ' de oro.');
      else if (real < 0) frases.push('Pierdes ' + -real + ' de oro.');
    }
    (ef.ganar || []).forEach((o) => { estado.inventario.push(o); frases.push('Obtienes: ' + o + '.'); });
    (ef.perder || []).forEach((o) => {
      const i = estado.inventario.indexOf(o);
      if (i >= 0) estado.inventario.splice(i, 1);
    });
    [].concat(ef.bandera || []).forEach((b) => {
      if (!estado.banderas.includes(b)) { estado.banderas.push(b); frases.push('📜 Has descubierto algo importante.'); }
    });
    return frases;
  }

  function usarObjeto(nombre) {
    const def = OBJETOS[nombre];
    if (!def || !def.consumible || animando) return;
    estado.inventario.splice(estado.inventario.indexOf(nombre), 1);
    const frases = aplicarEfectos(def.usar);
    anotar('Usas ' + nombre + '. ' + frases.join(' '), true);
    guardar();
    render();
  }

  function anotar(texto, exito) {
    estado.registro.unshift({ texto, exito });
    estado.registro = estado.registro.slice(0, 40);
  }

  // ======================================================================
  // Flujo de la partida
  // ======================================================================

  function elegirPersonaje(p) {
    estado.personaje = p.nombre;
    estado.atributos = Object.assign({}, p.atributos);
    estado.vida = estado.vidaMax = p.vida;
    estado.oro = p.oro;
    estado.inventario = p.objetos.slice();
    estado.fase = 'piso_intro';
    guardar();
    render();
  }

  function escenasDisponibles(categoria) {
    return PISOS[estado.piso].pool[categoria].filter((e) => !estado.vistos.includes(e.id));
  }

  function generarPuertas() {
    const cats = barajar(Object.keys(ATRIBUTOS).filter((c) => escenasDisponibles(c).length));
    const n = Math.min(cats.length, Math.random() < 0.5 ? 2 : 3);
    estado.puertas = cats.slice(0, n);
    estado.fase = 'puertas';
  }

  function cruzarPuerta(categoria) {
    const escena = azar(escenasDisponibles(categoria));
    estado.vistos.push(escena.id);
    estado.encuentro = { categoria, id: escena.id, jefe: false, usadas: [], ultima: null, terminado: false };
    estado.fase = 'encuentro';
    guardar();
    render();
  }

  function empezarJefe() {
    const jefe = PISOS[estado.piso].jefe;
    estado.encuentro = { categoria: null, id: jefe.id, jefe: true, resistencia: jefe.resistencia,
      usadas: [], ultima: null, terminado: false };
    estado.fase = 'encuentro';
  }

  function escenaActual() {
    const enc = estado.encuentro;
    const piso = PISOS[estado.piso];
    if (enc.jefe) return piso.jefe;
    return piso.pool[enc.categoria].find((e) => e.id === enc.id);
  }

  function avanzar() {
    if (estado.vida <= 0) return terminar(false);
    const enc = estado.encuentro;
    if (enc && enc.jefe) {
      if (estado.piso === PISOS.length - 1) return terminar(true);
      estado.mejoras = barajar(MEJORAS.map((_, i) => i)).slice(0, 3);
      estado.fase = 'recompensa';
    } else {
      estado.paso++;
      if (estado.paso >= PISOS[estado.piso].pasos) empezarJefe();
      else generarPuertas();
    }
    guardar();
    render();
  }

  function elegirMejora(i) {
    aplicarEfectos({ vida: CURA_TRAS_JEFE });
    aplicarEfectos(MEJORAS[i].efectos);
    anotar('Mejora: ' + MEJORAS[i].texto, true);
    estado.piso++;
    estado.paso = 0;
    estado.encuentro = null;
    estado.fase = 'piso_intro';
    guardar();
    render();
  }

  function terminar(victoria) {
    estado.fase = 'fin';
    estado.resultado = victoria ? 'victoria' : 'derrota';
    guardarRecord(victoria);
    guardar();
    render();
  }

  // ======================================================================
  // Encuentros y tiradas
  // ======================================================================

  function elegirOpcion(idx) {
    if (animando) return;
    const op = escenaActual().opciones[idx];
    if (op.prueba) return tirar(idx);
    const frases = aplicarEfectos(op.efectos);
    estado.encuentro.ultima = { idx, sinTirada: true, texto: null, frases };
    estado.encuentro.terminado = true;
    estado.stats.encuentros++;
    guardar();
    render();
  }

  function tirar(idx) {
    const op = escenaActual().opciones[idx];
    const p = op.prueba;
    const ventaja = !!(p.ventaja && cumple(p.ventaja));
    let natural = Dados.tirarDado(20);
    let descartada = null;
    if (ventaja) {
      const otra = Dados.tirarDado(20);
      descartada = Math.min(natural, otra);
      natural = Math.max(natural, otra);
    }
    const mod = modificador(p.atributo);
    const total = natural + mod;
    const critico = natural === 20;
    const pifia = natural === 1;
    const exito = critico || (!pifia && total >= p.dificultad);

    estado.stats.tiradas++;
    if (exito) estado.stats.exitos++;
    anotar(ATRIBUTOS[p.atributo].icono + ' ' + natural + (mod >= 0 ? '+' : '') + mod + '=' + total + ' vs ' + p.dificultad, exito);

    estado.encuentro.ultima = { idx, atributo: p.atributo, dificultad: p.dificultad, natural, descartada,
      mod, total, ventaja, critico, pifia, exito, pendiente: !exito && tiene('Dado trucado') };

    animarDados(ventaja ? 2 : 1, () => {
      if (!estado.encuentro.ultima.pendiente) aplicarResultado();
      guardar();
      render();
    });
  }

  function aplicarResultado() {
    const enc = estado.encuentro;
    const u = enc.ultima;
    const op = escenaActual().opciones[u.idx];
    const res = (u.exito ? op.exito : op.fallo) || {};
    u.pendiente = false;
    u.texto = res.texto || '';
    u.frases = aplicarEfectos(res.efectos);
    if (op.una_vez && !enc.usadas.includes(u.idx)) enc.usadas.push(u.idx);

    if (enc.jefe) {
      if (u.exito) enc.resistencia = Math.max(0, enc.resistencia - (res.golpe || 1));
      enc.terminado = enc.resistencia <= 0;
      if (enc.terminado) u.frases.push('⭐ ¡Has vencido al jefe del piso!');
    } else {
      enc.terminado = u.exito || !res.repetir;
    }
    if (estado.vida <= 0) enc.terminado = true;
    if (enc.terminado) estado.stats.encuentros++;
  }

  function usarDadoTrucado() {
    estado.inventario.splice(estado.inventario.indexOf('Dado trucado'), 1);
    anotar('🎲 Usas el dado trucado', true);
    tirar(estado.encuentro.ultima.idx);
  }

  function aceptarFallo() {
    aplicarResultado();
    guardar();
    render();
  }

  function animarDados(cantidad, alTerminar) {
    animando = true;
    document.querySelectorAll('#opciones button, #inventario button').forEach((b) => (b.disabled = true));
    const caja = $('tirada');
    caja.hidden = false;
    caja.innerHTML = '<div>' + '<span class="dado rodando">?</span>'.repeat(cantidad) + '</div>';
    const dados = caja.querySelectorAll('.dado');
    const t = setInterval(() => dados.forEach((d) => (d.textContent = Dados.tirarDado(20))), 60);
    setTimeout(() => { clearInterval(t); animando = false; alTerminar(); }, 850);
  }

  // ======================================================================
  // Renderizado
  // ======================================================================

  function boton(texto, onClick, opts) {
    const b = document.createElement('button');
    b.innerHTML = texto;
    b.onclick = onClick;
    if (opts && opts.clase) b.className = opts.clase;
    if (opts && opts.disabled) b.disabled = true;
    if (opts && opts.title) b.title = opts.title;
    $('opciones').appendChild(b);
    return b;
  }

  function parrafos(lista) { return lista.map((p) => '<p>' + esc(p) + '</p>').join(''); }

  function render() {
    $('tirada').hidden = true;
    $('opciones').innerHTML = '';
    $('jefe-barra').hidden = true;
    ({ creacion: renderCreacion, piso_intro: renderPisoIntro, puertas: renderPuertas,
       encuentro: renderEncuentro, recompensa: renderRecompensa, fin: renderFin })[estado.fase]();
    renderFicha();
  }

  function renderCreacion() {
    const r = leerRecord();
    $('escena-titulo').textContent = 'El Dice Crawler Club';
    $('escena-texto').innerHTML = parrafos([
      'Bajo la ciudad hay un club donde la gente se juega la vida a los dados. Para entrar, hay que bajar ' + PISOS.length + ' pisos y salir con vida.',
      'Cada piso es distinto en cada partida. Elige tu camino según lo que mejor se te dé: 🗡️ físico, 🧠 mental o 🗣️ social. Si mueres, se acabó.',
      '¿Quién eres?',
    ]) + (r.partidas ? '<p class="efecto">Partidas: ' + r.partidas + ' · Victorias: ' + r.victorias + ' · Piso máximo: ' + r.mejorPiso + '</p>' : '');
    PERSONAJES.forEach((p) => {
      const a = p.atributos;
      boton('<strong>' + p.nombre + '</strong> — ' + p.desc +
        '<br><span class="detalle">🗡️ ' + a.fisico + ' · 🧠 ' + a.mental + ' · 🗣️ ' + a.social +
        ' · ❤️ ' + p.vida + ' · 🪙 ' + p.oro + (p.objetos.length ? ' · ' + p.objetos.join(', ') : '') + '</span>',
        () => elegirPersonaje(p));
    });
  }

  function renderPisoIntro() {
    const piso = PISOS[estado.piso];
    $('escena-titulo').textContent = piso.nombre;
    $('escena-texto').innerHTML = parrafos([piso.intro]) +
      '<p class="efecto">' + piso.pasos + ' encuentros y un jefe te esperan.</p>';
    boton('Adentrarse →', () => { estado.paso = 0; generarPuertas(); guardar(); render(); });
  }

  function renderPuertas() {
    const piso = PISOS[estado.piso];
    $('escena-titulo').textContent = piso.nombre + ' · Encrucijada';
    $('escena-texto').innerHTML = parrafos(['Ante ti hay ' + estado.puertas.length + ' puertas. ¿Cuál cruzas?']);
    estado.puertas.forEach((c) => {
      const a = ATRIBUTOS[c];
      boton('<span class="puerta-icono">' + a.icono + '</span> <strong>Puerta ' + a.nombre.toLowerCase() + '</strong>' +
        '<span class="etiqueta">tu ' + a.nombre + ': ' + fmt(modificador(c)) + '</span>' +
        '<br><span class="detalle">' + a.puerta + '</span>', () => cruzarPuerta(c), { clase: 'puerta ' + c });
    });
  }

  function renderEncuentro() {
    const enc = estado.encuentro;
    const escena = escenaActual();
    const cat = enc.categoria ? ATRIBUTOS[enc.categoria].icono + ' ' : '';
    $('escena-titulo').textContent = cat + escena.titulo;
    $('escena-texto').innerHTML = parrafos(escena.texto);

    if (enc.jefe) {
      const barra = $('jefe-barra');
      barra.hidden = false;
      barra.innerHTML = 'Resistencia del jefe: ' +
        '<span class="pips">' + '◆'.repeat(enc.resistencia) + '<span class="vacio">' +
        '◇'.repeat(escena.resistencia - enc.resistencia) + '</span></span>';
    }

    const u = enc.ultima;
    if (u) renderResultado(u);

    if (u && u.pendiente) {
      boton('🎲 Usar dado trucado y repetir la tirada', usarDadoTrucado);
      boton('Aceptar el fallo', aceptarFallo, { clase: 'secundario' });
      return;
    }
    if (enc.terminado) {
      const ultimo = enc.jefe && estado.piso === PISOS.length - 1;
      boton(estado.vida <= 0 ? 'Continuar…' : ultimo ? 'Salir de la cripta →' : 'Continuar →', avanzar).focus();
      return;
    }

    escena.opciones.forEach((op, i) => {
      if (op.una_vez && enc.usadas.includes(i)) return;
      let html = op.texto;
      if (op.prueba) {
        const p = op.prueba;
        const conVentaja = p.ventaja && cumple(p.ventaja);
        const mod = modificador(p.atributo);
        const prob = probabilidad(mod, p.dificultad, conVentaja);
        html += '<span class="etiqueta ' + p.atributo + '">' + ATRIBUTOS[p.atributo].icono + ' ' +
          ATRIBUTOS[p.atributo].nombre + ' ' + p.dificultad + (conVentaja ? ' ⇈' : '') + ' · ' + prob + '%</span>';
      }
      const bloqueada = op.requiere && !cumple(op.requiere);
      if (bloqueada) html += ' <span class="detalle">(' + describirRequisito(op.requiere) + ')</span>';
      boton(html, () => elegirOpcion(i), {
        disabled: bloqueada,
        title: op.prueba && op.prueba.ventaja && cumple(op.prueba.ventaja) ? 'Ventaja: tiras 2d20 y te quedas el mejor' : '',
      });
    });
  }

  function renderResultado(u) {
    const caja = $('tirada');
    caja.hidden = false;
    if (u.sinTirada) {
      caja.innerHTML = (u.frases || []).map((f) => '<div class="efecto">' + f + '</div>').join('') ||
        '<div class="efecto">Sigues adelante.</div>';
      return;
    }
    const etiqueta = u.critico ? '¡CRÍTICO!' : u.pifia ? '¡PIFIA!' : u.exito ? 'ÉXITO' : 'FALLO';
    caja.innerHTML =
      '<div><span class="dado">' + u.natural + '</span>' +
      (u.descartada !== null ? '<span class="dado descartado">' + u.descartada + '</span>' : '') + '</div>' +
      '<div class="detalle">' + u.natural + ' ' + (u.mod >= 0 ? '+ ' : '− ') + Math.abs(u.mod) + ' (' +
      ATRIBUTOS[u.atributo].nombre + ') = ' + u.total + ' vs ' + u.dificultad + (u.ventaja ? ' · con ventaja' : '') + '</div>' +
      '<div class="' + (u.exito ? 'exito' : 'fallo') + '">' + etiqueta + '</div>' +
      (u.pendiente ? '<p>Tienes un dado trucado. ¿Lo usas?</p>' : '<p>' + esc(u.texto || '') + '</p>') +
      (u.frases || []).map((f) => '<div class="efecto">' + f + '</div>').join('');
  }

  function renderRecompensa() {
    $('escena-titulo').textContent = '⭐ Piso superado';
    $('escena-texto').innerHTML = parrafos([
      'Encuentras un rincón tranquilo para descansar antes de bajar. Recuperarás ' + CURA_TRAS_JEFE + ' de vida.',
      'Entre los restos del jefe hay varias cosas. Solo puedes llevarte una:',
    ]);
    estado.mejoras.forEach((i) => boton(MEJORAS[i].texto, () => elegirMejora(i)));
  }

  function renderFin() {
    const victoria = estado.resultado === 'victoria';
    const s = estado.stats;
    $('escena-titulo').textContent = victoria ? '🏆 ¡Bienvenido al club!' : '💀 Fin de la partida';
    $('escena-texto').innerHTML = parrafos(victoria
      ? ['El Croupier se disuelve en humo y deja caer el Dado de Obsidiana. Subes las escaleras con él en la mano.',
         'La taberna entera se calla. La Maestra del Club lo lanza una vez: sale un 20. «Eres de los nuestros.»']
      : ['Caes al suelo frío de la cripta en ' + PISOS[estado.piso].nombre + '. A lo lejos se oye el repiqueteo de unos dados.',
         'Los dados no siempre están de tu parte. Pero siempre puedes volver a tirar.']) +
      '<p class="efecto">' + estado.personaje + ' · ' + s.encuentros + ' encuentros superados · ' +
      s.exitos + '/' + s.tiradas + ' tiradas con éxito · ' + estado.oro + ' de oro</p>';
    boton(victoria ? '🏆 Jugar otra vez' : '🎲 Nueva partida', reiniciar);
  }

  function fmt(n) { return (n >= 0 ? '+' : '') + n; }

  // Probabilidad de éxito (1 siempre falla, 20 siempre acierta).
  function probabilidad(mod, dif, ventaja) {
    const necesario = Math.min(20, Math.max(2, dif - mod));
    const p = (21 - necesario) / 20;
    return Math.round((ventaja ? 1 - (1 - p) * (1 - p) : p) * 100);
  }

  function renderFicha() {
    const fila = (k, v) => '<div><span>' + k + '</span><span>' + v + '</span></div>';
    if (estado.fase === 'creacion') {
      $('progreso').innerHTML = '';
      $('stats').innerHTML = '<em>Elige personaje</em>';
      $('inventario').innerHTML = '';
      $('registro').innerHTML = '';
      return;
    }
    // Progreso: un punto por encuentro y una corona por jefe en el piso actual.
    const piso = PISOS[estado.piso];
    let puntos = '';
    for (let i = 0; i < piso.pasos; i++) {
      puntos += '<span class="' + (i < estado.paso ? 'hecho' : i === estado.paso && estado.fase !== 'piso_intro' ? 'actual' : '') + '">●</span>';
    }
    puntos += '<span class="' + (estado.encuentro && estado.encuentro.jefe ? 'actual' : '') + '">👑</span>';
    $('progreso').innerHTML = '<div>Piso ' + (estado.piso + 1) + ' / ' + PISOS.length + '</div><div class="puntos">' + puntos + '</div>';

    const pct = Math.round((estado.vida / estado.vidaMax) * 100);
    $('stats').innerHTML =
      '<div class="nombre">' + estado.personaje + '</div>' +
      '<div class="vida"><div style="width:' + pct + '%"></div><span>❤️ ' + estado.vida + ' / ' + estado.vidaMax + '</span></div>' +
      fila('🪙 Oro', estado.oro) +
      Object.keys(ATRIBUTOS).map((k) => {
        const b = bonusObjetos(k);
        return fila(ATRIBUTOS[k].icono + ' ' + ATRIBUTOS[k].nombre,
          fmt(modificador(k)) + (b ? ' <small>(' + fmt(estado.atributos[k]) + fmt(b) + ')</small>' : ''));
      }).join('');

    const inv = $('inventario');
    inv.innerHTML = '';
    const cuentas = {};
    estado.inventario.forEach((o) => (cuentas[o] = (cuentas[o] || 0) + 1));
    if (!estado.inventario.length) inv.innerHTML = '<li><em>vacío</em></li>';
    Object.entries(cuentas).forEach(([o, n]) => {
      const li = document.createElement('li');
      const def = OBJETOS[o] || {};
      li.innerHTML = '<span title="' + (def.desc || '') + '">' + o + (n > 1 ? ' ×' + n : '') + '</span>';
      if (def.desc) li.innerHTML += '<small>' + def.desc + '</small>';
      if (def.consumible && estado.fase !== 'fin') {
        const b = document.createElement('button');
        b.textContent = 'Usar';
        b.className = 'mini';
        b.onclick = () => usarObjeto(o);
        li.appendChild(b);
      }
      inv.appendChild(li);
    });

    $('registro').innerHTML = estado.registro
      .map((r) => '<li class="' + (r.exito ? 'exito' : 'fallo') + '">' + r.texto + '</li>').join('');
  }

  function reiniciar() {
    estado = nuevaPartida();
    guardar();
    render();
  }

  // Confirmación en dos pulsaciones (sin confirm(), que algunos visores bloquean).
  const btnReiniciar = $('btn-reiniciar');
  let confirmando = null;
  btnReiniciar.onclick = () => {
    const enCurso = estado.fase !== 'creacion' && estado.fase !== 'fin';
    if (enCurso && !confirmando) {
      btnReiniciar.textContent = '¿Abandonar? Pulsa otra vez (cuenta como derrota)';
      confirmando = setTimeout(() => { confirmando = null; btnReiniciar.textContent = 'Nueva partida'; }, 3000);
      return;
    }
    clearTimeout(confirmando);
    confirmando = null;
    btnReiniciar.textContent = 'Nueva partida';
    if (enCurso) guardarRecord(false);
    reiniciar();
  };

  // Si el guardado es de una versión incompatible, empezamos de cero.
  try { render(); } catch (e) { console.warn('Partida guardada incompatible, empezando de nuevo.', e); reiniciar(); }
})();
