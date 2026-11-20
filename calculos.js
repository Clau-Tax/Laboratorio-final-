/* Lógica matemática: lectura de la función y métodos numéricos (sin tocar el DOM). */
const Calc = (() => {
  const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, exp: Math.exp, ln: Math.log, log: Math.log10,
    sqrt: Math.sqrt, raiz: Math.sqrt, abs: Math.abs, cbrt: Math.cbrt };
  const CT = { pi: Math.PI, e: Math.E };
  const TIPOS = { min: 'altura menor', max: 'altura mayor', izq: 'extremo izquierdo', der: 'extremo derecho', med: 'punto medio' };
  const fmt = v => String(+v.toFixed(4)).replace(/^-0$/, '0');

  /* Convierte un texto ("-x^2+4", "2x", "sin(x)") en una función JS. */
  function compilar(txt) {
    const t = txt.toLowerCase().replace(/,/g, '.').replace(/π/g, 'pi').replace(/[·×]/g, '*').replace(/÷/g, '/')
      .match(/\d*\.?\d+|[a-z]+|\S/g) || [];
    let p = 0;
    const isNum = s => /^[\d.]/.test(s || ''), isId = s => /^[a-z]/.test(s || '');
    const cierra = () => { if (t[p++] !== ')') throw Error('Falta cerrar un paréntesis'); };
    function expr() {
      let l = term();
      while (t[p] === '+' || t[p] === '-') { const o = t[p++], r = term(), a = l; l = o === '+' ? x => a(x) + r(x) : x => a(x) - r(x); }
      return l;
    }
    function term() {
      let l = unario();
      for (;;) {
        const k = t[p]; let op;
        if (k === '*' || k === '/') { p++; op = k; } else if (isNum(k) || isId(k) || k === '(') op = '*'; else break; // multiplicación implícita: 2x, 3(x+1)
        const r = unario(), a = l; l = op === '*' ? x => a(x) * r(x) : x => a(x) / r(x);
      }
      return l;
    }
    function unario() {
      if (t[p] === '-') { p++; const a = unario(); return x => -a(x); }
      if (t[p] === '+') { p++; return unario(); }
      const b = prim();
      if (t[p] === '^') { p++; const e = unario(); return x => Math.pow(b(x), e(x)); }
      return b;
    }
    function prim() {
      const k = t[p++];
      if (k === undefined) throw Error('La expresión está incompleta');
      if (isNum(k)) { const v = parseFloat(k); if (isNaN(v)) throw Error('Número no válido: ' + k); return () => v; }
      if (k === '(') { const e = expr(); cierra(); return e; }
      if (k === 'x') return x => x;
      if (Object.hasOwn(CT, k)) { const v = CT[k]; return () => v; }
      if (Object.hasOwn(FN, k)) {
        if (t[p++] !== '(') throw Error(`Escribe ${k}(...) con paréntesis`);
        const e = expr(); cierra(); const f = FN[k]; return x => f(e(x));
      }
      throw Error(`No entiendo "${k}"`);
    }
    const f = expr();
    if (p < t.length) throw Error(`Símbolo inesperado: "${t[p]}"`);
    return f;
  }

  /* Valor de referencia (Simpson con 2000 subintervalos) para comparar el error. */
  function simpson(f, a, b) {
    const n = 2000, h = (b - a) / n; let s = f(a) + f(b);
    for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
    s *= h / 3; return Number.isFinite(s) ? s : null;
  }

  /* Calcula trapecios y rectángulos. B = altura, H = ancho del subintervalo. */
  function calcular(f, a, b, n, tipo) {
    const h = (b - a) / n, xs = [], ys = [];
    const ok = (y, x) => { if (!Number.isFinite(y)) throw Error(`f(x) no está definida en x = ${fmt(x)}`); return y; };
    for (let i = 0; i <= n; i++) { const x = a + i * h; xs.push(x); ys.push(ok(f(x), x)); }
    const trap = [], rect = [];
    for (let i = 0; i < n; i++) {
      const x0 = xs[i], x1 = xs[i + 1], B1 = ys[i], B2 = ys[i + 1];
      trap.push({ i, x0, x1, B1, B2, A: (B1 + B2) / 2 * h });
      const B = tipo === 'izq' ? B1 : tipo === 'der' ? B2 : tipo === 'max' ? Math.max(B1, B2)
        : tipo === 'med' ? ok(f((x0 + x1) / 2), (x0 + x1) / 2) : Math.min(B1, B2);
      rect.push({ i, x0, x1, B, A: B * h });
    }
    const sum = l => l.reduce((s, q) => s + q.A, 0);
    return { a, b, n, h, xs, ys, trap, rect, tipo, At: sum(trap), Ar: sum(rect), ref: simpson(f, a, b) };
  }

  return { compilar, calcular, fmt, TIPOS };
})();
if (typeof module !== 'undefined') module.exports = Calc;
