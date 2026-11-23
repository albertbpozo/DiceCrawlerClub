/*
  AVENTURA: La Cripta del Dado Hueco

  Cada escena tiene:
    titulo   : texto del encabezado
    texto    : array de párrafos
    al_entrar: (opcional) efectos que se aplican cada vez que entras
    fin      : (opcional) 'victoria' | 'derrota' -> termina la partida
    opciones : lista de decisiones

  Cada opción puede tener:
    texto    : lo que ve el jugador
    ir       : id de la escena destino (si no hay prueba)
    efectos  : efectos al elegirla (si no hay prueba)
    requiere : { objeto: 'x' } | { bandera: 'x' } | { oro: n }  -> si no se cumple, la opción sale desactivada
    oculta_si: { objeto: 'x' } | { bandera: 'x' }             -> si se cumple, la opción no aparece
    prueba   : { atributo, dificultad, dados?, ventaja? }
               dados por defecto '1d20'. ventaja: { objeto | bandera } -> tira 2 veces y quédate el mejor.
    exito / fallo : { texto, ir, efectos }

  Efectos posibles:
    vida: número o dados ('-1d6'),  oro: número o dados,
    ganar: ['objeto'], perder: ['objeto'], bandera: 'nombre' o ['a','b'],
    atributos: { fuerza, agilidad, ingenio, carisma }
*/

