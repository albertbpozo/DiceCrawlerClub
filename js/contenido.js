/*
  CONTENIDO DEL JUEGO — Dice Crawler Club (roguelike)

  ATRIBUTOS: 'fisico', 'mental', 'social'.
  Una prueba tira 1d20 + atributo + bonus de objetos y debe igualar o superar la dificultad.

  PISOS: cada piso tiene
    nombre, intro       : texto al llegar al piso
    pasos               : cuántos encuentros hay antes del jefe
    pool                : { fisico: [...], mental: [...], social: [...] } escenas posibles por categoría
    jefe                : escena final del piso (con 'resistencia')

  ESCENA (encuentro):
    id, titulo, texto: [párrafos]
    resistencia : (solo jefes) éxitos necesarios para vencer. Mientras quede, el encuentro sigue.
    opciones    : lista de decisiones

  OPCIÓN:
    texto
    prueba   : { atributo, dificultad, ventaja?: { objeto | bandera } }   (ventaja = 2d20, te quedas el mejor)
    exito    : { texto, efectos?, golpe? (daño al jefe, por defecto 1) }
    fallo    : { texto, efectos?, repetir? (true = sigues en la escena) }
    efectos  : (opciones sin prueba) se aplican y el encuentro termina
    requiere : { objeto | bandera | oro }   -> si no se cumple, la opción sale desactivada
    una_vez  : true -> desaparece tras usarla en este encuentro

  EFECTOS: vida (número o dados '-1d6'), oro, ganar: [...], perder: [...], bandera: 'x' | [...],
           atributos: { mental: 1 } (suma permanente), vidaMax: n
*/

const ATRIBUTOS = {
  fisico: { nombre: 'Físico', icono: '🗡️', puerta: 'Oyes golpes, crujidos y pasos pesados.' },
  mental: { nombre: 'Mental', icono: '🧠', puerta: 'Ves un brillo extraño y símbolos en el marco.' },
  social: { nombre: 'Social', icono: '🗣️', puerta: 'Se oyen voces al otro lado.' },
};

const PERSONAJES = [
  { nombre: 'Guerrera', desc: 'Dura de pelar. Resuelve las cosas a golpes.',
    atributos: { fisico: 3, mental: 0, social: 1 }, vida: 14, oro: 2, objetos: ['Poción'] },
  { nombre: 'Hechicero', desc: 'Frágil, pero sabe leer lo que nadie entiende.',
    atributos: { fisico: 0, mental: 3, social: 1 }, vida: 10, oro: 3, objetos: ['Pergamino de fuego'] },
  { nombre: 'Embaucadora', desc: 'Siempre tiene una palabra (o una moneda) a mano.',
    atributos: { fisico: 1, mental: 0, social: 3 }, vida: 12, oro: 8, objetos: [] },
  { nombre: 'Vagabundo', desc: 'Un poco de todo y un dado de la suerte en el bolsillo.',
    atributos: { fisico: 1, mental: 1, social: 1 }, vida: 12, oro: 3, objetos: ['Dado trucado'] },
];

/*
  OBJETOS:
    bonus      : suma permanente a un atributo mientras lo lleves
    consumible : se puede usar desde el inventario (efectos en 'usar')
    repetir    : consumible que permite repetir una tirada fallida
*/
const OBJETOS = {
  'Poción': { desc: 'Cura 2d4 de vida.', consumible: true, usar: { vida: '2d4' } },
  'Dado trucado': { desc: 'Repite una tirada fallida.', repetir: true },
  'Pergamino de fuego': { desc: 'Da ventaja en algunas pruebas mentales.' },
  'Espada corta': { desc: '+1 Físico.', bonus: { fisico: 1 } },
  'Martillo de guerra': { desc: '+2 Físico.', bonus: { fisico: 2 } },
  'Anteojos de cristal': { desc: '+1 Mental.', bonus: { mental: 1 } },
  'Grimorio negro': { desc: '+2 Mental.', bonus: { mental: 2 } },
  'Anillo de oro': { desc: '+1 Social.', bonus: { social: 1 } },
  'Máscara sonriente': { desc: '+2 Social.', bonus: { social: 2 } },
  'Antorcha': { desc: 'Da ventaja en algunas pruebas físicas en la oscuridad.' },
  'Ganzúas': { desc: 'Da ventaja para abrir cerraduras.' },
};

