// Utilidades de dados: interpreta notación tipo "2d6+1" y tira.
(function (global) {
  function tirarDado(caras) {
    return Math.floor(Math.random() * caras) + 1;
  }

  // Devuelve { cantidad, caras, bonus } a partir de "XdY+Z" / "dY" / "XdY-Z"
  function parsear(notacion) {
    const m = /^(\d*)d(\d+)([+-]\d+)?$/i.exec(String(notacion).replace(/\s+/g, ''));
    if (!m) throw new Error('Notación de dados inválida: ' + notacion);
    return {
      cantidad: m[1] ? parseInt(m[1], 10) : 1,
      caras: parseInt(m[2], 10),
      bonus: m[3] ? parseInt(m[3], 10) : 0,
    };
  }

  // Tira según notación y devuelve el detalle de cada dado.
  function tirar(notacion) {
    const { cantidad, caras, bonus } = parsear(notacion);
    const resultados = [];
    for (let i = 0; i < cantidad; i++) resultados.push(tirarDado(caras));
    const total = resultados.reduce((a, b) => a + b, 0) + bonus;
    return { notacion, caras, resultados, bonus, total };
  }

  global.Dados = { tirar, tirarDado, parsear };
})(typeof window !== 'undefined' ? window : globalThis);