const ESCENAS = {
  inicio: {
    titulo: 'El Dice Crawler Club',
    texto: [
      'Bajo la ciudad, tras una puerta sin cartel, existe un club donde la gente se juega la vida a los dados. Literalmente.',
      'Hoy es tu noche de iniciación. Antes de bajar, el portero te mira de arriba abajo y pregunta: «¿Y tú qué eres?»',
    ],
    opciones: [
      { texto: 'Una guerrera curtida (Fuerza +3)', ir: 'taberna',
        efectos: { atributos: { fuerza: 3, agilidad: 1, ingenio: 0, carisma: 0 }, ganar: ['Espada mellada'] } },
      { texto: 'Un pícaro escurridizo (Agilidad +3)', ir: 'taberna',
        efectos: { atributos: { fuerza: 0, agilidad: 3, ingenio: 1, carisma: 0 }, ganar: ['Ganzúas'] } },
      { texto: 'Una erudita de biblioteca (Ingenio +3)', ir: 'taberna',
        efectos: { atributos: { fuerza: 0, agilidad: 0, ingenio: 3, carisma: 1 }, ganar: ['Libro de runas'] } },
      { texto: 'Un bardo con labia (Carisma +3)', ir: 'taberna',
        efectos: { atributos: { fuerza: 1, agilidad: 0, ingenio: 0, carisma: 3 }, ganar: ['Laúd'] } },
    ],
  },

  taberna: {
    titulo: 'La taberna del club',
    texto: [
      'Humo, risas y el traqueteo constante de dados sobre madera. La Maestra del Club, una enana con un parche bordado con un 20, te llama a su mesa.',
      '«La prueba es sencilla: baja a la Cripta del Dado Hueco y tráeme el Dado de Obsidiana. Si vuelves, eres de los nuestros.»',
    ],
    opciones: [
      { texto: 'Pedirle un adelanto para equiparte', oculta_si: { bandera: 'adelanto_pedido' },
        prueba: { atributo: 'carisma', dificultad: 12 },
        exito: { texto: 'Se ríe y te lanza una bolsita. «Me gusta tu descaro.»', ir: 'taberna',
                 efectos: { oro: '1d6+3', bandera: 'adelanto_pedido' } },
        fallo: { texto: '«¿Adelanto? Aquí se gana todo a los dados, novata.» Todo el mundo se ríe.', ir: 'taberna',
                 efectos: { bandera: 'adelanto_pedido' } } },
      { texto: 'Comprar una antorcha (3 de oro)', requiere: { oro: 3 }, oculta_si: { objeto: 'Antorcha' },
        ir: 'taberna', efectos: { oro: -3, ganar: ['Antorcha'] } },
      { texto: 'Comprar una poción de curación (5 de oro)', requiere: { oro: 5 }, oculta_si: { objeto: 'Poción' },
        ir: 'taberna', efectos: { oro: -5, ganar: ['Poción'] } },
      { texto: 'Bajar a la cripta', ir: 'entrada' },
    ],
  },

  entrada: {
    titulo: 'La puerta de la cripta',
    texto: [
      'Unas escaleras húmedas te llevan ante una puerta de piedra cubierta de runas. En el centro, una cerradura con forma de dado.',
    ],
    opciones: [
      { texto: 'Empujarla con todas tus fuerzas',
        prueba: { atributo: 'fuerza', dificultad: 13 },
        exito: { texto: 'La piedra cruje y cede. Estás dentro.', ir: 'pasillo' },
        fallo: { texto: 'Te dejas el hombro contra la piedra. No se mueve.', ir: 'entrada', efectos: { vida: '-1d3' } } },
      { texto: 'Forzar la cerradura',
        prueba: { atributo: 'agilidad', dificultad: 12, ventaja: { objeto: 'Ganzúas' } },
        exito: { texto: 'Clic. La puerta se abre sin ruido.', ir: 'pasillo' },
        fallo: { texto: 'Una aguja salta del mecanismo y te pincha el dedo.', ir: 'entrada', efectos: { vida: -1 } } },
      { texto: 'Descifrar las runas',
        prueba: { atributo: 'ingenio', dificultad: 11, ventaja: { objeto: 'Libro de runas' } },
        exito: { texto: '«Di el número que nunca sale.» Susurras «siete» y la puerta se abre. Además, entiendes algo más: el guardián final teme la luz.',
                 ir: 'pasillo', efectos: { bandera: 'secreto_luz' } },
        fallo: { texto: 'Las runas bailan ante tus ojos. Te duele la cabeza.', ir: 'entrada', efectos: { vida: -1 } } },
      { texto: 'Volver a la taberna', ir: 'taberna' },
    ],
  },

  pasillo: {
    titulo: 'El pasillo oscuro',
    texto: [
      'Un pasillo largo y negro como una boca. Huele a polvo y a algo peor. Oyes un leve tic-tac bajo las losas.',
    ],
    opciones: [
      { texto: 'Encender la antorcha y avanzar con cuidado', requiere: { objeto: 'Antorcha' },
        ir: 'cruce', efectos: { bandera: 'trampa_evitada' } },
      { texto: 'Avanzar a tientas',
        prueba: { atributo: 'agilidad', dificultad: 12 },
        exito: { texto: 'Notas una losa suelta justo a tiempo y la saltas.', ir: 'cruce' },
        fallo: { texto: '¡Clac! Unos dardos salen de la pared.', ir: 'cruce', efectos: { vida: '-1d6' } } },
    ],
  },

  cruce: {
    titulo: 'El cruce de los huesos',
    texto: [
      'El pasillo se abre en dos. A la izquierda oyes un repiqueteo de huesos. A la derecha, una voz que tararea una nana.',
      'Al frente hay una puerta enorme con una cerradura en forma de calavera.',
    ],
    opciones: [
      { texto: 'Ir a la izquierda (huesos)', ir: 'esqueleto', oculta_si: { bandera: 'esqueleto_resuelto' } },
      { texto: 'Ir a la derecha (la nana)', ir: 'fantasma', oculta_si: { bandera: 'fantasma_resuelto' } },
      { texto: 'Abrir la gran puerta con la llave de hueso', requiere: { objeto: 'Llave de hueso' }, ir: 'camara',
        efectos: { perder: ['Llave de hueso'] } },
      { texto: 'Beber la poción', requiere: { objeto: 'Poción' }, ir: 'cruce',
        efectos: { vida: '2d4', perder: ['Poción'] } },
    ],
  },

  esqueleto: {
    titulo: 'El guardián de hueso',
    texto: [
      'Un esqueleto con armadura oxidada monta guardia frente a un cofre. De su cuello cuelga una llave tallada en hueso.',
      'Gira la calavera hacia ti. Algo parecido a una mandíbula se abre: «Nadie pasa.»',
    ],
    opciones: [
      { texto: 'Atacarlo de frente',
        prueba: { atributo: 'fuerza', dificultad: 13, ventaja: { objeto: 'Espada mellada' } },
        exito: { texto: 'Le partes el espinazo de un golpe. La llave cae a tus pies.', ir: 'cruce',
                 efectos: { ganar: ['Llave de hueso'], bandera: 'esqueleto_resuelto' } },
        fallo: { texto: 'Su espada oxidada te corta el brazo.', ir: 'esqueleto', efectos: { vida: '-1d4' } } },
      { texto: 'Robarle la llave sin que se entere',
        prueba: { atributo: 'agilidad', dificultad: 14 },
        exito: { texto: 'Tus dedos son más rápidos que sus reflejos de muerto. Llave en mano.', ir: 'cruce',
                 efectos: { ganar: ['Llave de hueso'], bandera: 'esqueleto_resuelto' } },
        fallo: { texto: 'Te pilla la muñeca y te lanza contra la pared.', ir: 'esqueleto', efectos: { vida: -2 } } },
      { texto: 'Convencerle de que ya terminó su turno de guardia',
        prueba: { atributo: 'carisma', dificultad: 15, ventaja: { objeto: 'Laúd' } },
        exito: { texto: '«¿Ya es la hora?» El esqueleto te da la llave, se sienta y se desmorona en paz. Además, deja su cofre abierto.',
                 ir: 'cruce', efectos: { ganar: ['Llave de hueso'], oro: '2d6', bandera: 'esqueleto_resuelto' } },
        fallo: { texto: '«Mi turno es eterno.» Te da un golpe con el escudo por si acaso.', ir: 'esqueleto', efectos: { vida: -1 } } },
      { texto: 'Retroceder al cruce', ir: 'cruce' },
    ],
  },

  fantasma: {
    titulo: 'La bibliotecaria fantasma',
    texto: [
      'Una sala llena de estanterías podridas. Una mujer translúcida coloca libros que ya no existen.',
      '«Silencio en la biblioteca», susurra. «Si quieres algo, responde: tengo seis caras y ningún rostro, decido destinos sin tener voluntad. ¿Qué soy?»',
    ],
    opciones: [
      { texto: 'Pensar la respuesta del acertijo',
        prueba: { atributo: 'ingenio', dificultad: 12 },
        exito: { texto: '«Un dado.» Sonríe. «Toma esto: el guardián del Dado odia la luz.» Y te entrega una llave de hueso que tenía entre las páginas.',
                 ir: 'cruce', efectos: { ganar: ['Llave de hueso'], bandera: ['secreto_luz', 'fantasma_resuelto'] } },
        fallo: { texto: '«Incorrecto.» Un frío te atraviesa el pecho.', ir: 'fantasma', efectos: { vida: -2 } } },
      { texto: 'Halagar su colección de libros',
        prueba: { atributo: 'carisma', dificultad: 13 },
        exito: { texto: 'Se ruboriza (todo lo que puede ruborizarse un fantasma) y te cuenta un secreto: el guardián del Dado odia la luz.',
                 ir: 'cruce', efectos: { bandera: ['secreto_luz', 'fantasma_resuelto'] } },
        fallo: { texto: '«¡SILENCIO!» Un libro fantasmal te golpea en la cara.', ir: 'cruce', efectos: { vida: '-1d4', bandera: 'fantasma_resuelto' } } },
      { texto: 'Salir sin hacer ruido', ir: 'cruce' },
    ],
  },

  camara: {
    titulo: 'La cámara del Dado Hueco',
    texto: [
      'Una sala circular. En el centro, sobre un pedestal, brilla el Dado de Obsidiana.',
      'Cuando das un paso, el suelo tiembla: el pedestal se abre como una boca llena de dientes. ¡Es un mímico gigante!',
    ],
    opciones: [
      { texto: 'Agitar la antorcha ante él', requiere: { objeto: 'Antorcha' },
        prueba: { atributo: 'carisma', dificultad: 10, ventaja: { bandera: 'secreto_luz' } },
        exito: { texto: 'El mímico chilla y se encoge ante la luz. Escupe el Dado para huir.', ir: 'victoria',
                 efectos: { ganar: ['Dado de Obsidiana'] } },
        fallo: { texto: 'La antorcha chisporrotea y se apaga. El mímico te muerde.', ir: 'camara',
                 efectos: { vida: '-1d6', perder: ['Antorcha'] } } },
      { texto: 'Luchar contra el mímico',
        prueba: { atributo: 'fuerza', dificultad: 15, ventaja: { objeto: 'Espada mellada' } },
        exito: { texto: 'Le clavas el arma entre los dientes. El mímico se retuerce y suelta el Dado.', ir: 'victoria',
                 efectos: { ganar: ['Dado de Obsidiana'] } },
        fallo: { texto: 'Su lengua pegajosa te lanza por los aires.', ir: 'camara', efectos: { vida: '-2d4' } } },
      { texto: 'Lanzarte a por el Dado entre sus dientes',
        prueba: { atributo: 'agilidad', dificultad: 15 },
        exito: { texto: 'Te deslizas, agarras el Dado y sales rodando antes de que la boca se cierre.', ir: 'victoria',
                 efectos: { ganar: ['Dado de Obsidiana'] } },
        fallo: { texto: 'Los dientes se cierran sobre tu pierna.', ir: 'camara', efectos: { vida: '-1d8' } } },
      { texto: 'Beber la poción', requiere: { objeto: 'Poción' }, ir: 'camara',
        efectos: { vida: '2d4', perder: ['Poción'] } },
      { texto: 'Huir de la cripta', ir: 'huida' },
    ],
  },

  victoria: {
    titulo: '¡Bienvenida al club!',
    fin: 'victoria',
    texto: [
      'Subes las escaleras con el Dado de Obsidiana caliente en la mano. La taberna entera se calla cuando lo dejas sobre la mesa.',
      'La Maestra lo lanza una vez. Sale un 20. «Eres de los nuestros», dice, y el club estalla en vítores.',
    ],
    opciones: [],
  },

  huida: {
    titulo: 'Vuelta a casa',
    fin: 'derrota',
    texto: [
      'Corres escaleras arriba sin mirar atrás. Sobrevives, pero sin el Dado.',
      'La Maestra se encoge de hombros: «Vuelve cuando tengas mejor suerte.»',
    ],
    opciones: [],
  },

  muerte: {
    titulo: 'Fin de la partida',
    fin: 'derrota',
    texto: [
      'Caes al suelo frío de la cripta. Lo último que oyes es, a lo lejos, el repiqueteo de unos dados.',
      'Los dados no siempre están de tu parte.',
    ],
    opciones: [],
  },
};

if (typeof module !== 'undefined') module.exports = ESCENAS;
