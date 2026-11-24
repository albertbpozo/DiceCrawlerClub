/*
  EVENTOS DE HISTORIA — personajes que recuerdan lo que hiciste.

  Un evento no está en los pools normales. Al empezar cada piso se elige, por cada 'grupo',
  uno de los eventos que cumplan sus condiciones, y se coloca en un paso al azar del piso.

    id      : identificador único
    grupo   : solo sale un evento de cada grupo por piso
    pisos   : índices de piso donde puede salir (0 = piso 1)
    si      : [banderas] que DEBES tener
    si_no   : [banderas] que NO debes tener
    modo    : 'puerta'    -> aparece como una puerta extra (opcional)
              'emboscada' -> sustituye a las puertas de ese paso (obligatorio)
    puerta  : { icono, nombre, texto }  (solo para modo 'puerta')
    escena  : una escena normal (titulo, texto, opciones)

  Efecto extra disponible aquí y en cualquier escena: quitar_bandera: 'x' | [...]

  AYUDAS_JEFE: opciones que se añaden a TODOS los jefes. Con 'automatico: true' no se tira:
  es un éxito directo. Usa 'requiere' y 'oculta_si' para decidir cuándo aparecen.
*/

const AMIGO = 'caballero_amigo';
const ENEMIGO = 'caballero_enemigo';
const JURAMENTO = 'caballero_juramento';
const FIN_CABALLERO = ['caballero_vencido', 'caballero_ignorado'];
const TODAS_CABALLERO = [AMIGO, ENEMIGO, JURAMENTO, ...FIN_CABALLERO];

