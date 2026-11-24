# 🎲 Dice Crawler Club

Roguelike de texto: baja por los pisos de la cripta resolviendo escenas con tiradas de dados.
Cada partida es distinta y, si mueres, empiezas de cero.

## Cómo jugar

Abre `index.html` en el navegador. No hace falta instalar nada.

1. **Elige personaje.** Cada uno destaca en uno de los tres atributos: 🗡️ **Físico**, 🧠 **Mental** y 🗣️ **Social**.
2. **Elige puerta.** En cada paso aparecen 2 o 3 puertas, cada una de una categoría. Detrás hay una escena al azar
   del pool de esa categoría en ese piso (5 por categoría y piso, sin repetir en la misma partida):
   - 🗡️ **Físico**: combates, esquivar trampas, fuerza bruta.
   - 🧠 **Mental**: hechizos, traducir textos, acertijos.
   - 🗣️ **Social**: persuadir, regatear, adivinar intenciones.
3. **Tira.** Las pruebas son **1d20 + atributo** contra una dificultad, que además varía ±1 al azar en cada encuentro.
   Muchas escenas permiten probar con otro atributo, normalmente más difícil.
   **Al principio no ves qué atributo usa cada opción ni lo difícil que es.** Para verlo tienes que conseguir:
   - 🧐 **Monóculo de tahúr**: muestra el atributo de cada opción (y si tiras con ventaja).
   - 🧮 **Ábaco de hueso**: muestra la dificultad y, junto al monóculo, tu probabilidad de éxito.

   Se consiguen en algunos eventos, en tiendas o como mejora tras un jefe.
   - Un 20 natural es siempre éxito y un 1 natural siempre fallo.
   - `⇈` = **ventaja**: tiras 2d20 y te quedas el mejor (por un objeto o una pista).
4. **Vence al jefe** al final de cada piso (cada piso tiene varios jefes posibles y se sortea uno). Tiene una resistencia (◆): cada éxito le quita uno.
   Algunas opciones de jefe solo aparecen si encontraste la pista adecuada en pisos anteriores.
5. **Elige una mejora** tras cada jefe: atributos, vida máxima, objetos…

### Sir Bartolomé, el caballero errante

Algunos personajes recuerdan lo que les hiciste. En el piso 1 (o en el 2, si no entraste) puede aparecer
una 🛡️ **Puerta de la hoguera** con Sir Bartolomé:

- **Hablar con él** y salir bien → se hace tu **aliado**. En los jefes tendrás la opción «Llamar a Sir Bartolomé»:
  éxito automático, una vez por jefe. Si sale mal → **enemigo**.
- **Atacarle** y ganar → te da su escudo (+1 Físico, +1 Social) y se va. Si pierdes → **enemigo**.
- **No acercarte** → sigue su camino.

Si es tu **aliado**, en los pisos siguientes puede aparecer luchando contra algo o herido. Si le ayudas, te
recompensa y te jura lealtad: su ayuda contra los jefes quitará 2 de resistencia en vez de 1.
Si es tu **enemigo**, te tenderá una **emboscada** en los pisos siguientes (puedes vencerle, engañarle o pedirle perdón).

Si tu vida llega a 0, la partida termina (muerte permanente). El récord se guarda en el navegador.

## Estructura

| Archivo | Qué contiene |
|---|---|
| `js/contenido.js` | Todo el contenido: personajes, objetos, mejoras, pisos, pools de escenas y jefes. |
| `js/historias.js` | Eventos de historia (personajes recurrentes como Sir Bartolomé) y ayudas en los jefes. |
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
