// Comprueba que la aventura es coherente: destinos existentes, atributos válidos y escenas alcanzables.
// Uso: node tools/validar.js
const ESCENAS = require('../js/escenas.js');

const ATRIBUTOS = ['fuerza', 'agilidad', 'ingenio', 'carisma'];
const errores = [];
const alcanzables = new Set(['inicio', 'muerte']);

for (const [id, escena] of Object.entries(ESCENAS)) {
  if (!escena.titulo) errores.push(`${id}: falta titulo`);
  if (!Array.isArray(escena.texto)) errores.push(`${id}: texto debe ser un array de párrafos`);
  if (!escena.fin && !escena.opciones.length) errores.push(`${id}: no tiene opciones ni es un final`);

  escena.opciones.forEach((op, i) => {
    const donde = `${id} › opción ${i + 1} ("${op.texto}")`;
    const destinos = op.prueba ? [op.exito, op.fallo] : [op];
    if (op.prueba) {
      if (!ATRIBUTOS.includes(op.prueba.atributo)) errores.push(`${donde}: atributo desconocido "${op.prueba.atributo}"`);
      if (typeof op.prueba.dificultad !== 'number') errores.push(`${donde}: falta dificultad`);
      if (!op.exito || !op.fallo) errores.push(`${donde}: una prueba necesita exito y fallo`);
    }
    destinos.filter(Boolean).forEach((d) => {
      if (!d.ir) errores.push(`${donde}: falta "ir"`);
      else if (!ESCENAS[d.ir]) errores.push(`${donde}: la escena "${d.ir}" no existe`);
      else alcanzables.add(d.ir);
    });
  });
}

for (const id of Object.keys(ESCENAS)) {
  if (!alcanzables.has(id)) errores.push(`${id}: ninguna opción lleva a esta escena`);
}

if (errores.length) {
  console.error('❌ Problemas encontrados:\n  - ' + errores.join('\n  - '));
  process.exit(1);
}
console.log(`✅ Aventura válida: ${Object.keys(ESCENAS).length} escenas.`);