const EVENTOS = [
  // ---------------------------------------------------------------- Primer encuentro
  {
    id: 'caballero_hoguera', grupo: 'caballero', pisos: [0, 1], modo: 'puerta',
    si_no: TODAS_CABALLERO,
    puerta: { icono: '🛡️', nombre: 'Puerta de la hoguera', texto: 'Huele a leña y se oye el tintineo de una armadura.' },
    escena: {
      titulo: 'Sir Bartolomé de la Tirada Perdida',
      texto: [
        'Junto a una pequeña hoguera descansa un caballero de armadura abollada. Remueve un guiso con su espada.',
        '«Bienhallado, aspirante. Soy Sir Bartolomé. Llevo años intentando entrar en el club... y años sacando unos.» Te señala un tronco libre.',
      ],
      opciones: [
        { texto: 'Sentarte junto al fuego y hablar con él', prueba: { atributo: 'social', dificultad: 12 },
          exito: { texto: 'Compartís guiso e historias. Al final te estrecha la mano: «Si alguna vez te ves en apuros, gritaré tu nombre más fuerte que nadie.»',
                   efectos: { bandera: AMIGO, vida: 2 } },
          fallo: { texto: 'Haces un chiste sobre su mala suerte. Se le borra la sonrisa. «Te arrepentirás de eso.» Recoge sus cosas y se va.',
                   efectos: { bandera: ENEMIGO } } },
        { texto: 'Atacarle mientras está desprevenido', prueba: { atributo: 'fisico', dificultad: 13 },
          exito: { texto: 'Lo desarmas. Se rinde con dignidad y te entrega su escudo. «Has ganado. Que te sirva mejor que a mí.»',
                   efectos: { bandera: 'caballero_vencido', ganar: ['Escudo de Sir Bartolomé'], oro: '1d4' } },
          fallo: { texto: 'Te para con el escudo sin levantarse siquiera. «¿A traición? Nos volveremos a ver.»',
                   efectos: { bandera: ENEMIGO, vida: '-1d4' } } },
        { texto: 'No acercarte y seguir tu camino', efectos: { bandera: 'caballero_ignorado' } },
      ],
    },
  },

  // ---------------------------------------------------------------- Aliado: piso 2
  {
    id: 'caballero_necrofagos', grupo: 'caballero', pisos: [1], modo: 'puerta',
    si: [AMIGO], si_no: [JURAMENTO],
    puerta: { icono: '🛡️', nombre: 'Puerta del estruendo', texto: 'Se oye un choque de acero y una voz conocida: «¡Atrás, bestias!»' },
    escena: {
      titulo: 'Sir Bartolomé en apuros',
      texto: ['Sir Bartolomé está rodeado de necrófagos, con la espalda contra un sarcófago. Te ve: «¡Amigo! ¡Me vendría bien una mano!»'],
      opciones: [
        { texto: 'Luchar a su lado', prueba: { atributo: 'fisico', dificultad: 13 },
          exito: { texto: 'Espalda con espalda, los hacéis huir. «Te debo la vida. Lo juro por mi escudo: cuando llegue la hora, allí estaré.»',
                   efectos: { bandera: JURAMENTO, ganar: ['Poción'], oro: '1d6' } },
          fallo: { texto: 'Te llevas unos cuantos zarpazos. Él acaba con los necrófagos, agradecido pero preocupado por ti.',
                   efectos: { vida: '-1d6', ganar: ['Poción'] } } },
        { texto: 'Distraerlos golpeando un escudo y gritando', prueba: { atributo: 'social', dificultad: 13 },
          exito: { texto: 'Los necrófagos se giran hacia ti, y Sir Bartolomé los barre por la espalda. «¡Brillante! Lo juro: te devolveré el favor.»',
                   efectos: { bandera: JURAMENTO, oro: '1d6' } },
          fallo: { texto: 'Te persiguen a ti. Corres en círculos hasta que él los alcanza.', efectos: { vida: '-1d4' } } },
        { texto: 'Recitar un conjuro de luz para cegarlos', prueba: { atributo: 'mental', dificultad: 14 },
          exito: { texto: 'Un destello y los necrófagos huyen chillando. «¡Hechicería amiga! Cuenta conmigo, siempre.»',
                   efectos: { bandera: JURAMENTO } },
          fallo: { texto: 'El conjuro chisporrotea. Os toca luchar a la antigua.', efectos: { vida: '-1d6' } } },
        { texto: 'Dejarle solo', efectos: { quitar_bandera: AMIGO, bandera: 'caballero_ignorado' } },
      ],
    },
  },

  // ---------------------------------------------------------------- Aliado: piso 3 (una de dos)
  {
    id: 'caballero_golem', grupo: 'caballero', pisos: [2], modo: 'puerta',
    si: [AMIGO],
    puerta: { icono: '🛡️', nombre: 'Puerta del acero', texto: 'Algo enorme golpea el suelo. Entre los golpes, un grito de guerra que ya conoces.' },
    escena: {
      titulo: 'Sir Bartolomé contra el gólem',
      texto: ['Un gólem de fichas de póquer tiene a Sir Bartolomé agarrado por la capa. «¡Justo a tiempo! ¡Su punto débil está en la espalda!»'],
      opciones: [
        { texto: 'Golpear al gólem por la espalda', prueba: { atributo: 'fisico', dificultad: 15 },
          exito: { texto: 'El gólem se derrumba en una lluvia de fichas. Sir Bartolomé te entrega un dado: «Me dio suerte una vez. Ahora es tuyo.»',
                   efectos: { bandera: JURAMENTO, ganar: ['Dado trucado'], oro: '1d6' } },
          fallo: { texto: 'El gólem te aparta de un manotazo, pero Sir Bartolomé aprovecha y lo derriba.', efectos: { vida: '-1d8' } } },
        { texto: 'Gritarle órdenes tácticas', prueba: { atributo: 'mental', dificultad: 15 },
          exito: { texto: '«¡Izquierda! ¡Ahora!» Sir Bartolomé sigue tus instrucciones y el gólem cae. «Formamos buen equipo.»',
                   efectos: { bandera: JURAMENTO, oro: '2d4' } },
          fallo: { texto: 'Se lía con tus instrucciones y los dos acabáis en el suelo.', efectos: { vida: '-1d6' } } },
        { texto: 'Seguir adelante sin él', efectos: {} },
      ],
    },
  },
  {
    id: 'caballero_herido', grupo: 'caballero', pisos: [2], modo: 'puerta',
    si: [AMIGO],
    puerta: { icono: '🛡️', nombre: 'Puerta del lamento', texto: 'Un quejido metálico, como una armadura que respira con dificultad.' },
    escena: {
      titulo: 'Sir Bartolomé, herido',
      texto: ['Sir Bartolomé está sentado contra la pared, con la armadura agujereada. «No es nada... solo un rasguño de dragón pequeñito.»'],
      opciones: [
        { texto: 'Curarle con tus conocimientos', prueba: { atributo: 'mental', dificultad: 14 },
          exito: { texto: 'Le vendas y le cierras la herida. «Te debo otra. Esta vez de verdad: cuando llegue el final, estaré a tu lado.»',
                   efectos: { bandera: JURAMENTO } },
          fallo: { texto: 'Haces lo que puedes. Sobrevivirá, pero no estará en condiciones de ayudar pronto.', efectos: {} } },
        { texto: 'Darle una de tus pociones', requiere: { objeto: 'Poción' },
          efectos: { perder: ['Poción'], bandera: JURAMENTO, ganar: ['Escudo de Sir Bartolomé'] } },
        { texto: 'Animarle a seguir', prueba: { atributo: 'social', dificultad: 15 },
          exito: { texto: '«¡Tienes razón! ¡Un caballero no se rinde!» Se levanta de un salto.', efectos: { bandera: JURAMENTO } },
          fallo: { texto: 'Suspira. «Ve tú delante. Yo te alcanzo.»', efectos: {} } },
      ],
    },
  },

  // ---------------------------------------------------------------- Enemigo: pisos 2 y 3
  {
    id: 'caballero_emboscada', grupo: 'caballero', pisos: [1, 2], modo: 'emboscada',
    si: [ENEMIGO],
    escena: {
      titulo: '⚔️ ¡Emboscada de Sir Bartolomé!',
      texto: [
        'Antes de que elijas puerta, una figura con armadura abollada salta desde las sombras. Sir Bartolomé, con la espada en alto.',
        '«¡Te dije que nos volveríamos a ver!»',
      ],
      opciones: [
        { texto: 'Plantarle cara', prueba: { atributo: 'fisico', dificultad: 14 },
          exito: { texto: 'Lo derribas. Jadeando, te entrega su escudo. «Me has vencido limpiamente. Se acabó la rencilla.»',
                   efectos: { quitar_bandera: ENEMIGO, bandera: 'caballero_vencido', ganar: ['Escudo de Sir Bartolomé'] } },
          fallo: { texto: 'Su espada te alcanza. Se marcha riendo: «Hasta la próxima.»', efectos: { vida: '-1d6' } } },
        { texto: 'Pedirle perdón sinceramente', prueba: { atributo: 'social', dificultad: 15 },
          exito: { texto: 'Baja la espada. «...Supongo que todos hemos dicho tonterías.» Te tiende la mano. Vuelve a ser tu aliado.',
                   efectos: { quitar_bandera: ENEMIGO, bandera: AMIGO } },
          fallo: { texto: '«¡Palabras vacías!» Te da con el escudo y se va.', efectos: { vida: '-1d6' } } },
        { texto: 'Engañarle para que caiga en una trampa', prueba: { atributo: 'mental', dificultad: 14 },
          exito: { texto: 'Cae por una trampilla. Lo oyes maldecir mientras te alejas. Volverá, pero tú ya estarás lejos.' },
          fallo: { texto: 'No cae en tu trampa. Tú sí, en la suya.', efectos: { vida: '-1d6' } } },
      ],
    },
  },
];

