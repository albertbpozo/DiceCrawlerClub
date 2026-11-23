// Motor del juego: estado del personaje, renderizado de escenas y resolución de pruebas.
(function () {
  const CLAVE_GUARDADO = 'dicecrawlerclub.partida';
  const VIDA_MAX = 12;
  const NOMBRES_ATRIBUTOS = { fuerza: 'Fuerza', agilidad: 'Agilidad', ingenio: 'Ingenio', carisma: 'Carisma' };

  const $ = (id) => document.getElementById(id);

  let estado = cargar() || estadoInicial();

  function estadoInicial() {
    return {
      escena: 'inicio',
      vida: VIDA_MAX,
      oro: 3,
      atributos: { fuerza: 0, agilidad: 0, ingenio: 0, carisma: 0 },
      inventario: [],
      banderas: [],
      registro: [],
    };
  }

  function guardar() {
    try { localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(estado)); } catch (e) { /* sin almacenamiento */ }
  }

  function cargar() {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE_GUARDADO));
      return datos && ESCENAS[datos.escena] ? datos : null;
    } catch (e) { return null; }
  }

  // ---------- Condiciones ----------

  function cumple(cond) {
    if (!cond) return true;
    if (cond.objeto && !estado.inventario.includes(cond.objeto)) return false;
    if (cond.bandera && !estado.banderas.includes(cond.bandera)) return false;
    if (cond.oro && estado.oro < cond.oro) return false;
    return true;
  }

  function describirRequisito(req) {
    if (req.objeto) return 'necesitas: ' + req.objeto;
    if (req.oro) return 'necesitas ' + req.oro + ' de oro';
    if (req.bandera) return 'aún no sabes cómo';
    return '';
  }

  // ---------- Efectos ----------

  // Un valor puede ser número o notación de dados ('-1d6', '2d4').
  function resolverValor(v) {
    if (typeof v === 'number') return v;
    const negativo = v.trim().startsWith('-');
    const t = Dados.tirar(v.replace(/^[+-]/, ''));
    return negativo ? -t.total : t.total;
  }

  // Aplica efectos y devuelve frases que describen lo ocurrido.
  function aplicarEfectos(ef) {
    const frases = [];
    if (!ef) return frases;
    if (ef.atributos) Object.assign(estado.atributos, ef.atributos);
    if (ef.vida !== undefined) {
      const n = resolverValor(ef.vida);
      const antes = estado.vida;
      estado.vida = Math.max(0, Math.min(VIDA_MAX, estado.vida + n));
      const real = estado.vida - antes;
      if (n < 0) frases.push('Pierdes ' + -n + ' de vida.');
      else if (real > 0) frases.push('Recuperas ' + real + ' de vida.');
    }
    if (ef.oro !== undefined) {
      const n = resolverValor(ef.oro);
      estado.oro = Math.max(0, estado.oro + n);
      frases.push(n >= 0 ? 'Ganas ' + n + ' de oro.' : 'Gastas ' + -n + ' de oro.');
    }
    (ef.ganar || []).forEach((o) => {
      if (!estado.inventario.includes(o)) estado.inventario.push(o);
      frases.push('Obtienes: ' + o + '.');
    });
    (ef.perder || []).forEach((o) => {
      estado.inventario = estado.inventario.filter((x) => x !== o);
    });
    [].concat(ef.bandera || []).forEach((b) => {
      if (!estado.banderas.includes(b)) estado.banderas.push(b);
    });
    return frases;
  }

  // ---------- Navegación ----------

  function irA(id) {
    estado.escena = estado.vida <= 0 ? 'muerte' : id;
    const escena = ESCENAS[estado.escena];
    const frases = aplicarEfectos(escena.al_entrar);
    if (estado.vida <= 0 && estado.escena !== 'muerte') estado.escena = 'muerte';
    guardar();
    render(frases);
  }

  function elegir(opcion) {
    if (opcion.prueba) return resolverPrueba(opcion);
    aplicarEfectos(opcion.efectos);
    irA(opcion.ir);
  }

  // ---------- Pruebas con dados ----------

  function resolverPrueba(opcion) {
    const p = opcion.prueba;
    const dados = p.dados || '1d20';
    const conVentaja = p.ventaja && cumple(p.ventaja);
    const mod = estado.atributos[p.atributo] || 0;

    // Tiramos (dos veces si hay ventaja y nos quedamos con la mejor).
    let tirada = Dados.tirar(dados);
    let descartada = null;
    if (conVentaja) {
      const otra = Dados.tirar(dados);
      if (otra.total > tirada.total) { descartada = tirada; tirada = otra; } else { descartada = otra; }
    }

    const natural = tirada.total;
    const total = natural + mod;
    const esD20 = dados === '1d20';
    const critico = esD20 && natural === 20;
    const pifia = esD20 && natural === 1;
    const exito = critico || (!pifia && total >= p.dificultad);
    const resultado = exito ? opcion.exito : opcion.fallo;

    // Bloqueamos las opciones mientras rueda el dado.
    document.querySelectorAll('#opciones button').forEach((b) => (b.disabled = true));
    const caja = $('tirada');
    caja.hidden = false;
    caja.innerHTML = '<div><span class="dado rodando">?</span>' +
      (conVentaja ? '<span class="dado rodando">?</span>' : '') + '</div>' +
      '<div class="detalle">' + NOMBRES_ATRIBUTOS[p.atributo] + ' vs dificultad ' + p.dificultad + '</div>';

    const dadosEl = caja.querySelectorAll('.dado');
    const caras = tirada.caras;
    const animacion = setInterval(() => {
      dadosEl.forEach((d) => (d.textContent = Dados.tirarDado(caras)));
    }, 60);

    setTimeout(() => {
      clearInterval(animacion);
      const frases = aplicarEfectos(resultado.efectos);
      const signo = mod >= 0 ? '+' : '−';
      const etiqueta = critico ? '¡CRÍTICO!' : pifia ? '¡PIFIA!' : exito ? 'ÉXITO' : 'FALLO';

      estado.registro.unshift({
        texto: NOMBRES_ATRIBUTOS[p.atributo] + ': ' + natural + signo + Math.abs(mod) + '=' + total + ' vs ' + p.dificultad,
        exito,
      });
      estado.registro = estado.registro.slice(0, 30);

      caja.innerHTML =
        '<div><span class="dado">' + natural + '</span>' +
        (descartada ? '<span class="dado" style="opacity:.35">' + descartada.total + '</span>' : '') + '</div>' +
        '<div class="detalle">' + natural + ' ' + signo + ' ' + Math.abs(mod) + ' (' + NOMBRES_ATRIBUTOS[p.atributo] + ') = ' +
        total + ' vs ' + p.dificultad + (conVentaja ? ' · con ventaja' : '') + '</div>' +
        '<div class="' + (exito ? 'exito' : 'fallo') + '">' + etiqueta + '</div>' +
        '<p>' + (resultado.texto || '') + '</p>' +
        frases.map((f) => '<div class="efecto">' + f + '</div>').join('');

      const opciones = $('opciones');
      opciones.innerHTML = '';
      const seguir = document.createElement('button');
      seguir.textContent = estado.vida <= 0 ? 'Continuar…' : 'Continuar →';
      seguir.onclick = () => irA(resultado.ir);
      opciones.appendChild(seguir);
      guardar();
      renderFicha();
      seguir.focus();
    }, 900);
  }

  // ---------- Renderizado ----------

  function render(frasesEntrada) {
    const escena = ESCENAS[estado.escena];
    $('escena-titulo').textContent = escena.titulo;
    $('escena-texto').innerHTML =
      escena.texto.map((p) => '<p>' + p + '</p>').join('') +
      (frasesEntrada || []).map((f) => '<div class="efecto">' + f + '</div>').join('');
    $('tirada').hidden = true;

    const opciones = $('opciones');
    opciones.innerHTML = '';

    if (escena.fin) {
      const b = document.createElement('button');
      b.textContent = escena.fin === 'victoria' ? '🏆 Jugar otra vez' : '🎲 Intentarlo de nuevo';
      b.onclick = reiniciar;
      opciones.appendChild(b);
    }

    escena.opciones.forEach((op) => {
      if (op.oculta_si && cumple(op.oculta_si)) return;
      const b = document.createElement('button');
      b.textContent = op.texto;
      if (op.prueba) {
        const tag = document.createElement('span');
        tag.className = 'etiqueta';
        const ventaja = op.prueba.ventaja && cumple(op.prueba.ventaja) ? ' ⇈' : '';
        tag.textContent = '🎲 ' + NOMBRES_ATRIBUTOS[op.prueba.atributo] + ' ' + op.prueba.dificultad + ventaja;
        tag.title = ventaja ? 'Tiras con ventaja (2 dados, te quedas el mejor)' : '';
        b.appendChild(tag);
      }
      if (op.requiere && !cumple(op.requiere)) {
        b.disabled = true;
        b.title = describirRequisito(op.requiere);
        b.textContent += ' (' + describirRequisito(op.requiere) + ')';
      }
      b.onclick = () => elegir(op);
      opciones.appendChild(b);
    });

    renderFicha();
  }

  function renderFicha() {
    const fila = (k, v) => '<div><span>' + k + '</span><span>' + v + '</span></div>';
    const a = estado.atributos;
    const fmt = (n) => (n >= 0 ? '+' : '') + n;
    $('stats').innerHTML =
      fila('❤️ Vida', estado.vida + ' / ' + VIDA_MAX) +
      fila('🪙 Oro', estado.oro) +
      Object.keys(NOMBRES_ATRIBUTOS).map((k) => fila(NOMBRES_ATRIBUTOS[k], fmt(a[k]))).join('');
    $('inventario').innerHTML = estado.inventario.length
      ? estado.inventario.map((o) => '<li>' + o + '</li>').join('')
      : '<li><em>vacío</em></li>';
    $('registro').innerHTML = estado.registro
      .map((r) => '<li class="' + (r.exito ? 'exito' : 'fallo') + '">' + r.texto + '</li>')
      .join('');
  }

  function reiniciar() {
    estado = estadoInicial();
    guardar();
    render();
  }

  $('btn-reiniciar').onclick = () => {
    if (estado.escena === 'inicio' || confirm('¿Empezar una partida nueva? Se perderá el progreso.')) reiniciar();
  };

  render();
})();