// Recompensas tras vencer a un jefe (se ofrecen 3 al azar).
const MEJORAS = [
  { texto: '+1 Físico permanente', efectos: { atributos: { fisico: 1 } } },
  { texto: '+1 Mental permanente', efectos: { atributos: { mental: 1 } } },
  { texto: '+1 Social permanente', efectos: { atributos: { social: 1 } } },
  { texto: '+4 vida máxima', efectos: { vidaMax: 4, vida: 4 } },
  { texto: 'Dos pociones', efectos: { ganar: ['Poción', 'Poción'] } },
  { texto: 'Un dado trucado', efectos: { ganar: ['Dado trucado'] } },
  { texto: 'Martillo de guerra (+2 Físico)', efectos: { ganar: ['Martillo de guerra'] } },
  { texto: 'Grimorio negro (+2 Mental)', efectos: { ganar: ['Grimorio negro'] } },
  { texto: 'Máscara sonriente (+2 Social)', efectos: { ganar: ['Máscara sonriente'] } },
  { texto: 'Bolsa de 12 de oro', efectos: { oro: 12 } },
];

const PISOS = [
  // ======================================================================
  {
    nombre: 'Piso 1 · Las Bodegas',
    intro: 'Bajas las escaleras del club. Barriles, telarañas y un olor a vino agrio. Aquí empieza la prueba de iniciación.',
    pasos: 3,
    pool: {
      fisico: [
        { id: 'ratas', titulo: 'Ratas del tamaño de perros',
          texto: ['Media docena de ratas enormes salen de un barril roto y te rodean, chillando.'],
          opciones: [
            { texto: 'Abrirte paso a golpes', prueba: { atributo: 'fisico', dificultad: 11 },
              exito: { texto: 'Repartes patadas hasta que huyen. Entre la paja brilla algo.', efectos: { oro: '1d4' } },
              fallo: { texto: 'Te muerden los tobillos antes de huir.', efectos: { vida: '-1d4' } } },
            { texto: 'Prender la paja para espantarlas', requiere: { objeto: 'Pergamino de fuego' },
              prueba: { atributo: 'mental', dificultad: 9 },
              exito: { texto: 'Una llamarada y las ratas desaparecen.' },
              fallo: { texto: 'El fuego te chamusca las cejas.', efectos: { vida: -1 } } },
          ] },
        { id: 'barriles', titulo: 'Avalancha de barriles',
          texto: ['Pisas una tabla suelta y una pila de barriles empieza a rodar escaleras abajo, directo hacia ti.'],
          opciones: [
            { texto: 'Saltar a un lado', prueba: { atributo: 'fisico', dificultad: 11 },
              exito: { texto: 'Ruedas por el suelo y los barriles pasan rozándote. Uno se rompe: dentro había una poción.', efectos: { ganar: ['Poción'] } },
              fallo: { texto: 'Un barril te pasa por encima.', efectos: { vida: '-1d6' } } },
            { texto: 'Calcular la trayectoria y colocarte en el hueco', prueba: { atributo: 'mental', dificultad: 13 },
              exito: { texto: 'Te quedas quieto en el punto exacto. Los barriles te esquivan a ti.' },
              fallo: { texto: 'Tus cálculos fallan por un barril.', efectos: { vida: '-1d4' } } },
          ] },
        { id: 'portero', titulo: 'El portero borracho',
          texto: ['Un gigantón con un delantal manchado bloquea el pasillo. «Nadie pasa sin echar un pulso.»'],
          opciones: [
            { texto: 'Echar el pulso', prueba: { atributo: 'fisico', dificultad: 12 },
              exito: { texto: 'Le tumbas el brazo. Se ríe y te regala su espada corta.', efectos: { ganar: ['Espada corta'] } },
              fallo: { texto: 'Te retuerce la muñeca. «Otra vez será.» Te deja pasar por pena.', efectos: { vida: -2 } } },
            { texto: 'Retarle a beber en su lugar', prueba: { atributo: 'social', dificultad: 13 },
              exito: { texto: 'Acaba dormido sobre un barril. Pasas de puntillas.' },
              fallo: { texto: 'Acabas tú peor que él.', efectos: { vida: -2 } } },
          ] },
      ],
      mental: [
        { id: 'diario', titulo: 'El diario del contrabandista',
          texto: ['Sobre una mesa hay un diario escrito en clave. Una página habla del «Croupier» que vive en el fondo de la cripta.'],
          opciones: [
            { texto: 'Descifrar la clave', prueba: { atributo: 'mental', dificultad: 11 },
              exito: { texto: '«El Croupier no soporta que le digan su nombre verdadero: Teodoro.» Lo apuntas.', efectos: { bandera: 'nombre_croupier' } },
              fallo: { texto: 'Después de una hora, solo tienes dolor de cabeza.', efectos: { vida: -1 } } },
            { texto: 'Arrancar las páginas para venderlas', efectos: { oro: 3 } },
          ] },
        { id: 'cerradura', titulo: 'La cerradura de los tres dados',
          texto: ['Un cofre con tres ruedas numeradas del 1 al 6. Grabado en la tapa: «Suman once, ninguno se repite, el mayor es el doble del menor.»'],
          opciones: [
            { texto: 'Resolver el acertijo', prueba: { atributo: 'mental', dificultad: 11 },
              exito: { texto: '2, 4 y 5. ¡Clic! Dentro hay monedas y unas anteojos curiosas.', efectos: { oro: '1d6', ganar: ['Anteojos de cristal'] } },
              fallo: { texto: 'Una aguja envenenada salta del mecanismo.', efectos: { vida: '-1d4' } } },
            { texto: 'Forzarlo', prueba: { atributo: 'fisico', dificultad: 13, ventaja: { objeto: 'Ganzúas' } },
              exito: { texto: 'La tapa cede. Solo encuentras monedas.', efectos: { oro: '1d6' } },
              fallo: { texto: 'Te dejas los dedos y el cofre ni se inmuta.', efectos: { vida: -1 } } },
          ] },
        { id: 'vela', titulo: 'La vela que no se apaga',
          texto: ['En una hornacina arde una vela de llama azul. A su alrededor, un círculo de tiza con runas a medio borrar.'],
          opciones: [
            { texto: 'Completar el círculo mágico', prueba: { atributo: 'mental', dificultad: 12, ventaja: { objeto: 'Pergamino de fuego' } },
              exito: { texto: 'La llama se vuelve cálida y te cura las heridas.', efectos: { vida: '1d6+1' } },
              fallo: { texto: 'La llama estalla en tu cara.', efectos: { vida: '-1d4' } } },
            { texto: 'Llevarte la vela como antorcha', efectos: { ganar: ['Antorcha'] } },
          ] },
      ],
      social: [
        { id: 'tahur', titulo: 'El tahúr del sótano',
          texto: ['Un hombre con guantes sin dedos baraja cartas sobre un tonel. «¿Una partidita? Si ganas, te doy algo útil.»'],
          opciones: [
            { texto: 'Leerle la cara mientras juega', prueba: { atributo: 'social', dificultad: 11 },
              exito: { texto: 'Le pillas el farol. Paga con unas ganzúas y una sonrisa torcida.', efectos: { ganar: ['Ganzúas'], oro: 2 } },
              fallo: { texto: 'Te despluma limpiamente.', efectos: { oro: -3 } } },
            { texto: 'Contar las cartas', prueba: { atributo: 'mental', dificultad: 13 },
              exito: { texto: 'Le ganas con matemáticas. Se va refunfuñando y deja su bolsa.', efectos: { oro: '2d4' } },
              fallo: { texto: 'Pierdes la cuenta y la partida.', efectos: { oro: -3 } } },
            { texto: 'No jugar', efectos: {} },
          ] },
        { id: 'mercader', titulo: 'Una mercader perdida',
          texto: ['Una mujer con una mochila enorme está sentada en un escalón. «Me he perdido. Te vendo lo que quieras si me dices por dónde se sale.»'],
          opciones: [
            { texto: 'Indicarle la salida y regatear', prueba: { atributo: 'social', dificultad: 10 },
              exito: { texto: 'Te da una poción gratis por las molestias.', efectos: { ganar: ['Poción'] } },
              fallo: { texto: 'No se fía de ti y se marcha.' } },
            { texto: 'Comprar una poción (4 de oro)', requiere: { oro: 4 }, efectos: { oro: -4, ganar: ['Poción'] } },
            { texto: 'Comprar un dado trucado (6 de oro)', requiere: { oro: 6 }, efectos: { oro: -6, ganar: ['Dado trucado'] } },
          ] },
        { id: 'novatos', titulo: 'Otros aspirantes',
          texto: ['Dos aspirantes al club discuten junto a una puerta. Te miran de reojo. ¿Rivales o aliados?'],
          opciones: [
            { texto: 'Adivinar sus intenciones', prueba: { atributo: 'social', dificultad: 11 },
              exito: { texto: 'Notas que están muertos de miedo. Les das ánimos y te cuentan que el jefe de este piso odia el ruido.', efectos: { bandera: 'secreto_ruido' } },
              fallo: { texto: 'Bajas la guardia y uno te pisa la mano al pasar. Ups.', efectos: { vida: -1 } } },
            { texto: 'Intimidarlos para que te den sus cosas', prueba: { atributo: 'fisico', dificultad: 12 },
              exito: { texto: 'Te dan su bolsa y salen corriendo.', efectos: { oro: '1d6' } },
              fallo: { texto: 'Se ríen de ti y te empujan contra la pared.', efectos: { vida: -2 } } },
          ] },
      ],
    },
    jefe: {
      id: 'jefe_rey_rata', titulo: '👑 JEFE: El Rey Rata',
      texto: ['Al fondo de la bodega, sobre un trono de corchos, una masa de ratas con una corona de hojalata se levanta y chilla.'],
      resistencia: 3,
      opciones: [
        { texto: 'Atacar al montón de ratas', prueba: { atributo: 'fisico', dificultad: 12 },
          exito: { texto: 'Dispersas una buena parte del enjambre.' },
          fallo: { texto: 'Te cubren de mordiscos.', efectos: { vida: '-1d4' } } },
        { texto: 'Golpear una cacerola para aturdirlas', una_vez: true,
          prueba: { atributo: 'mental', dificultad: 12, ventaja: { bandera: 'secreto_ruido' } },
          exito: { texto: '¡CLANG! Las ratas se dispersan aterrorizadas.', golpe: 2 },
          fallo: { texto: 'El ruido solo las enfada más.', efectos: { vida: -2 } } },
        { texto: 'Negociar con el rey (ofrecerle queso)', prueba: { atributo: 'social', dificultad: 14 },
          exito: { texto: 'Algunas ratas desertan atraídas por tu oferta.' },
          fallo: { texto: 'Su majestad no negocia.', efectos: { vida: '-1d4' } } },
      ],
    },
  },

  // ======================================================================
  {
    nombre: 'Piso 2 · Las Catacumbas',
    intro: 'Una escalera de caracol te lleva a pasillos de huesos apilados. El aire está frío y algo te observa desde los nichos.',
    pasos: 4,
    pool: {
      fisico: [
        { id: 'esqueletos', titulo: 'Patrulla de esqueletos',
          texto: ['Tres esqueletos con lanzas oxidadas marchan en fila. Al verte, giran a la vez.'],
          opciones: [
            { texto: 'Luchar', prueba: { atributo: 'fisico', dificultad: 13 },
              exito: { texto: 'Huesos por todas partes. Uno llevaba una bolsa.', efectos: { oro: '1d6' } },
              fallo: { texto: 'Una lanza te alcanza el costado.', efectos: { vida: '-1d6' } } },
            { texto: 'Gritar «¡Cambio de guardia!»', prueba: { atributo: 'social', dificultad: 15 },
              exito: { texto: 'Se dan media vuelta y se van. La disciplina es la disciplina.' },
              fallo: { texto: 'No cuela.', efectos: { vida: '-1d6' } } },
          ] },
        { id: 'pendulo', titulo: 'El pasillo de los péndulos',
          texto: ['Cuchillas enormes oscilan de lado a lado del pasillo. Al otro lado brilla algo.'],
          opciones: [
            { texto: 'Cruzar con buenos reflejos', prueba: { atributo: 'fisico', dificultad: 13, ventaja: { objeto: 'Antorcha' } },
              exito: { texto: 'Pasas sin un rasguño y recoges un anillo de oro del suelo.', efectos: { ganar: ['Anillo de oro'] } },
              fallo: { texto: 'Una cuchilla te raja el brazo.', efectos: { vida: '-1d6' } } },
            { texto: 'Estudiar el ritmo de los péndulos', prueba: { atributo: 'mental', dificultad: 14 },
              exito: { texto: 'Uno, dos, ahora. Cruzas con elegancia.', efectos: { ganar: ['Anillo de oro'] } },
              fallo: { texto: 'Te equivocas de compás.', efectos: { vida: '-1d4' } } },
            { texto: 'Buscar otro camino (pierdes tiempo y te cansas)', efectos: { vida: -1 } },
          ] },
        { id: 'derrumbe', titulo: 'Derrumbe',
          texto: ['El techo cruje. Polvo. Piedras. Una losa enorme empieza a ceder justo encima de ti.'],
          opciones: [
            { texto: 'Sujetar la losa y salir', prueba: { atributo: 'fisico', dificultad: 14 },
              exito: { texto: 'Aguantas lo justo para salir. Detrás de los escombros aparece un nicho con un martillo.', efectos: { ganar: ['Martillo de guerra'] } },
              fallo: { texto: 'Te alcanza de lleno.', efectos: { vida: '-2d4' } } },
            { texto: 'Correr hacia delante', prueba: { atributo: 'fisico', dificultad: 11 },
              exito: { texto: 'Sales del derrumbe cubierto de polvo, pero entero.' },
              fallo: { texto: 'Una piedra te golpea en la espalda.', efectos: { vida: '-1d4' } } },
          ] },
      ],
      mental: [
        { id: 'lapida', titulo: 'La lápida en lengua muerta',
          texto: ['Una lápida enorme con inscripciones antiguas. Algunas letras parecen moverse.'],
          opciones: [
            { texto: 'Traducir la inscripción', prueba: { atributo: 'mental', dificultad: 13 },
              exito: { texto: '«Quien vaya al fondo, que no mire al Croupier a los ojos.» Te lo apuntas. La lápida se abre y hay una poción.', efectos: { bandera: 'no_mirar', ganar: ['Poción'] } },
              fallo: { texto: 'Pronuncias mal una palabra y una ráfaga helada te atraviesa.', efectos: { vida: '-1d6' } } },
            { texto: 'Pasar de largo', efectos: {} },
          ] },
        { id: 'sello', titulo: 'El sello de sangre',
          texto: ['Una puerta con un sello mágico que palpita en rojo. Detrás se oyen monedas.'],
          opciones: [
            { texto: 'Deshacer el hechizo', prueba: { atributo: 'mental', dificultad: 14, ventaja: { objeto: 'Pergamino de fuego' } },
              exito: { texto: 'El sello se apaga. Dentro: un pequeño tesoro y un grimorio.', efectos: { oro: '2d4', ganar: ['Grimorio negro'] } },
              fallo: { texto: 'El sello te muerde la mano.', efectos: { vida: '-1d6' } } },
            { texto: 'Pagar el sello con tu sangre', efectos: { vida: -3, oro: '2d4' } },
          ] },
        { id: 'espejo', titulo: 'El espejo que miente',
          texto: ['Un espejo muestra tu reflejo... pero tu reflejo sonríe y tú no. Te habla: «Adivina cuál de los dos es real.»'],
          opciones: [
            { texto: 'Concentrarte y romper la ilusión', prueba: { atributo: 'mental', dificultad: 13 },
              exito: { texto: 'El reflejo se agrieta y se disuelve. Te sientes más lúcido.', efectos: { atributos: { mental: 1 } } },
              fallo: { texto: 'Por un momento no sabes quién eres. Mareo y náuseas.', efectos: { vida: '-1d4' } } },
            { texto: 'Romper el espejo', prueba: { atributo: 'fisico', dificultad: 12 },
              exito: { texto: 'Mil pedazos. Siete años de mala suerte, pero libre.' },
              fallo: { texto: 'Los cristales te cortan.', efectos: { vida: '-1d6' } } },
          ] },
      ],
      social: [
        { id: 'fantasma', titulo: 'La bibliotecaria fantasma',
          texto: ['Una mujer translúcida coloca libros que ya no existen. «Silencio. ¿Qué buscas aquí?»'],
          opciones: [
            { texto: 'Ganarte su confianza', prueba: { atributo: 'social', dificultad: 13 },
              exito: { texto: 'Te susurra: «El Croupier hace trampas con la mano izquierda.» Y te devuelve algo de vida con un toque frío.', efectos: { bandera: 'trampa_croupier', vida: 3 } },
              fallo: { texto: '«¡SILENCIO!» Un libro fantasma te golpea.', efectos: { vida: '-1d4' } } },
            { texto: 'Responder con una cita erudita', prueba: { atributo: 'mental', dificultad: 14 },
              exito: { texto: 'Le encanta. Te cuenta que el Croupier hace trampas con la mano izquierda.', efectos: { bandera: 'trampa_croupier' } },
              fallo: { texto: 'Citaste mal. Te echa a gritos.', efectos: { vida: -2 } } },
          ] },
        { id: 'enterrador', titulo: 'El enterrador',
          texto: ['Un viejo con una pala cava un agujero de tu tamaño. «¿Vienes a ayudar o a ocuparlo?»'],
          opciones: [
            { texto: 'Adivinar si es amigo o enemigo', prueba: { atributo: 'social', dificultad: 13 },
              exito: { texto: 'Es solo un viejo con humor negro. Te ofrece té y te vende a buen precio.', efectos: { ganar: ['Poción'], vida: 2 } },
              fallo: { texto: 'Era enemigo. Te da con la pala.', efectos: { vida: '-1d6' } } },
            { texto: 'Atacarle primero', prueba: { atributo: 'fisico', dificultad: 12 },
              exito: { texto: 'Huye dejando su bolsa.', efectos: { oro: '1d6' } },
              fallo: { texto: 'El viejo sabe usar la pala.', efectos: { vida: '-1d6' } } },
          ] },
        { id: 'cultistas', titulo: 'Los encapuchados',
          texto: ['Un grupo de encapuchados canta alrededor de un altar. Uno se gira: «¿Eres el nuevo iniciado?»'],
          opciones: [
            { texto: 'Hacerte pasar por uno de ellos', prueba: { atributo: 'social', dificultad: 14 },
              exito: { texto: 'Cantas con ellos. Al final te dan una máscara ceremonial.', efectos: { ganar: ['Máscara sonriente'] } },
              fallo: { texto: 'Te descubren por desafinar. Te echan a golpes.', efectos: { vida: '-1d6' } } },
            { texto: 'Sobornarles para pasar (5 de oro)', requiere: { oro: 5 }, efectos: { oro: -5 } },
            { texto: 'Escabullirte por detrás', prueba: { atributo: 'fisico', dificultad: 13 },
              exito: { texto: 'Pasas como una sombra.' },
              fallo: { texto: 'Tiras un candelabro. Corres, pero te alcanzan.', efectos: { vida: '-1d4' } } },
          ] },
      ],
    },
    jefe: {
      id: 'jefe_caballero', titulo: '👑 JEFE: El Caballero Sin Cabeza',
      texto: ['Una armadura enorme se levanta de un sarcófago. Sostiene su yelmo bajo el brazo, y el yelmo habla: «Demuestra tu valía.»'],
      resistencia: 3,
      opciones: [
        { texto: 'Cruzar espadas con él', prueba: { atributo: 'fisico', dificultad: 14 },
          exito: { texto: 'Abres una brecha en su armadura.' },
          fallo: { texto: 'Su mandoble te barre.', efectos: { vida: '-1d6' } } },
        { texto: 'Robarle el yelmo y esconderlo', una_vez: true, prueba: { atributo: 'fisico', dificultad: 16 },
          exito: { texto: 'Sin su cabeza, el caballero da tumbos ciego.', golpe: 2 },
          fallo: { texto: 'Te atrapa la mano con un guantelete de hierro.', efectos: { vida: '-1d6' } } },
        { texto: 'Recitarle su juramento olvidado', prueba: { atributo: 'mental', dificultad: 14 },
          exito: { texto: 'El caballero duda y baja la guardia.' },
          fallo: { texto: '«¡Blasfemia!»', efectos: { vida: '-1d6' } } },
        { texto: 'Apelar a su honor', prueba: { atributo: 'social', dificultad: 15 },
          exito: { texto: '«Tienes razón...» Su espada tiembla.' },
          fallo: { texto: 'No hay honor en la muerte.', efectos: { vida: '-1d6' } } },
      ],
    },
  },

  // ======================================================================
  {
    nombre: 'Piso 3 · El Santuario del Dado',
    intro: 'Paredes de obsidiana pulida. En el suelo, miles de dados de hueso crujen bajo tus botas. Al fondo, oyes una mesa de juego.',
    pasos: 4,
    pool: {
      fisico: [
        { id: 'golem', titulo: 'El gólem de dados',
          texto: ['Miles de dados se juntan y forman una figura de tres metros que avanza hacia ti.'],
          opciones: [
            { texto: 'Golpear su núcleo', prueba: { atributo: 'fisico', dificultad: 15 },
              exito: { texto: 'El gólem se desmorona en una lluvia de dados.', efectos: { oro: '2d4' } },
              fallo: { texto: 'Un puño de dados te lanza contra la pared.', efectos: { vida: '-1d8' } } },
            { texto: 'Gritarle un número que no exista en un dado', prueba: { atributo: 'mental', dificultad: 16 },
              exito: { texto: '«¡Siete!» El gólem se bloquea intentando procesarlo y se desarma.' },
              fallo: { texto: 'No le afecta.', efectos: { vida: '-1d6' } } },
          ] },
        { id: 'suelo', titulo: 'El suelo de casillas',
          texto: ['Un suelo como un tablero. Cada casilla tiene un número. Algunas suenan huecas.'],
          opciones: [
            { texto: 'Saltar de casilla en casilla a toda velocidad', prueba: { atributo: 'fisico', dificultad: 14, ventaja: { objeto: 'Antorcha' } },
              exito: { texto: 'Llegas al otro lado antes de que se hunda nada.' },
              fallo: { texto: 'Una casilla se hunde y caes a un foso de pinchos.', efectos: { vida: '-1d8' } } },
            { texto: 'Buscar el patrón de las casillas seguras', prueba: { atributo: 'mental', dificultad: 15 },
              exito: { texto: 'Solo los números primos. Cruzas paseando y encuentras una poción.', efectos: { ganar: ['Poción'] } },
              fallo: { texto: 'El 9 no era primo.', efectos: { vida: '-1d6' } } },
          ] },
        { id: 'campeon', titulo: 'El antiguo campeón',
          texto: ['Un viejo luchador con cicatrices te cierra el paso. «Fui miembro del club. Ahora soy su guardián.»'],
          opciones: [
            { texto: 'Combatir', prueba: { atributo: 'fisico', dificultad: 15 },
              exito: { texto: 'Cae de rodillas, sonriendo. «Bien. Toma, te hará falta.»', efectos: { ganar: ['Poción', 'Dado trucado'] } },
              fallo: { texto: 'Te da una lección dolorosa.', efectos: { vida: '-1d8' } } },
            { texto: 'Preguntarle por sus días en el club', prueba: { atributo: 'social', dificultad: 15 },
              exito: { texto: 'Te cuenta batallitas y te deja pasar, con nostalgia.', efectos: { vida: 2 } },
              fallo: { texto: '«No me hagas perder el tiempo.» Te da un empujón.', efectos: { vida: '-1d4' } } },
          ] },
      ],
      mental: [
        { id: 'oraculo', titulo: 'El oráculo de los dados',
          texto: ['Una calavera sobre un atril tira dados sin parar. «Pregunta y te diré el futuro... si sabes leerlo.»'],
          opciones: [
            { texto: 'Interpretar sus tiradas', prueba: { atributo: 'mental', dificultad: 15 },
              exito: { texto: 'Lees el futuro: tu próxima mala tirada no lo será. Recibes un dado trucado.', efectos: { ganar: ['Dado trucado'] } },
              fallo: { texto: 'Ves tu propia muerte. Del susto, te tiembla todo.', efectos: { vida: '-1d6' } } },
            { texto: 'Robarle los dados', prueba: { atributo: 'fisico', dificultad: 14 },
              exito: { texto: 'Te los llevas. Valen una fortuna.', efectos: { oro: '2d6' } },
              fallo: { texto: 'La calavera te muerde.', efectos: { vida: '-1d6' } } },
          ] },
        { id: 'conjuro', titulo: 'El círculo de invocación',
          texto: ['Un círculo mágico a medio terminar. Si lo completas, podrías invocar algo... útil o terrible.'],
          opciones: [
            { texto: 'Lanzar el conjuro', prueba: { atributo: 'mental', dificultad: 15, ventaja: { objeto: 'Pergamino de fuego' } },
              exito: { texto: 'Aparece un espíritu sanador que te restaura.', efectos: { vida: '2d6' } },
              fallo: { texto: 'Algo con demasiados dientes sale del círculo antes de que lo cierres.', efectos: { vida: '-1d8' } } },
            { texto: 'Borrar el círculo y seguir', efectos: {} },
          ] },
        { id: 'biblioteca', titulo: 'La biblioteca de las probabilidades',
          texto: ['Libros que calculan solos. Uno está abierto en una página titulada: «Cómo vencer a la Casa».'],
          opciones: [
            { texto: 'Estudiar el libro', prueba: { atributo: 'mental', dificultad: 14 },
              exito: { texto: 'Entiendes cómo hace trampas el Croupier: siempre con la mano izquierda.', efectos: { bandera: 'trampa_croupier' } },
              fallo: { texto: 'Las cifras te marean y te sangra la nariz.', efectos: { vida: '-1d4' } } },
            { texto: 'Arrancar la página y leerla luego', prueba: { atributo: 'fisico', dificultad: 13 },
              exito: { texto: 'La guardas. Algo es algo.', efectos: { bandera: 'trampa_croupier', vida: -1 } },
              fallo: { texto: 'El libro te muerde los dedos.', efectos: { vida: '-1d6' } } },
          ] },
      ],
      social: [
        { id: 'apostadores', titulo: 'La mesa de los condenados',
          texto: ['Almas en pena juegan a los dados apostando años de vida. «Siéntate. Una ronda.»'],
          opciones: [
            { texto: 'Adivinar quién va de farol', prueba: { atributo: 'social', dificultad: 15 },
              exito: { texto: 'Les ganas. Te sientes más vivo que nunca.', efectos: { vida: '1d6+2', oro: '1d6' } },
              fallo: { texto: 'Pierdes. Te arrebatan un poco de vida.', efectos: { vida: '-1d8' } } },
            { texto: 'Negarte educadamente', prueba: { atributo: 'social', dificultad: 11 },
              exito: { texto: 'Te dejan ir.' },
              fallo: { texto: 'Se ofenden. Te cobran el asiento igualmente.', efectos: { vida: -3 } } },
          ] },
        { id: 'traidor', titulo: 'Un miembro del club',
          texto: ['Un tipo con la insignia del club te saluda. «¡Por fin! Te estaba esperando. Sígueme, conozco un atajo.»'],
          opciones: [
            { texto: 'Leer sus verdaderas intenciones', prueba: { atributo: 'social', dificultad: 15 },
              exito: { texto: 'Miente: trabaja para el Croupier. Le desenmascaras y te confiesa su debilidad: nunca le mires a los ojos.', efectos: { bandera: 'no_mirar' } },
              fallo: { texto: 'Le sigues... directo a una trampa.', efectos: { vida: '-1d8' } } },
            { texto: 'Seguir tu propio camino', efectos: {} },
          ] },
        { id: 'diablillo', titulo: 'El diablillo comerciante',
          texto: ['Un demonio pequeño con chaleco te ofrece sus mercancías. «Precios infernales, garantizado.»'],
          opciones: [
            { texto: 'Regatear', prueba: { atributo: 'social', dificultad: 14 },
              exito: { texto: 'Le sacas un objeto gratis. Está impresionado.', efectos: { ganar: ['Máscara sonriente'] } },
              fallo: { texto: 'Te cobra por el tiempo perdido.', efectos: { oro: -4 } } },
            { texto: 'Comprar dos pociones (6 de oro)', requiere: { oro: 6 }, efectos: { oro: -6, ganar: ['Poción', 'Poción'] } },
            { texto: 'Vender un año de vida por 10 de oro', efectos: { vida: -3, oro: 10 } },
          ] },
      ],
    },
    jefe: {
      id: 'jefe_croupier', titulo: '👑 JEFE FINAL: El Croupier Eterno',
      texto: [
        'Tras una mesa de fieltro verde, una figura de traje impecable y sin rostro baraja dados de obsidiana.',
        '«La Casa siempre gana», dice. «Pero adelante. Juega.»',
      ],
      resistencia: 4,
      opciones: [
        { texto: 'Volcar la mesa y atacar', prueba: { atributo: 'fisico', dificultad: 16 },
          exito: { texto: 'Le golpeas. Su traje se rasga y debajo solo hay humo.' },
          fallo: { texto: 'Te lanza un dado que estalla como una bomba.', efectos: { vida: '-1d8' } } },
        { texto: 'Desafiarle a una tirada sin mirarle a los ojos', prueba: { atributo: 'mental', dificultad: 16, ventaja: { bandera: 'no_mirar' } },
          exito: { texto: 'Sus trucos de hipnosis no funcionan. Ganas la tirada.' },
          fallo: { texto: 'Sus ojos te atrapan. Te sientes vacío.', efectos: { vida: '-1d8' } } },
        { texto: 'Provocarle para que se equivoque', prueba: { atributo: 'social', dificultad: 16 },
          exito: { texto: 'Pierde la compostura y tira los dados con rabia. Sacan un 1.' },
          fallo: { texto: 'Sonríe sin rostro. «Buen intento.» Un dado te golpea en la frente.', efectos: { vida: '-1d8' } } },
        { texto: 'Denunciar sus trampas con la mano izquierda', requiere: { bandera: 'trampa_croupier' }, una_vez: true,
          prueba: { atributo: 'social', dificultad: 14 },
          exito: { texto: '«¡Tramposo!» La sala entera de almas se gira contra él.', golpe: 2 },
          fallo: { texto: 'Nadie te cree.', efectos: { vida: '-1d6' } } },
        { texto: 'Llamarle por su verdadero nombre: «Teodoro»', requiere: { bandera: 'nombre_croupier' }, una_vez: true,
          prueba: { atributo: 'social', dificultad: 12 },
          exito: { texto: 'Se encoge, humillado. Su poder se tambalea.', golpe: 2 },
          fallo: { texto: 'Se ríe: «Ese nombre ya no significa nada».', efectos: { vida: '-1d6' } } },
      ],
    },
  },
];

if (typeof module !== 'undefined') module.exports = { ATRIBUTOS, PERSONAJES, OBJETOS, MEJORAS, PISOS };