// Mensaje que se muestra al conseguir cada bandera (si no hay, sale «Has descubierto algo importante»).
const NOTAS_BANDERA = {
  caballero_amigo: '🛡️ Sir Bartolomé es tu aliado. Podría ayudarte contra los jefes.',
  caballero_enemigo: '⚔️ Sir Bartolomé es ahora tu enemigo. Te buscará en los próximos pisos.',
  caballero_juramento: '🛡️ Sir Bartolomé te ha jurado lealtad. Su ayuda contra los jefes será mayor.',
  caballero_vencido: '🛡️ Sir Bartolomé ha quedado atrás.',
  caballero_ignorado: '🛡️ Sir Bartolomé sigue su propio camino.',
};

// Opciones que aparecen en TODOS los jefes si cumples la condición.
const AYUDAS_JEFE = [
  { texto: '🛡️ Llamar a Sir Bartolomé', automatico: true, una_vez: true,
    requiere: { bandera: AMIGO }, oculta_si: { bandera: JURAMENTO },
    exito: { texto: '«¡Por el club!» Sir Bartolomé irrumpe en la sala y carga contra el jefe.', golpe: 1 } },
  { texto: '🛡️ Invocar el juramento de Sir Bartolomé', automatico: true, una_vez: true,
    requiere: { bandera: JURAMENTO },
    exito: { texto: '«¡Un juramento es un juramento!» Sir Bartolomé aparece con un grito de guerra y golpea con todas sus fuerzas.', golpe: 2 } },
];

if (typeof module !== 'undefined') module.exports = { EVENTOS, AYUDAS_JEFE, NOTAS_BANDERA };
