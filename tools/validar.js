// Comprueba que el contenido del juego es coherente.
// Uso: node tools/validar.js
const { ATRIBUTOS, PERSONAJES, OBJETOS, MEJORAS, PISOS } = require('../js/contenido.js');
const { EVENTOS, AYUDAS_JEFE } = require('../js/historias.js');

const errores = [];
const avisos = [];
const ids = new Set();
const banderasDadas = new Set();
const banderasUsadas = new Set();

function revisarEfectos(ef, donde) {
  if (!ef) return;
  [...(ef.ganar || []), ...(ef.perder || [])].forEach((o) => {
    if (!OBJETOS[o]) errores.push(`${donde}: objeto desconocido "${o}"`);
  });
  Object.keys(ef.atributos || {}).forEach((a) => {
    if (!ATRIBUTOS[a]) errores.push(`${donde}: atributo desconocido "${a}"`);
  });
  [].concat(ef.bandera || []).forEach((b) => banderasDadas.add(b));
}

function revisarCondicion(c, donde) {
  if (!c) return;
  if (c.objeto && !OBJETOS[c.objeto]) errores.push(`${donde}: objeto desconocido "${c.objeto}"`);
  if (c.bandera) banderasUsadas.add(c.bandera);
}

function revisarEscena(e, donde, categoria, esJefe) {
  if (!e.id) errores.push(`${donde}: falta id`);
  else if (ids.has(e.id)) errores.push(`${donde}: id repetido "${e.id}"`);
  ids.add(e.id);
  donde = `${donde} [${e.id}]`;
  if (!e.titulo) errores.push(`${donde}: falta titulo`);
  if (!Array.isArray(e.texto)) errores.push(`${donde}: texto debe ser un array`);
  if (!e.opciones || !e.opciones.length) errores.push(`${donde}: sin opciones`);
  if (esJefe && !(e.resistencia > 0)) errores.push(`${donde}: un jefe necesita resistencia > 0`);

  (e.opciones || []).forEach((op, i) => {
    const d = `${donde} opción ${i + 1}`;
    revisarCondicion(op.requiere, d);
    if (op.prueba) {
      const p = op.prueba;
      if (!ATRIBUTOS[p.atributo]) errores.push(`${d}: atributo desconocido "${p.atributo}"`);
      if (typeof p.dificultad !== 'number') errores.push(`${d}: falta dificultad`);
      if (!op.exito || !op.fallo) errores.push(`${d}: una prueba necesita exito y fallo`);
      revisarCondicion(p.ventaja, d);
      revisarEfectos(op.exito && op.exito.efectos, d);
      revisarEfectos(op.fallo && op.fallo.efectos, d);
    } else {
      if (esJefe) errores.push(`${d}: en un jefe todas las opciones deben tener prueba`);
      revisarEfectos(op.efectos, d);
    }
  });

  // En un jefe debe haber al menos una opción sin requisitos (si no, te puedes quedar atascado).
  if (esJefe && !e.opciones.some((op) => !op.requiere && !op.una_vez)) {
    errores.push(`${donde}: el jefe necesita al menos una opción repetible y sin requisitos`);
  }
  if (categoria && !e.opciones.some((op) => op.prueba && op.prueba.atributo === categoria)) {
    avisos.push(`${donde}: está en el pool "${categoria}" pero ninguna prueba usa ese atributo`);
  }
}

PERSONAJES.forEach((p) => p.objetos.forEach((o) => { if (!OBJETOS[o]) errores.push(`personaje ${p.nombre}: objeto desconocido "${o}"`); }));
MEJORAS.forEach((m) => revisarEfectos(m.efectos, `mejora "${m.texto}"`));

PISOS.forEach((piso, n) => {
  const donde = `piso ${n + 1}`;
  let total = 0;
  Object.keys(ATRIBUTOS).forEach((cat) => {
    const pool = piso.pool[cat] || [];
    if (!pool.length) avisos.push(`${donde}: el pool "${cat}" está vacío`);
    total += pool.length;
    pool.forEach((e) => revisarEscena(e, `${donde} ${cat}`, cat, false));
  });
  if (total < piso.pasos) errores.push(`${donde}: tiene ${piso.pasos} pasos pero solo ${total} escenas`);
  if (!Array.isArray(piso.jefes) || !piso.jefes.length) errores.push(`${donde}: necesita una lista "jefes" con al menos uno`);
  (piso.jefes || []).forEach((j) => revisarEscena(j, `${donde} jefe`, null, true));
});

// Eventos de historia
EVENTOS.forEach((ev) => {
  const donde = `evento ${ev.id}`;
  if (!ev.grupo) errores.push(`${donde}: falta grupo`);
  if (!Array.isArray(ev.pisos) || !ev.pisos.every((n) => PISOS[n])) errores.push(`${donde}: pisos inválidos`);
  if (!['puerta', 'emboscada'].includes(ev.modo)) errores.push(`${donde}: modo debe ser 'puerta' o 'emboscada'`);
  if (ev.modo === 'puerta' && !(ev.puerta && ev.puerta.nombre)) errores.push(`${donde}: un evento de puerta necesita 'puerta'`);
  (ev.si || []).forEach((b) => banderasUsadas.add(b));
  revisarEscena(Object.assign({ id: ev.id }, ev.escena), donde, null, false);
});
AYUDAS_JEFE.forEach((op, i) => {
  const d = `ayuda de jefe ${i + 1}`;
  revisarCondicion(op.requiere, d);
  if (!op.automatico && !op.prueba) errores.push(`${d}: debe ser automatica o tener prueba`);
  if (op.automatico && !op.exito) errores.push(`${d}: una ayuda automática necesita 'exito'`);
});

banderasUsadas.forEach((b) => { if (!banderasDadas.has(b)) errores.push(`la bandera "${b}" se usa pero nunca se consigue`); });

avisos.forEach((a) => console.warn('⚠️  ' + a));
if (errores.length) {
  console.error('❌ Problemas encontrados:\n  - ' + errores.join('\n  - '));
  process.exit(1);
}
const escenas = PISOS.reduce((s, p) => s + Object.values(p.pool).reduce((a, l) => a + l.length, 0), 0);
const jefes = PISOS.reduce((s, p) => s + p.jefes.length, 0);
console.log(`✅ Contenido válido: ${PISOS.length} pisos, ${escenas} escenas, ${jefes} jefes, ${Object.keys(OBJETOS).length} objetos.`);
