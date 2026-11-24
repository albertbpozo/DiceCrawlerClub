# 🎲 Dice Crawler Club

Roguelike de texto: baja por los pisos de la cripta resolviendo escenas con tiradas de dados.
Cada partida es distinta y, si mueres, empiezas de cero.

## Cómo jugar

Abre `index.html` en el navegador. No hace falta instalar nada.

1. **Elige personaje.** Cada uno destaca en uno de los tres atributos: 🗡️ **Físico**, 🧠 **Mental** y 🗣️ **Social**.
2. **Elige puerta.** En cada paso aparecen 2 o 3 puertas, cada una de una categoría. Detrás hay una escena al azar
   del pool de esa categoría en ese piso:
   - 🗡️ **Físico**: combates, esquivar trampas, fuerza bruta.
   - 🧠 **Mental**: hechizos, traducir textos, acertijos.
   - 🗣️ **Social**: persuadir, regatear, adivinar intenciones.
3. **Tira.** Las pruebas son **1d20 + atributo** contra una dificultad; el botón muestra la probabilidad de éxito.
   Muchas escenas permiten probar con otro atributo, normalmente más difícil.
   - Un 20 natural es siempre éxito y un 1 natural siempre fallo.
   - `⇈` = **ventaja**: tiras 2d20 y te quedas el mejor (por un objeto o una pista).
4. **Vence al jefe** al final de cada piso. Tiene una resistencia (◆): cada éxito le quita uno.
   Algunas opciones de jefe solo aparecen si encontraste la pista adecuada en pisos anteriores.
5. **Elige una mejora** tras cada jefe: atributos, vida máxima, objetos…

Si tu vida llega a 0, la partida termina (muerte permanente). El récord se guarda en el navegador.

## Estructura

| Archivo | Qué contiene |
|---|---|
| `js/contenido.js` | Todo el contenido: personajes, objetos, mejoras, pisos, pools de escenas y jefes. |
| `js/motor.js` | El motor: fases de la partida, puertas, tiradas, efectos y pantalla. |
| `js/dados.js` | Utilidades de dados (`1d20`, `2d6+1`, …). |
| `tools/validar.js` | Comprueba el contenido (ids repetidos, objetos inexistentes, pistas imposibles…). |

## Añadir escenas

Mete una escena nueva en el pool que corresponda de `js/contenido.js`:

```js
// dentro de PISOS[0].pool.mental
{ id: 'runas_suelo', titulo: 'Runas en el suelo',
  texto: ['Unas runas brillan bajo tus pies.'],
  opciones: [
    { texto: 'Traducirlas', prueba: { atributo: 'mental', dificultad: 12 },
      exito: { texto: 'Es un mapa del piso.', efectos: { bandera: 'mapa' } },
      fallo: { texto: 'Se activan. Quema.', efectos: { vida: '-1d4' } } },
    { texto: 'Pisarlas sin más', efectos: { vida: -1 } },
  ] },
```

- **Efectos:** `vida` y `oro` (número o dados como `'-1d6'`), `ganar` y `perder` (objetos), `bandera` (pistas),
  `atributos` (suma permanente) y `vidaMax`.
- **Condiciones:** `requiere` (desactiva la opción), `ventaja` dentro de `prueba`, y `una_vez` para los jefes.
- **Fallos:** `fallo.repetir: true` te deja en la escena para probar otra opción.

La documentación completa del formato está al principio de `js/contenido.js`.
Después de editar, ejecuta `node tools/validar.js`.
