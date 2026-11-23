# 🎲 Dice Crawler Club

Juego de texto por escenas en el que resuelves las situaciones tirando dados.

## Cómo jugar

Abre `index.html` en el navegador. No hace falta instalar nada.

- Elige un tipo de personaje: cada uno da bonificadores a **Fuerza**, **Agilidad**, **Ingenio** o **Carisma**.
- Algunas opciones llevan una etiqueta `🎲 Atributo N`: se tira **1d20 + atributo** y hay que igualar o superar **N**.
  - Un 20 natural siempre es éxito (crítico); un 1 natural siempre es fallo (pifia).
  - `⇈` significa **ventaja**: se tiran dos dados y te quedas el mejor (por un objeto o algo que hayas descubierto).
- Si tu vida llega a 0, pierdes. La partida se guarda sola en el navegador.

## Estructura

| Archivo | Qué contiene |
|---|---|
| `js/escenas.js` | La aventura: todas las escenas, opciones, pruebas y efectos. |
| `js/motor.js` | El motor: estado del personaje, tiradas, efectos y pantalla. |
| `js/dados.js` | Utilidades de dados (`1d20`, `2d6+1`, …). |
| `tools/validar.js` | Comprueba que la aventura no tiene enlaces rotos. |

## Escribir tus propias escenas

Añade entradas a `ESCENAS` en `js/escenas.js`. Ejemplo:

```js
puente: {
  titulo: 'El puente de cuerda',
  texto: ['Un puente se balancea sobre un abismo.'],
  opciones: [
    { texto: 'Cruzar corriendo',
      prueba: { atributo: 'agilidad', dificultad: 12 },
      exito: { texto: 'Llegas al otro lado.', ir: 'cueva' },
      fallo: { texto: 'Una tabla se rompe.', ir: 'cueva', efectos: { vida: '-1d6' } } },
    { texto: 'Usar la cuerda', requiere: { objeto: 'Cuerda' }, ir: 'cueva' },
  ],
},
```

Efectos disponibles: `vida`, `oro` (número o dados como `'-1d6'`), `ganar`, `perder` (listas de objetos),
`bandera` (marcas de cosas que has hecho o descubierto) y `atributos`.
Condiciones: `requiere` (desactiva la opción si no se cumple) y `oculta_si` (la esconde si se cumple).
La documentación completa del formato está al principio de `js/escenas.js`.

Después de editar, ejecuta `node tools/validar.js` para comprobar que todo está bien enlazado.
